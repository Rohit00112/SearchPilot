import {NextRequest,NextResponse} from "next/server";
import {authorize} from "@/lib/auth";
import {getPool} from "@/lib/db";
import {decrypt,getAccessToken} from "@/lib/gsc";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const user=await authorize(request);if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const {rows}=await getPool().query<{refresh_token_enc:string}>("SELECT refresh_token_enc FROM gsc_connections WHERE workspace_id=$1 AND user_id=$2",[user.workspaceId,user.id]);
  if(!rows[0])return NextResponse.json({error:"Connect Google Search Console first."},{status:409});
  const access=await getAccessToken(decrypt(rows[0].refresh_token_enc));
  const response=await fetch("https://www.googleapis.com/webmasters/v3/sites",{headers:{authorization:`Bearer ${access}`},signal:AbortSignal.timeout(10000),cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Google property listing unavailable."},{status:502});
  const data=await response.json();
  return NextResponse.json({properties:(data.siteEntry??[]).map((entry:{siteUrl:string;permissionLevel:string})=>({url:entry.siteUrl,permission:entry.permissionLevel}))});
 }catch{return NextResponse.json({error:"Unable to list Google properties."},{status:503})}
}
