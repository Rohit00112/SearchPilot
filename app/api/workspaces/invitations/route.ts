import {randomBytes,createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {authorize,csrf} from '@/lib/auth';
import {getPool} from '@/lib/db';
import {jsonBody,uuid,responseError,ValidationError} from '@/lib/validation';
export const runtime='nodejs';
const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
async function owner(request:NextRequest){
  const user=await authorize(request);
  if(!user||user.role!=='owner')return null;
  return user;
}
export async function GET(request:NextRequest){
  try{
    const user=await owner(request);
    if(!user)return NextResponse.json({error:'Workspace owner required.'},{status:403});
    const [members,invites]=await Promise.all([
      getPool().query(`SELECT m.user_id AS id,u.email,u.display_name AS "displayName",m.role,m.created_at AS "joinedAt" FROM local_workspace_members m JOIN local_users u ON u.id=m.user_id WHERE m.workspace_id=$1 ORDER BY m.created_at`,[user.workspaceId]),
      getPool().query(`SELECT id,email,role,expires_at AS "expiresAt",accepted_at AS "acceptedAt",revoked_at AS "revokedAt",created_at AS "createdAt" FROM workspace_invitations WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100`,[user.workspaceId])
    ]);
    return NextResponse.json({members:members.rows,invitations:invites.rows});
  }catch{return NextResponse.json({error:'Unable to load collaborators.'},{status:503});}
}
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  try{
    const user=await owner(request);
    if(!user)return NextResponse.json({error:'Workspace owner required.'},{status:403});
    const body=await jsonBody(request);
    if(typeof body.email!=='string'||body.email.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
      throw new ValidationError('Enter a valid invitation email.');
    if(body.role!=='viewer'&&body.role!=='editor')throw new ValidationError('Role must be viewer or editor.');
    const email=body.email.trim().toLowerCase();
    const token=randomBytes(32).toString('base64url');
    const client=await getPool().connect();
    try{
      await client.query('BEGIN');
      const ownerExisting=await client.query(`SELECT 1 FROM local_workspace_members m JOIN local_users u ON u.id=m.user_id WHERE m.workspace_id=$1 AND lower(u.email)=$2 AND m.role='owner'`,[user.workspaceId,email]);
      if(ownerExisting.rows.length)throw new ValidationError('Cannot invite the workspace owner.');
      await client.query('UPDATE workspace_invitations SET revoked_at=now() WHERE workspace_id=$1 AND lower(email)=$2 AND accepted_at IS NULL AND revoked_at IS NULL',[user.workspaceId,email]);
      const {rows}=await client.query(`INSERT INTO workspace_invitations(workspace_id,email,role,token_hash,invited_by,expires_at)
        VALUES($1,$2,$3,$4,$5,now()+interval '7 days') RETURNING id,expires_at AS "expiresAt"`,
        [user.workspaceId,email,body.role,sha(token),user.id]);
      await client.query('COMMIT');
      return NextResponse.json({invitation:{id:rows[0].id,email,role:body.role,expiresAt:rows[0].expiresAt,inviteToken:token},delivery:'manual_copy_only'},{status:201,headers:{'Cache-Control':'no-store'}});
    }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
  }catch(error){return responseError(error,'Unable to invite collaborator.');}
}
export async function DELETE(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  try{
    const user=await owner(request);
    if(!user)return NextResponse.json({error:'Workspace owner required.'},{status:403});
    const id=uuid(request.nextUrl.searchParams.get('id'),'invitation ID');
    const {rows}=await getPool().query('UPDATE workspace_invitations SET revoked_at=now() WHERE workspace_id=$1 AND id=$2 AND revoked_at IS NULL AND accepted_at IS NULL RETURNING id',[user.workspaceId,id]);
    return rows.length?NextResponse.json({revoked:true}):NextResponse.json({error:'Invitation not found.'},{status:404});
  }catch(error){return responseError(error,'Unable to revoke invitation.');}
}
