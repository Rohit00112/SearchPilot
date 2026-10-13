import {createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {csrf,identity,setWorkspaceCookie} from '@/lib/auth';
import {getPool} from '@/lib/db';
import {jsonBody,responseError,ValidationError} from '@/lib/validation';
export const runtime='nodejs';
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  try{
    const user=await identity(request);
    if(!user)return NextResponse.json({error:'Sign in before accepting this invitation.'},{status:401});
    const body=await jsonBody(request),token=body.token;
    if(typeof token!=='string'||!/^[a-zA-Z0-9_-]{43}$/.test(token))throw new ValidationError('Invalid invitation token.');
    const hash=createHash('sha256').update(token).digest('hex');
    const client=await getPool().connect();
    try{
      await client.query('BEGIN');
      const {rows}=await client.query(`SELECT id,workspace_id,role,email FROM workspace_invitations WHERE token_hash=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`,[hash]);
      const invite=rows[0];
      if(!invite||invite.email.toLowerCase()!==user.email.toLowerCase()){
        await client.query('ROLLBACK');
        return NextResponse.json({error:'Invitation is invalid, expired, or assigned to another email.'},{status:403});
      }
      await client.query(`INSERT INTO local_workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3)
        ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=CASE WHEN local_workspace_members.role='owner' THEN 'owner' ELSE excluded.role END`,
        [invite.workspace_id,user.id,invite.role]);
      await client.query('UPDATE workspace_invitations SET accepted_at=now(),accepted_by=$2 WHERE id=$1',[invite.id,user.id]);
      await client.query('COMMIT');
      const response=NextResponse.json({accepted:true,workspaceId:invite.workspace_id});
      setWorkspaceCookie(response,invite.workspace_id);
      return response;
    }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
  }catch(error){return responseError(error,'Unable to accept invitation.');}
}
