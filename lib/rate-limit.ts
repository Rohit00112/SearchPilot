import {createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';

type LimitConfig={kind:string;identity:string;limit:number;windowSeconds:number};
const demoBuckets=new Map<string,{started:number;hits:number}>();
const MAX_JSON_BYTES=4096;
export class RequestBodyError extends Error {
  constructor(message:string,public readonly status:number){super(message)}
}

// X-Real-IP is usable only behind a reverse proxy that overwrites the header.
// Without that deployment guarantee, use one conservative anonymous bucket.
export function remoteClient(request:NextRequest):string{
  const direct=request.headers.get('x-real-ip');
  if(process.env.TRUSTED_PROXY_IP_HEADERS==='true' && direct && /^[0-9a-fA-F:.]{3,45}$/.test(direct))return direct;
  return 'unverified-client';
}
const bucketKey=({kind,identity}:Pick<LimitConfig,'kind'|'identity'>)=>
  createHash('sha256').update(kind+'\0'+identity).digest('hex');

// Shared atomic PostgreSQL counter. Never fall back to process memory when
// persistence is configured; that would silently bypass limits per instance.
export async function enforceLimit(config:LimitConfig):Promise<{allowed:boolean;retryAfter:number}>{
  const key=bucketKey(config);
  if(!Number.isSafeInteger(config.windowSeconds)||config.windowSeconds<=0||!Number.isSafeInteger(config.limit)||config.limit<=0)throw Error('Invalid rate-limit configuration.');
  if(!process.env.DATABASE_URL){
    if(process.env.NODE_ENV!=='development'||process.env.SEARCHPILOT_DEMO!=='true')throw Error('Rate-limit storage unavailable.');
    const now=Date.now();
    const previous=demoBuckets.get(key);
    const fresh=!previous||now-previous.started>=config.windowSeconds*1000;
    const state=fresh?{started:now,hits:1}:{started:previous.started,hits:previous.hits+1};
    demoBuckets.set(key,state);
    if(demoBuckets.size>2000){
      for(const [name,item] of demoBuckets)if(now-item.started>86400000)demoBuckets.delete(name);
    }
    return {allowed:state.hits<=config.limit,retryAfter:Math.max(1,Math.ceil((state.started+config.windowSeconds*1000-now)/1000))};
  }
  const sql=[
    'INSERT INTO security_rate_limits(bucket_key,window_start,hits)',
    'VALUES($1,statement_timestamp(),1)',
    'ON CONFLICT(bucket_key) DO UPDATE SET',
    "window_start=CASE WHEN security_rate_limits.window_start+$2::integer*interval '1 second'<=statement_timestamp()",
    'THEN statement_timestamp() ELSE security_rate_limits.window_start END,',
    "hits=CASE WHEN security_rate_limits.window_start+$2::integer*interval '1 second'<=statement_timestamp()",
    'THEN 1 ELSE security_rate_limits.hits+1 END,updated_at=statement_timestamp()',
    "RETURNING hits,GREATEST(1,CEIL(EXTRACT(EPOCH FROM(window_start+$2::integer*interval '1 second'-statement_timestamp())))::integer) AS retry_after"
  ].join(' ');
  const result=await getPool().query<{hits:number;retry_after:number}>(sql,[key,config.windowSeconds]);
  const row=result.rows[0];
  if(!row)throw Error('Rate-limit storage unavailable.');
  return {allowed:row.hits<=config.limit,retryAfter:row.retry_after};
}
export async function limitResponse(config:LimitConfig):Promise<NextResponse|null>{
  const result=await enforceLimit(config);
  if(result.allowed)return null;
  return NextResponse.json({error:'Too many requests. Try again later.'},{status:429,headers:{'Retry-After':String(result.retryAfter),'Cache-Control':'no-store'}});
}
export async function limitedJson(request:NextRequest):Promise<Record<string,unknown>>{
  const size=request.headers.get('content-length');
  if(size!==null&&(!/^\d+$/.test(size)||Number(size)>MAX_JSON_BYTES))throw new RequestBodyError('Request body is too large.',413);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new RequestBodyError('Expected application/json.',415);
  if(!request.body)throw new RequestBodyError('Request body is required.',400);
  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>MAX_JSON_BYTES)throw new RequestBodyError('Request body is too large.',413);
      chunks.push(value);
    }
  }finally{void reader.cancel().catch(()=>{});reader.releaseLock()}
  try{
    const raw=Buffer.concat(chunks.map(c=>Buffer.from(c))).toString('utf8');
    const result=JSON.parse(raw) as unknown;
    if(!result||Array.isArray(result)||typeof result!=='object')throw Error('Expected JSON object.');
    return result as Record<string,unknown>;
  }catch{throw new RequestBodyError('Invalid JSON object.',400)}
}
export function requestError(error:unknown,fallback:string):NextResponse{
  if(error instanceof RequestBodyError)return NextResponse.json({error:error.message},{status:error.status});
  return NextResponse.json({error:fallback},{status:503});
}
