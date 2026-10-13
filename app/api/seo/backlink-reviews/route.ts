import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {guard,boundedBody,owned,uuid,string,choice,handle,missing} from '@/lib/seo-core';
export const runtime='nodejs';
const labels=['unreviewed','keep','investigate','contact','ignore'] as const;
export async function GET(request:NextRequest){return handle(async()=>{
 const auth=await guard(request);if(auth.error)return auth.error;
 const projectId=uuid(request.nextUrl.searchParams.get('projectId'),'project ID');
 if(!await owned(getPool(),auth.session!.workspaceId,projectId))return missing();
 const {rows}=await getPool().query(
  'SELECT b.id AS "backlinkId",b.source_url AS "sourceUrl",b.target_url AS "targetUrl",b.status AS "observedStatus",b.observed_at AS "observedAt",r.id AS "reviewId",COALESCE(r.label,\'unreviewed\') AS label,r.notes,r.reviewed_at AS "reviewedAt" FROM seo_backlink_observations b LEFT JOIN seo_backlink_reviews r ON r.workspace_id=b.workspace_id AND r.project_id=b.project_id AND r.backlink_id=b.id WHERE b.workspace_id=$1 AND b.project_id=$2 ORDER BY b.observed_at DESC LIMIT 100',
  [auth.session!.workspaceId,projectId]);
 return NextResponse.json({rows,provenance:{sourceType:'user_import',reviewType:'human_only',verified:false,automatedToxicity:false,automaticDisavow:false}});
})}
export async function POST(request:NextRequest){return handle(async()=>{
 const auth=await guard(request,true);if(auth.error)return auth.error;
 const b=await boundedBody(request),projectId=uuid(b.projectId,'project ID'),backlinkId=uuid(b.backlinkId,'backlink ID');
 const label=choice(b.label,'label',labels),notes=b.notes==null?null:string(b.notes,'Notes',2000);
 const {rows}=await getPool().query(
  'INSERT INTO seo_backlink_reviews(workspace_id,project_id,backlink_id,label,notes,reviewed_by) SELECT $1,$2,id,$4,$5,$6 FROM seo_backlink_observations WHERE workspace_id=$1 AND project_id=$2 AND id=$3 ON CONFLICT(workspace_id,project_id,backlink_id) DO UPDATE SET label=EXCLUDED.label,notes=EXCLUDED.notes,reviewed_by=EXCLUDED.reviewed_by,reviewed_at=now(),updated_at=now() RETURNING id,backlink_id AS "backlinkId",label,notes,reviewed_at AS "reviewedAt"',
  [auth.session!.workspaceId,projectId,backlinkId,label,notes,auth.session!.id]);
 return rows.length?NextResponse.json({review:rows[0],reviewType:'human_only',automatedToxicity:false,automaticDisavow:false}):missing();
})}
