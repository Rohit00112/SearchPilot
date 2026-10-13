import {NextRequest,NextResponse} from 'next/server';
import {authenticated,csrf,identity,setWorkspaceCookie} from '@/lib/auth';
import {getPool} from '@/lib/db';
import {jsonBody,uuid,responseError} from '@/lib/validation';
export const runtime='nodejs';
export async function GET(request:NextRequest){
  try{
    const session=await authenticated(request);
    return session?NextResponse.json({workspaces:session.workspaces,activeWorkspaceId:session.activeWorkspaceId}):
      NextResponse.json({error:'Authentication required.'},{status:401});
  }catch{return NextResponse.json({error:'Workspaces unavailable.'},{status:503});}
}
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  try{
    const user=await identity(request);if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const body=await jsonBody(request),workspaceId=uuid(body.workspaceId,'workspace ID');
    const rows=await getPool().query('SELECT 1 FROM local_workspace_members WHERE user_id=$1 AND workspace_id=$2',[user.id,workspaceId]);
    if(!rows.rows.length)return NextResponse.json({error:'Workspace not found.'},{status:404});
    const response=NextResponse.json({activeWorkspaceId:workspaceId});
    setWorkspaceCookie(response,workspaceId);
    return response;
  }catch(error){return responseError(error,'Unable to change workspace.');}
}
