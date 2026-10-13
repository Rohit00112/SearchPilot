import {NextRequest,NextResponse} from 'next/server';
import {getPool,databaseAvailable} from '@/lib/db';
import {authorize,csrf,demoAllowed,deny,forbidden} from '@/lib/auth';
import {demoProjects} from '@/lib/demo';
import {domainField,jsonBody,responseError,textField,uuid,ValidationError} from '@/lib/validation';
export const runtime='nodejs';
const failure=()=>NextResponse.json({error:'Unable to process request.'},{status:503});
export async function GET(request:NextRequest){
  if(!databaseAvailable)return demoAllowed()?NextResponse.json({projects:demoProjects,demo:true}):deny();
  try{
    const session=await authorize(request);if(!session)return deny();
    const result=await getPool().query('SELECT id,name,domain,created_at AS "createdAt" FROM projects WHERE workspace_id=$1 ORDER BY created_at DESC',[session.workspaceId]);
    return NextResponse.json({projects:result.rows,demo:false});
  }catch{return failure()}
}
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return forbidden();
  try{
    const session=await authorize(request,'editor');if(!session)return forbidden();
    const body=await jsonBody(request);const name=textField(body.name,'Project name',120);
    const domain=domainField(body.domain);
    const result=await getPool().query('INSERT INTO projects(workspace_id,name,domain) VALUES($1,$2,$3) RETURNING id,name,domain,created_at AS "createdAt"',[session.workspaceId,name,domain]);
    return NextResponse.json({project:result.rows[0]},{status:201});
  }catch(error){return responseError(error,'Unable to save project.')}
}
export async function PATCH(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return forbidden();
  try{
    const session=await authorize(request,'editor');if(!session)return forbidden();
    const id=uuid(request.nextUrl.searchParams.get('id'),'project ID');
    const body=await jsonBody(request);const name=body.name==null?null:textField(body.name,'Project name',120);
    const domain=body.domain==null?null:domainField(body.domain);
    if(name===null&&domain===null)throw new ValidationError('No project changes provided.');
    const result=await getPool().query('UPDATE projects SET name=COALESCE($3,name), domain=COALESCE($4,domain) WHERE workspace_id=$1 AND id=$2 RETURNING id,name,domain,created_at AS "createdAt"',[session.workspaceId,id,name,domain]);
    return result.rows.length?NextResponse.json({project:result.rows[0]}):NextResponse.json({error:'Project not found.'},{status:404});
  }catch(error){return responseError(error,'Unable to update project.')}
}
export async function DELETE(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return forbidden();
  try{
    const session=await authorize(request,'editor');if(!session)return forbidden();
    const id=uuid(request.nextUrl.searchParams.get('id'),'project ID');
    const result=await getPool().query('DELETE FROM projects WHERE workspace_id=$1 AND id=$2 RETURNING id',[session.workspaceId,id]);
    return result.rows.length?NextResponse.json({deleted:true}):NextResponse.json({error:'Project not found.'},{status:404});
  }catch(error){return responseError(error,'Unable to delete project.')}
}
