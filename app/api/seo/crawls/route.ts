import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {crawlPrincipal,crawlBody,crawlUuid,crawlError,crawlLimit,checkProject,crawlColumns} from '@/lib/crawl-api';
import {ValidationError} from '@/lib/validation';
export const runtime='nodejs';

// GET /api/seo/crawls?projectId=<uuid> (last 50)
export async function GET(request:NextRequest){
 try {
  const auth=await crawlPrincipal(request);if(auth.error)return auth.error;
  const projectId=crawlUuid(request.nextUrl.searchParams.get('projectId'),'project ID');
  if(!await checkProject(auth.session!.workspaceId,projectId))return NextResponse.json({error:'Project not found.'},{status:404});
  const {rows}=await getPool().query('SELECT '+crawlColumns+' FROM seo_crawl_jobs WHERE workspace_id=$1 AND project_id=$2 ORDER BY created_at DESC,id DESC LIMIT 50',[auth.session!.workspaceId,projectId]);
  return NextResponse.json({jobs:rows,workerMode:'explicit',sample:false});
 }catch(error){return crawlError(error)}
}

// POST /api/seo/crawls {projectId,maxPages?:1..10,maxDepth?:0..2}
// Enqueue ONLY; user action never initiates an outgoing HTTP fetch.
export async function POST(request:NextRequest){
 try {
  const auth=await crawlPrincipal(request,true);if(auth.error)return auth.error;
  const body=await crawlBody(request),projectId=crawlUuid(body.projectId,'project ID');
  const maxPages=crawlLimit(body.maxPages,'maxPages',1,10,10);
  const maxDepth=crawlLimit(body.maxDepth,'maxDepth',0,2,2);
  const client=await getPool().connect();
  try {
   await client.query('BEGIN');
   // Serialize enqueues on the project row to enforce per-project quotas.
   const project=await client.query<{domain:string}>('SELECT domain FROM projects WHERE workspace_id=$1 AND id=$2 FOR UPDATE',[auth.session!.workspaceId,projectId]);
   if(!project.rows[0]){await client.query('ROLLBACK');return NextResponse.json({error:'Project not found.'},{status:404})}
   const host=project.rows[0].domain.toLowerCase().trim();
   if(!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host))
     throw new ValidationError('Project domain is not a valid public hostname.');
   const stats=await client.query<{active:string;recent:string}>(
     "SELECT count(*) FILTER (WHERE status IN ('queued','running'))::text AS active, count(*) FILTER (WHERE created_at>now()-interval '1 hour')::text AS recent FROM seo_crawl_jobs WHERE workspace_id=$1 AND project_id=$2",
     [auth.session!.workspaceId,projectId]);
   if(Number(stats.rows[0].active)>0)throw new ValidationError('A crawl is already queued or running for this project.',409);
   if(Number(stats.rows[0].recent)>=4)throw new ValidationError('Project crawl limit reached (4 per hour).',429);
   const {rows}=await client.query('INSERT INTO seo_crawl_jobs(workspace_id,project_id,requested_by,root_host,max_pages,max_depth) VALUES($1,$2,$3,$4,$5,$6) RETURNING '+crawlColumns,
     [auth.session!.workspaceId,projectId,auth.session!.id,host,maxPages,maxDepth]);
   await client.query('COMMIT');
   return NextResponse.json({job:rows[0],queued:true,workerMode:'explicit',sample:false},{status:202});
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
 }catch(error){return crawlError(error)}
}
