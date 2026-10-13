import {NextRequest,NextResponse} from 'next/server';
import {authorize,csrf} from '@/lib/auth';
import {getPool} from '@/lib/db';
import {jsonBody,uuid,responseError,ValidationError} from '@/lib/validation';
export const runtime='nodejs';
export async function PATCH(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  try{
    const user=await authorize(request);if(user?.role!=='owner')return NextResponse.json({error:'Workspace owner required.'},{status:403});
    const id=uuid(request.nextUrl.searchParams.get('id'),'member ID');
    const body=await jsonBody(request);
    if(body.role!=='viewer'&&body.role!=='editor')throw new ValidationError('Role must be viewer or editor.');
    const {rows}=await getPool().query(`UPDATE local_workspace_members SET role=$3 WHERE workspace_id=$1 AND user_id=$2 AND role <> 'owner' RETURNING user_id`,[user.workspaceId,id,body.role]);
    return rows.length?NextResponse.json({updated:true}):NextResponse.json({error:'Member not found or is an owner.'},{status:404});
  }catch(error){return responseError(error,'Unable to update member.');}
}
export async function DELETE(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  try{
    const user=await authorize(request);if(user?.role!=='owner')return NextResponse.json({error:'Workspace owner required.'},{status:403});
    const id=uuid(request.nextUrl.searchParams.get('id'),'member ID');
    const {rows}=await getPool().query(`DELETE FROM local_workspace_members WHERE workspace_id=$1 AND user_id=$2 AND role <> 'owner' RETURNING user_id`,[user.workspaceId,id]);
    return rows.length?NextResponse.json({removed:true}):NextResponse.json({error:'Member not found or is an owner.'},{status:404});
  }catch(error){return responseError(error,'Unable to remove member.');}
}
