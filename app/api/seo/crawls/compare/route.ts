import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {crawlPrincipal,crawlUuid,crawlError,missing} from '@/lib/crawl-api';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 try{
  const auth=await crawlPrincipal(request);if(auth.error)return auth.error;
  const fromId=crawlUuid(request.nextUrl.searchParams.get('fromId'),'fromId');
  const toId=crawlUuid(request.nextUrl.searchParams.get('toId'),'toId');
  const projectId=crawlUuid(request.nextUrl.searchParams.get('projectId'),'project ID');
  const {rows:jobs}=await getPool().query(
    'SELECT id,status,pages_crawled AS "pagesCrawled",issues_found AS "issuesFound",finished_at AS "finishedAt" FROM seo_crawl_jobs WHERE workspace_id=$1 AND project_id=$2 AND id=ANY($3::uuid[])',
    [auth.session!.workspaceId,projectId,[fromId,toId]]);
  if(jobs.length!==2||fromId===toId)return missing();
  if(jobs.some(job=>!['completed','partial'].includes(job.status)))
    return NextResponse.json({error:'Both crawls must have finished with saved pages before comparison.'},{status:409});
  const {rows:entries}=await getPool().query(
    'SELECT i.job_id AS "jobId",p.url,i.issue_code AS code,i.severity FROM seo_crawl_issues i JOIN seo_crawl_pages p ON p.id=i.page_id AND p.workspace_id=i.workspace_id AND p.job_id=i.job_id WHERE i.workspace_id=$1 AND i.project_id=$2 AND i.job_id=ANY($3::uuid[]) ORDER BY p.url,i.issue_code LIMIT 200',
    [auth.session!.workspaceId,projectId,[fromId,toId]]);
  const original=new Set(entries.filter(v=>v.jobId===fromId).map(v=>v.url+'\0'+v.code));
  const current=new Set(entries.filter(v=>v.jobId===toId).map(v=>v.url+'\0'+v.code));
  return NextResponse.json({
   from:jobs.find(v=>v.id===fromId),to:jobs.find(v=>v.id===toId),
   introduced:[...current].filter(v=>!original.has(v)).map(v=>{const [url,code]=v.split('\0');return {url,code}}),
   resolved:[...original].filter(v=>!current.has(v)).map(v=>{const [url,code]=v.split('\0');return {url,code}}),
   comparison:'saved_issue_presence_only',sample:false
  });
 }catch(error){return crawlError(error)}
}
