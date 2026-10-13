import {NextRequest,NextResponse} from 'next/server';
import {databaseAvailable,getPool} from '@/lib/db';
import {authorize,csrf,demoAllowed,deny,forbidden} from '@/lib/auth';
import {demoKeywords} from '@/lib/demo';
import {jsonBody,optionalInteger,responseError,textField,uuid} from '@/lib/validation';
export const runtime='nodejs';
export async function GET(request:NextRequest){
  const projectId=request.nextUrl.searchParams.get('projectId');
  if(!databaseAvailable)return demoAllowed()?NextResponse.json({keywords:demoKeywords.filter(k=>!projectId||k.projectId===projectId),demo:true}):deny();
  try{
    const session=await authorize(request);if(!session)return deny();
    if(projectId)uuid(projectId,'project ID');
    const result=await getPool().query('SELECT k.id,k.project_id AS "projectId",k.keyword,k.position,k.volume,k.difficulty,k.created_at AS "createdAt" FROM keywords k JOIN projects p ON p.id=k.project_id AND p.workspace_id=k.workspace_id WHERE k.workspace_id=$1 AND ($2::uuid IS NULL OR k.project_id=$2::uuid) ORDER BY k.created_at DESC',[session.workspaceId,projectId]);
    return NextResponse.json({keywords:result.rows,demo:false});
  }catch(error){return responseError(error,'Unable to load keywords.')}
}
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return forbidden();
  try{
    const session=await authorize(request,'editor');if(!session)return forbidden();
    const body=await jsonBody(request);const keyword=textField(body.keyword,'Keyword',200);const projectId=uuid(body.projectId,'project ID');
    const vals=[optionalInteger(body.position,'Position',1,1000),optionalInteger(body.volume,'Volume',0,2147483647),optionalInteger(body.difficulty,'Difficulty',0,100)];
    const result=await getPool().query('INSERT INTO keywords(workspace_id,project_id,keyword,position,volume,difficulty) SELECT $1,p.id,$3,$4,$5,$6 FROM projects p WHERE p.workspace_id=$1 AND p.id=$2 RETURNING id,project_id AS "projectId",keyword,position,volume,difficulty,created_at AS "createdAt"',[session.workspaceId,projectId,keyword,...vals]);
    return result.rows.length?NextResponse.json({keyword:result.rows[0]},{status:201}):NextResponse.json({error:'Project not found.'},{status:404});
  }catch(error){return responseError(error,'Unable to save keyword.')}
}
export async function DELETE(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return forbidden();
  try{
    const session=await authorize(request,'editor');if(!session)return forbidden();
    const id=uuid(request.nextUrl.searchParams.get('id'),'keyword ID');
    const result=await getPool().query('DELETE FROM keywords WHERE workspace_id=$1 AND id=$2',[session.workspaceId,id]);
    return NextResponse.json({deleted:Boolean(result.rowCount)});
  }catch(error){return responseError(error,'Unable to delete keyword.')}
}
