import {NextRequest,NextResponse} from 'next/server';
import {databaseAvailable,getPool} from '@/lib/db';
import {authorize,csrf,demoAllowed,deny,forbidden} from '@/lib/auth';
import {demoKeywords} from '@/lib/demo';
export const runtime='nodejs';
const validUuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export async function GET(request:NextRequest){
  const projectId=request.nextUrl.searchParams.get('projectId');
  if(!databaseAvailable)return demoAllowed()?NextResponse.json({keywords:demoKeywords.filter(k=>!projectId||k.projectId===projectId),demo:true}):deny();
  if(projectId&&!validUuid(projectId))return NextResponse.json({error:'Invalid project ID.'},{status:400});
  try{
    const session=await authorize(request);if(!session)return deny();
    const result=await getPool().query('SELECT k.id,k.project_id AS "projectId",k.keyword,k.position,k.volume,k.difficulty,k.created_at AS "createdAt" FROM keywords k JOIN projects p ON p.id=k.project_id AND p.workspace_id=k.workspace_id WHERE k.workspace_id=$1 AND ($2::uuid IS NULL OR k.project_id=$2::uuid) ORDER BY k.created_at DESC',[session.workspaceId,projectId]);
    return NextResponse.json({keywords:result.rows,demo:false});
  }catch{return NextResponse.json({error:'Unable to load keywords.'},{status:503})}
}
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return forbidden();
  try{
    const session=await authorize(request,'editor');if(!session)return forbidden();
    const body=await request.json();const keyword=String(body.keyword||'').trim();const projectId=String(body.projectId||'');
    if(keyword.length<1||keyword.length>200||!validUuid(projectId))return NextResponse.json({error:'Invalid keyword or project.'},{status:400});
    const vals=[body.position,body.volume,body.difficulty].map(x=>x==null?null:Number(x));
    if(vals.some((v,i)=>v!==null&&(!Number.isInteger(v)||(i===0?(v<1||v>1000):i===1?v<0:v<0||v>100))))return NextResponse.json({error:'Invalid position, volume or difficulty.'},{status:400});
    const result=await getPool().query('INSERT INTO keywords(workspace_id,project_id,keyword,position,volume,difficulty) SELECT $1,p.id,$3,$4,$5,$6 FROM projects p WHERE p.workspace_id=$1 AND p.id=$2 RETURNING id,project_id AS "projectId",keyword,position,volume,difficulty,created_at AS "createdAt"',[session.workspaceId,projectId,keyword,...vals]);
    return result.rows.length?NextResponse.json({keyword:result.rows[0]},{status:201}):NextResponse.json({error:'Project not found.'},{status:404});
  }catch(error){return NextResponse.json({error:(error as {code?:string}).code==='23505'?'Keyword already exists.':'Unable to save keyword.'},{status:400})}
}
export async function DELETE(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return forbidden();
  const id=request.nextUrl.searchParams.get('id');if(!id||!validUuid(id))return NextResponse.json({error:'Invalid keyword ID.'},{status:400});
  try{
    const session=await authorize(request,'editor');if(!session)return forbidden();
    const result=await getPool().query('DELETE FROM keywords WHERE workspace_id=$1 AND id=$2',[session.workspaceId,id]);
    return NextResponse.json({deleted:Boolean(result.rowCount)});
  }catch{return NextResponse.json({error:'Unable to delete keyword.'},{status:503})}
}
