import {NextRequest,NextResponse} from 'next/server';
import {authenticated,deny} from '@/lib/auth';
export const runtime='nodejs';
export async function GET(request:NextRequest){
  try{const session=await authenticated(request);return session?NextResponse.json({authenticated:true,...session}):deny()}
  catch{return NextResponse.json({error:'Authentication temporarily unavailable.'},{status:503})}
}
