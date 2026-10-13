import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {crawlPrincipal,crawlUuid,crawlError,crawlBody,crawlColumns,missing} from '@/lib/crawl-api';
import {ValidationError} from '@/lib/validation';
export const runtime='nodejs';
type Params={params:Promise<{id:string}>};
export async function GET(request:NextRequest,{params}:Params){
 try{
  const auth=await crawlPrincipal(request);if(auth.error)return auth.error;
  const id=crawlUuid((await params).id,'crawl ID');
  const {rows}=await getPool().query('SELECT '+crawlColumns+' FROM seo_crawl_jobs WHERE workspace_id=$1 AND id=$2',[auth.session!.workspaceId,id]);
  if(!rows.length)return missing();
  const [pages,issues]=await Promise.all([
   getPool().query('SELECT id,url,depth,status,http_status AS "httpStatus",page_title AS title,meta_description AS "metaDescription",h1_count AS "h1Count",discovered_links AS "discoveredLinks",failure_reason AS "failureReason",fetched_at AS "fetchedAt" FROM seo_crawl_pages WHERE workspace_id=$1 AND job_id=$2 ORDER BY depth,url LIMIT 10',[auth.session!.workspaceId,id]),
   getPool().query('SELECT id,page_id AS "pageId",issue_code AS code,severity,details FROM seo_crawl_issues WHERE workspace_id=$1 AND job_id=$2 ORDER BY issue_code,id LIMIT 100',[auth.session!.workspaceId,id])
  ]);
  return NextResponse.json({job:rows[0],pages:pages.rows,issues:issues.rows,sample:false});
 }catch(error){return crawlError(error)}
}
export async function PATCH(request:NextRequest,{params}:Params){
 try{
  const auth=await crawlPrincipal(request,true);if(auth.error)return auth.error;
  const id=crawlUuid((await params).id,'crawl ID');
  const body=await crawlBody(request);
  if(body.action!=='cancel')throw new ValidationError('Supported action: cancel.');
  const {rows}=await getPool().query(
    "UPDATE seo_crawl_jobs SET status='cancelled',finished_at=now(),lease_until=NULL,updated_at=now(),failure_reason='Cancelled by workspace editor.' WHERE workspace_id=$1 AND id=$2 AND status IN ('queued','running') RETURNING "+crawlColumns,
    [auth.session!.workspaceId,id]);
  if(rows.length)return NextResponse.json({job:rows[0]});
  const existing=await getPool().query('SELECT status FROM seo_crawl_jobs WHERE workspace_id=$1 AND id=$2',[auth.session!.workspaceId,id]);
  if(!existing.rows.length)return missing();
  return NextResponse.json({error:'Only queued or running crawls can be cancelled.',status:existing.rows[0].status},{status:409});
 }catch(error){return crawlError(error)}
}
