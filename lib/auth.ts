import {createHmac,randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
const scrypt=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scryptCallback(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024},(error,derived)=>error?reject(error):resolve(derived)));
const COOKIE='sp_session';
const TTL=60*60*24*7;
export type Principal={id:string;email:string;displayName:string;workspaceId:string;role:'owner'|'editor'|'viewer'};
const hex=(input:string)=>createHash('sha256').update(input).digest('hex');
function secret(){const value=process.env.AUTH_SECRET;if(!value||value.length<32)throw new Error('AUTH_SECRET must be configured (32+ characters).');return value}
export function ensureAuthReady(){secret()}
function sign(value:string){return createHmac('sha256',secret()).update(value).digest('base64url')}
export async function hashPassword(password:string){
  const salt=randomBytes(16).toString('hex');
  const derived=await scrypt(password,salt);
  return 'scrypt$16384$'+salt+'$'+derived.toString('hex');
}
export async function verifyPassword(password:string,encoded:string){
  const parts=encoded.split('$');
  if(parts.length!==4||parts[0]!=='scrypt'||parts[1]!=='16384')return false;
  const expected=Buffer.from(parts[3],'hex');
  if(expected.length!==64)return false;
  const actual=await scrypt(password,parts[2]);
  return timingSafeEqual(expected,actual);
}
export function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin');
  if(!origin)return false;
  try{
    const url=new URL(origin);
    const host=request.headers.get('host');
    const forwarded=request.headers.get('x-forwarded-host');
    const allowed=process.env.APP_ORIGIN?new URL(process.env.APP_ORIGIN):null;
    if(allowed)return url.origin===allowed.origin;
    return url.host===host&&url.protocol===(request.nextUrl.protocol);
  }catch{return false}
}
export function csrf(request:NextRequest){return sameOrigin(request)?null:NextResponse.json({error:'Request origin is not allowed.'},{status:403})}
export function deny(){return NextResponse.json({error:'Authentication required.'},{status:401})}
export function forbidden(){return NextResponse.json({error:'Workspace access denied.'},{status:403})}
export function demoAllowed(){return !process.env.DATABASE_URL&&process.env.NODE_ENV==='development'&&process.env.SEARCHPILOT_DEMO==='true'}
export async function startSession(userId:string,response:NextResponse){
  const token=randomBytes(32).toString('base64url');
  const id=randomBytes(16).toString('hex');
  const signed=id+'.'+token+'.'+sign(id+'.'+token);
  await getPool().query('INSERT INTO local_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval \'7 days\')',[userId,hex(id+'.'+token)]);
  response.cookies.set(COOKIE,signed,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:TTL});
}
export async function revokeSession(request:NextRequest){
  const value=request.cookies.get(COOKIE)?.value;
  const parsed=parseToken(value);
  if(parsed)await getPool().query('UPDATE local_sessions SET revoked_at=now() WHERE token_hash=$1',[hex(parsed)]);
}
function parseToken(cookie:string|undefined){
  if(!cookie)return null;
  const pieces=cookie.split('.');
  if(pieces.length!==3||!pieces.every(Boolean))return null;
  const data=pieces[0]+'.'+pieces[1];
  const provided=Buffer.from(pieces[2]);
  const expected=Buffer.from(sign(data));
  return provided.length===expected.length&&timingSafeEqual(provided,expected)?data:null;
}
export async function identity(request:NextRequest):Promise<{id:string;email:string;displayName:string}|null>{
  const token=parseToken(request.cookies.get(COOKIE)?.value);
  if(!token)return null;
  const result=await getPool().query<{id:string;email:string;displayName:string}>(
    'SELECT u.id,u.email,u.display_name AS "displayName" FROM local_sessions s JOIN local_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()',
    [hex(token)]
  );
  return result.rows[0]??null;
}
export async function memberships(userId:string){
  const result=await getPool().query<{id:string;name:string;role:Principal['role']}>(
    'SELECT w.id,w.name,m.role FROM local_workspace_members m JOIN local_workspaces w ON w.id=m.workspace_id WHERE m.user_id=$1 ORDER BY w.created_at ASC',[userId]
  );return result.rows;
}
export async function authorize(request:NextRequest,required:'viewer'|'editor'='viewer'):Promise<Principal|null>{
  const user=await identity(request);
  if(!user)return null;
  const chosen=request.headers.get('x-workspace-id')||request.nextUrl.searchParams.get('workspaceId');
  const result=await getPool().query<{workspaceId:string;role:Principal['role']}>(
    'SELECT workspace_id AS "workspaceId",role FROM local_workspace_members WHERE user_id=$1 AND ($2::uuid IS NULL OR workspace_id=$2::uuid) ORDER BY created_at ASC LIMIT 1',
    [user.id,chosen||null]
  );
  const membership=result.rows[0];
  if(!membership||(required==='editor'&&membership.role==='viewer'))return null;
  return {...user,workspaceId:membership.workspaceId,role:membership.role};
}
export async function authenticated(request:NextRequest){
  const user=await identity(request);
  if(!user)return null;
  const workspaces=await memberships(user.id);
  return {user,workspaces,activeWorkspaceId:workspaces[0]?.id??null};
}
export function clearSession(response:NextResponse){response.cookies.set(COOKIE,'',{httpOnly:true,path:'/',sameSite:'lax',maxAge:0,secure:process.env.NODE_ENV==='production'})}
