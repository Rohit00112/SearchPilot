import {NextResponse} from 'next/server';
import {normalizeDomain} from '@/lib/db';

export class ValidationError extends Error {
  constructor(message:string, public status=400){super(message);this.name='ValidationError';}
}
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function uuid(value:unknown,label='ID'):string {
  if(typeof value!=='string'||!uuidPattern.test(value))throw new ValidationError(`Invalid ${label}.`);
  return value;
}
export function object(value:unknown):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new ValidationError('Expected a JSON object.');
  return value as Record<string,unknown>;
}
export async function jsonBody(request:Request):Promise<Record<string,unknown>> {
  if(!request.headers.get('content-type')?.toLowerCase().includes('application/json'))throw new ValidationError('Content-Type must be application/json.',415);
  try{return object(await request.json());}catch(error){if(error instanceof ValidationError)throw error;throw new ValidationError('Invalid JSON request body.');}
}
export function textField(value:unknown,label:string,max:number):string {
  if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new ValidationError(`${label} must have 1–${max} characters.`);
  return value.trim();
}
export function domainField(value:unknown):string {
  if(typeof value!=='string')throw new ValidationError('Enter a valid domain.');
  try{return normalizeDomain(value);}catch{throw new ValidationError('Enter a valid public domain.');}
}
export function optionalInteger(value:unknown,label:string,min:number,max:number):number|null {
  if(value===undefined||value===null)return null;
  if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)throw new ValidationError(`${label} must be an integer between ${min} and ${max}.`);
  return value;
}
export function pageLimit(value:string|null,max=100):number {
  if(value===null)return 25;
  if(!/^\d+$/.test(value))throw new ValidationError('Invalid page limit.');
  const n=Number(value);
  if(n<1||n>max)throw new ValidationError(`Page limit must be 1–${max}.`);
  return n;
}
export function dateTime(value:unknown):string {
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw new ValidationError('observedAt must be an ISO 8601 timestamp with timezone.');
  const date=new Date(value);
  if(date.getTime()>Date.now()+5*60_000)throw new ValidationError('observedAt cannot be in the future.');
  return date.toISOString();
}
export function responseError(error:unknown,message='Unable to process request.'):NextResponse {
  if(error instanceof ValidationError)return NextResponse.json({error:error.message},{status:error.status});
  const code=(error as {code?:string})?.code;
  if(code==='23505')return NextResponse.json({error:'This record already exists.'},{status:409});
  if(code==='23503')return NextResponse.json({error:'Referenced resource not found.'},{status:404});
  return NextResponse.json({error:message},{status:503});
}
/** Quote all CSV fields and neutralize spreadsheet formulas after whitespace/control prefixes. */
export function csvCell(value:unknown):string {
  const original=value===null||value===undefined?'':String(value);
  const clean=original.replace(/\u0000/g,'');
  const escaped=/^[\s\u0000-\u001f]*[=+\-@]/u.test(clean) ? `'${clean}` : clean;
  return `"${escaped.replace(/"/g,'""')}"`;
}
export function csv(rows:readonly (readonly unknown[])[]):string {
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
