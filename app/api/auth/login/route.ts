import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {csrf,verifyPassword,startSession,memberships,ensureAuthReady} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  try{
    ensureAuthReady();
    const body=await request.json();
    const email=String(body.email||'').trim().toLowerCase();
    const password=String(body.password||'');
    if(email.length>254||password.length>256)return NextResponse.json({error:'Invalid email or password.'},{status:401});
    const result=await getPool().query<{id:string;email:string;displayName:string;passwordHash:string}>('SELECT id,email,display_name AS "displayName",password_hash AS "passwordHash" FROM local_users WHERE lower(email)=$1',[email]);
    const user=result.rows[0];
    // Work factor for nonexisting users reduces timing-based account probing.
    const fallback='scrypt$16384$11111111111111111111111111111111$'+'11'.repeat(64);
    if(!await verifyPassword(password,user?.passwordHash||fallback)||!user)return NextResponse.json({error:'Invalid email or password.'},{status:401});
    const workspaces=await memberships(user.id);
    const response=NextResponse.json({user:{id:user.id,email:user.email,displayName:user.displayName},workspaces,activeWorkspaceId:workspaces[0]?.id??null});
    await startSession(user.id,response);
    return response;
  }catch{return NextResponse.json({error:'Login temporarily unavailable.'},{status:503})}
}
