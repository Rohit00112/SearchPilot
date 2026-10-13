import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {csrf,hashPassword,startSession,memberships,ensureAuthReady} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  try{
    ensureAuthReady();
    const body=await request.json();
    const email=String(body.email||'').trim().toLowerCase();
    const password=String(body.password||'');
    const displayName=String(body.displayName||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||displayName.length<2||displayName.length>120||password.length<12||password.length>256)
      return NextResponse.json({error:'Enter a valid email, name, and password (12–256 characters).'},{status:400});
    const passwordHash=await hashPassword(password);
    const client=await getPool().connect();
    let user:{id:string;email:string;displayName:string};
    let workspaceId:string;
    try{
      await client.query('BEGIN');
      const u=await client.query<{id:string;email:string;displayName:string}>('INSERT INTO local_users(email,display_name,password_hash) VALUES($1,$2,$3) RETURNING id,email,display_name AS "displayName"',[email,displayName,passwordHash]);
      user=u.rows[0];
      const w=await client.query<{id:string}>('INSERT INTO local_workspaces(name,owner_id) VALUES($1,$2) RETURNING id',[displayName+"'s workspace",user.id]);
      workspaceId=w.rows[0].id;
      await client.query("INSERT INTO local_workspace_members(workspace_id,user_id,role) VALUES($1,$2,'owner')",[workspaceId,user.id]);
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
    const response=NextResponse.json({user,workspaces:await memberships(user.id),activeWorkspaceId:workspaceId},{status:201});
    await startSession(user.id,response);
    return response;
  }catch(error){
    const code=(error as {code?:string}).code;
    return NextResponse.json({error:code==='23505'?'Account already exists.':'Unable to create account.'},{status:code==='23505'?409:503});
  }
}
