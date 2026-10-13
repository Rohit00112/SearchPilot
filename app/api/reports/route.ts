import {NextRequest,NextResponse} from 'next/server';
import {authorize,deny} from '@/lib/auth';
import {databaseAvailable,getPool} from '@/lib/db';
import {csv,responseError,uuid,ValidationError} from '@/lib/validation';

export const runtime='nodejs';

/** GET /api/reports?projectId=<uuid>&kind=keywords|rankings -- authenticated tenant CSV export. */
export async function GET(request:NextRequest){
  if(!databaseAvailable)return NextResponse.json({error:'CSV exports require a configured database.'},{status:503});
  try {
    const session=await authorize(request);if(!session)return deny();
    const projectId=uuid(request.nextUrl.searchParams.get('projectId'),'project ID');
    const kind=request.nextUrl.searchParams.get('kind')??'keywords';
    if(kind!=='keywords'&&kind!=='rankings')throw new ValidationError('kind must be keywords or rankings.');
    const pool=getPool();
    const found=await pool.query<{domain:string}>('SELECT domain FROM projects WHERE id=$1 AND workspace_id=$2',[projectId,session.workspaceId]);
    if(!found.rows.length)return NextResponse.json({error:'Project not found.'},{status:404});
    const header=kind==='keywords'
      ? ['Keyword','Position (manual)','Monthly volume (manual)','Difficulty (manual)','Created at','Provenance']
      : ['Keyword','Observed position','Observed at','Recorded at','Recorded by','Note','Provenance'];
    const records=kind==='keywords'
      ? await pool.query(
        `SELECT k.keyword,k.position,k.volume,k.difficulty,k.created_at
         FROM keywords k JOIN projects p ON p.id=k.project_id AND p.workspace_id=k.workspace_id
         WHERE k.workspace_id=$1 AND k.project_id=$2 ORDER BY k.created_at DESC,k.id DESC LIMIT 50001`,
        [session.workspaceId,projectId])
      : await pool.query(
        `SELECT k.keyword,r.position,r.observed_at,r.recorded_at,r.recorded_by,r.note,r.source
         FROM manual_rank_observations r
         JOIN keywords k ON k.id=r.keyword_id AND k.project_id=r.project_id AND k.workspace_id=r.workspace_id
         WHERE r.workspace_id=$1 AND r.project_id=$2
         ORDER BY r.observed_at DESC,r.id DESC LIMIT 50001`,
        [session.workspaceId,projectId]);
    // Never return a silently truncated report; callers can narrow scope in a later paginated export API.
    if(records.rows.length>50000)return NextResponse.json({error:'Export exceeds 50,000 rows.'},{status:422});
    const rows=records.rows.map(row=>kind==='keywords'
      ? [row.keyword,row.position,row.volume,row.difficulty,new Date(row.created_at).toISOString(),'manual / user-entered']
      : [row.keyword,row.position,new Date(row.observed_at).toISOString(),new Date(row.recorded_at).toISOString(),row.recorded_by,row.note,'manual / unverified']);
    const content=csv([header,...rows]);
    const filename=`searchpilot-${kind}-${new Date().toISOString().slice(0,10)}.csv`;
    return new NextResponse(content,{status:200,headers:{
      'Content-Type':'text/csv; charset=utf-8',
      'Content-Disposition':`attachment; filename="${filename}"`,
      'Cache-Control':'private, no-store',
      'X-Content-Type-Options':'nosniff',
    }});
  }catch(error){return responseError(error,'Unable to export report.');}
}
