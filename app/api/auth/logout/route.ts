import {NextRequest,NextResponse} from 'next/server';
import {clearSession,csrf,revokeSession} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  try{await revokeSession(request)}catch{return NextResponse.json({error:'Unable to revoke session.'},{status:503})}
  const response=NextResponse.json({ok:true});clearSession(response);return response;
}
