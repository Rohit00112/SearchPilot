import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {guard,boundedBody,owned,uuid} from '@/lib/seo-core';
import {ValidationError,responseError} from '@/lib/validation';

export const missing=()=>NextResponse.json({error:'Crawl job not found.'},{status:404});

// Even reads require editor/owner: a crawl reveals a customer's site topology.
export async function crawlPrincipal(request:NextRequest,write=false){
  const auth=await guard(request,write);
  if(auth.error)return {error:auth.error};
  if(auth.session!.role==='viewer')return {error:NextResponse.json({error:'Workspace editor access required.'},{status:403})};
  return {session:auth.session!};
}
export const crawlBody=boundedBody;
export const crawlUuid=uuid;
export const crawlError=(error:unknown)=>responseError(error,'Unable to process crawl request.');
export const crawlLimit=(value:unknown,label:string,min:number,max:number,defaultValue:number)=>{
  if(value===undefined)return defaultValue;
  if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)
    throw new ValidationError(label+' must be '+min+'–'+max+'.');
  return value;
};
export async function checkProject(workspaceId:string,projectId:string){
  return owned(getPool(),workspaceId,projectId);
}
export const crawlColumns='id,project_id AS "projectId",root_host AS "rootHost",status,max_pages AS "maxPages",max_depth AS "maxDepth",pages_crawled AS "pagesCrawled",issues_found AS "issuesFound",failed_pages AS "failedPages",robots_policy AS "robotsPolicy",failure_reason AS "failureReason",attempts,started_at AS "startedAt",finished_at AS "finishedAt",created_at AS "createdAt",updated_at AS "updatedAt"';
