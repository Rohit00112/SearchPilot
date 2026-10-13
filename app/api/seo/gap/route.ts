import {NextRequest,NextResponse} from 'next/server';
import {guard,handle,owned,uuid,choice} from '@/lib/seo-core';
import {getPool} from '@/lib/db';
export const runtime='nodejs';
// Compares ONLY manually imported first-party or authorized research datasets.
// Does not imply that SearchPilot has a commercial competitor crawl index.
export async function GET(request:NextRequest){return handle(async()=>{
  const auth=await guard(request);if(auth.error)return auth.error;
  const params=request.nextUrl.searchParams;
  const projectId=uuid(params.get('projectId'),'project ID');
  const competitorId=uuid(params.get('competitorId'),'comparison project ID');
  const kind=choice(params.get('kind')??'keywords','kind',['keywords','backlinks']);
  if(projectId===competitorId)return NextResponse.json({error:'Select two different projects.'},{status:400});
  const client=getPool();
  const [first,second]=await Promise.all([owned(client,auth.session!.workspaceId,projectId),owned(client,auth.session!.workspaceId,competitorId)]);
  if(!first||!second)return NextResponse.json({error:'Project not found.'},{status:404});
  const table=kind==='keywords'?'seo_keyword_research':'seo_backlink_observations';
  const field=kind==='keywords'?'lower(btrim(phrase))':'source_host';
  // Return at most 1,000 distinct manually imported values per side; surface
  // truncation rather than silently suggesting a complete competitive index.
  const sql=`SELECT value FROM (SELECT DISTINCT ${field} AS value FROM ${table}
    WHERE workspace_id=$1 AND project_id=$2 ORDER BY value LIMIT 1001) imported ORDER BY value`;
  const [left,right]=await Promise.all([
    client.query<{value:string}>(sql,[auth.session!.workspaceId,projectId]),
    client.query<{value:string}>(sql,[auth.session!.workspaceId,competitorId])
  ]);
  const truncated=left.rows.length>1000||right.rows.length>1000;
  const a=new Set(left.rows.slice(0,1000).map(x=>x.value)),b=new Set(right.rows.slice(0,1000).map(x=>x.value));
  const shared=[...a].filter(value=>b.has(value));
  const missing=[...b].filter(value=>!a.has(value));
  const unique=[...a].filter(value=>!b.has(value));
  return NextResponse.json({
    kind,projectId,competitorId,projectDomain:first,competitorDomain:second,
    shared,missing,unique,truncated,
    counts:{project:a.size,competitor:b.size,shared:shared.length,missing:missing.length,unique:unique.length},
    provenance:{sourceType:'user_import',verified:false,sample:false,coverage:'user-supplied records only'}
  },{headers:{'Cache-Control':'private, no-store'}});
})}
