import {NextRequest,NextResponse} from 'next/server';
import {authorize,deny} from '@/lib/auth';
import {databaseAvailable,getPool} from '@/lib/db';
export const runtime='nodejs';
export async function GET(request:NextRequest){
  if(!databaseAvailable)return NextResponse.json({error:'Usage requires a configured database.'},{status:503});
  try{
    const user=await authorize(request);if(!user)return deny();
    const {rows}=await getPool().query(`
       SELECT
       (SELECT count(*)::integer FROM projects WHERE workspace_id=$1) AS projects,
       (SELECT count(*)::integer FROM keywords WHERE workspace_id=$1) AS keywords,
       (SELECT count(*)::integer FROM audits WHERE workspace_id=$1) AS audits,
       (SELECT count(*)::integer FROM report_definitions WHERE workspace_id=$1) AS reports,
       (SELECT count(*)::integer FROM seo_crawl_jobs WHERE workspace_id=$1 AND status IN ('queued','running')) AS queued_crawls,
       (SELECT count(*)::integer FROM seo_import_batches WHERE workspace_id=$1) AS import_batches,
       (SELECT count(*)::integer FROM local_workspace_members WHERE workspace_id=$1) AS members
    `,[user.workspaceId]);
    return NextResponse.json({usage:rows[0],source:'first_party_postgresql',sample:false,
      limits:{enforcedPlanLimits:false,paidPlanConfigured:false,projectCap:null,keywordCap:null,reportCap:null,overageBilling:false},
      note:'These are current saved record counts, not a billable usage statement. No paid plan or overage billing is configured.'},
      {headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'Usage temporarily unavailable.'},{status:503})}
}
