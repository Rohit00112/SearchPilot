import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {guard,handle,missing,owned,uuid,choice} from '@/lib/seo-core';
import {pageLimit} from '@/lib/validation';
export const runtime='nodejs';
const source={
 organic:'seo_organic_observations o JOIN seo_import_batches b ON b.id=o.batch_id AND b.workspace_id=o.workspace_id',
 keywords:'seo_keyword_research o JOIN seo_import_batches b ON b.id=o.batch_id AND b.workspace_id=o.workspace_id',
 backlinks:'seo_backlink_observations o JOIN seo_import_batches b ON b.id=o.batch_id AND b.workspace_id=o.workspace_id'
};
export async function GET(request:NextRequest){return handle(async()=>{
 const auth=await guard(request);if(auth.error)return auth.error;
 const params=request.nextUrl.searchParams;
 const projectId=uuid(params.get('projectId'),'project ID'),kind=choice(params.get('kind'),'kind',['organic','keywords','backlinks']);
 if(!await owned(getPool(),auth.session!.workspaceId,projectId))return missing();
 const campaignId=params.has('campaignId')?uuid(params.get('campaignId'),'campaign ID'):null;
 const limit=pageLimit(params.get('limit'),100);
 const offsetText=params.get('offset')??'0';if(!/^\d{1,6}$/.test(offsetText))return NextResponse.json({error:'Invalid offset.'},{status:400});
 const offset=Number(offsetText);
 const campaignWhere=kind==='organic'&&campaignId?' AND o.campaign_id=$5':'';
 const base='FROM '+source[kind]+' WHERE o.workspace_id=$1 AND o.project_id=$2'+campaignWhere;
 const {rows}=await getPool().query('SELECT o.*,b.source_type AS "sourceType",b.source_label AS "sourceLabel",b.verified AS "verified" '+base+' ORDER BY o.observed_at DESC,o.id DESC LIMIT $3 OFFSET $4',[auth.session!.workspaceId,projectId,limit,offset,...(campaignWhere?[campaignId]:[])]);
 return NextResponse.json({kind,rows:rows.map(r=>({...r,sample:false,verified:false})),page:{limit,offset,hasMore:rows.length===limit},provenance:{sourceType:'user_import',verified:false,sample:false}});
})}
