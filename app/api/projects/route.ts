import {NextRequest,NextResponse} from 'next/server';
import {getPool,normalizeDomain,databaseAvailable} from '@/lib/db';
import {authorize,csrf,demoAllowed,deny,forbidden} from '@/lib/auth';
import {demoProjects} from '@/lib/demo';
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
    const body=await request.json();const name=String(body.name??'').trim();
    if(!name||name.length>120)return NextResponse.json({error:'Project name must have 1–120 characters.'},{status:400});
    const domain=normalizeDomain(String(body.domain??''));
    const result=await getPool().query('INSERT INTO projects(workspace_id,name,domain) VALUES($1,$2,$3) RETURNING id,name,domain,created_at AS "createdAt"',[session.workspaceId,name,domain]);
    return NextResponse.json({project:result.rows[0]},{status:201});
  }catch{return failure()}
}
export async function PATCH(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return forbidden();
  try{
    const session=await authorize(request,'editor');if(!session)return forbidden();
    const id=request.nextUrl.searchParams.get('id');
    if(!id||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Project ID required.'},{status:400});
    const body=await request.json();const name=typeof body.name==='string'?body.name.trim():null;
    if(name!==null&&(!name||name.length>120))return NextResponse.json({error:'Invalid project name.'},{status:400});
    const domain=body.domain==null?null:normalizeDomain(String(body.domain));
    if(name===null&&domain===null)return NextResponse.json({error:'No project changes provided.'},{status:400});
    const result=await getPool().query('UPDATE projects SET name=COALESCE($3,name), domain=COALESCE($4,domain) WHERE workspace_id=$1 AND id=$2 RETURNING id,name,domain,created_at AS "createdAt"',[session.workspaceId,id,name,domain]);
    return result.rows.length?NextResponse.json({project:result.rows[0]}):NextResponse.json({error:'Project not found.'},{status:404});
  }catch{return failure()}
}
export async function DELETE(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return forbidden();
  try{
    const session=await authorize(request,'editor');if(!session)return forbidden();
    const id=request.nextUrl.searchParams.get('id');
    if(!id||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Project ID required.'},{status:400});
    const result=await getPool().query('DELETE FROM projects WHERE workspace_id=$1 AND id=$2 RETURNING id',[session.workspaceId,id]);
    return result.rows.length?NextResponse.json({deleted:true}):NextResponse.json({error:'Project not found.'},{status:404});
  }catch{return failure()}
}
