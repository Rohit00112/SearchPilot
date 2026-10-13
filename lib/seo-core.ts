import {NextRequest,NextResponse} from 'next/server';
import {authorize,csrf,deny,forbidden} from '@/lib/auth';
import {databaseAvailable,getPool} from '@/lib/db';
import {ValidationError,responseError,uuid,object} from '@/lib/validation';
import type {PoolClient} from 'pg';
export const unavailable=()=>NextResponse.json({error:'SEO data storage requires PostgreSQL and migration 005.'},{status:503});
export const missing=()=>NextResponse.json({error:'Resource not found.'},{status:404});
export async function guard(request:NextRequest,write=false){
  if(write){const blocked=csrf(request);if(blocked)return {error:blocked};}
  if(!databaseAvailable)return {error:unavailable()};
  const session=await authorize(request,write?'editor':'viewer');
  if(!session)return {error:write?forbidden():deny()};
  return {session};
}
export async function owned(client:PoolClient|ReturnType<typeof getPool>,workspaceId:string,projectId:string){
  const result=await client.query('SELECT domain FROM projects WHERE id=$1 AND workspace_id=$2',[projectId,workspaceId]);
  return result.rows[0]?.domain as string|undefined;
}
export async function boundedBody(request:NextRequest){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new ValidationError('Expected application/json.',415);
  const length=request.headers.get('content-length');
  if(length&&(!/^\d+$/.test(length)||Number(length)>131072))throw new ValidationError('Maximum import payload is 128 KiB.',413);
  if(!request.body)throw new ValidationError('JSON body required.');
  const reader=request.body.getReader();let bytes=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>131072)throw new ValidationError('Maximum import payload is 128 KiB.',413);chunks.push(value)}}finally{void reader.cancel().catch(()=>{});reader.releaseLock()}
  try{return object(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch(error){if(error instanceof ValidationError)throw error;throw new ValidationError('Invalid JSON.')}
}
export function string(value:unknown,name:string,max:number){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new ValidationError(name+' must be 1–'+max+' characters.');return value.trim()}
export function choice<T extends string>(value:unknown,name:string,values:readonly T[]):T{if(typeof value!=='string'||!values.includes(value as T))throw new ValidationError('Invalid '+name+'.');return value as T}
export function time(value:unknown){
  if(typeof value!=='string'||!/^20\d\d-\d\d-\d\dT/.test(value)||!Number.isFinite(Date.parse(value)))throw new ValidationError('Invalid observedAt timestamp.');
  const t=new Date(value);if(t.getTime()>Date.now()+300000||t.getTime()<Date.UTC(2000,0,1))throw new ValidationError('observedAt out of range.');
  return t.toISOString();
}
export function number(value:unknown,name:string,min:number,max:number,integer=false):number|null{
 if(value==null)return null;
 if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))throw new ValidationError('Invalid '+name+'.');
 return value;
}
export function httpsUrl(value:unknown,name:string,domain?:string){
 const input=string(value,name,2048);let parsed:URL;
 try{parsed=new URL(input)}catch{throw new ValidationError('Invalid '+name+'.')}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||parsed.hash||!parsed.hostname.includes('.'))throw new ValidationError(name+' must be a public HTTPS URL.');
 const host=parsed.hostname.toLowerCase();
 if(/^(localhost|.*\.localhost)$/.test(host)||/^\d+(\.\d+){3}$/.test(host)||host.endsWith('.local')||host.endsWith('.internal'))throw new ValidationError('Invalid '+name+'.');
 if(domain&&host!==domain&& !host.endsWith('.'+domain))throw new ValidationError('Target URL must belong to this project domain.');
 return {url:parsed.toString(),host};
}
export async function handle<T>(action:()=>Promise<T>){try{return await action()}catch(error){return responseError(error,'SEO request unavailable.');}}
export {uuid};
