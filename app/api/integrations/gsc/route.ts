import {NextRequest,NextResponse} from "next/server";
import {authorize,csrf} from "@/lib/auth";
import {getPool} from "@/lib/db";
import {decrypt,getAccessToken,gscConfig} from "@/lib/gsc";
export const runtime="nodejs";
async function connection(request:NextRequest) {
 const user=await authorize(request),pool=getPool();
 if(!user)return null;
 const {rows}=await pool.query<{id:string;refresh_token_enc:string;property_uri:string|null}>(
  "SELECT id,refresh_token_enc,property_uri FROM gsc_connections WHERE workspace_id=$1 AND user_id=$2",[user.workspaceId,user.id]);
 return {user,record:rows[0]};
}
export async function GET(request:NextRequest){
 try {
  const info=await connection(request);if(!info)return NextResponse.json({error:"Authentication required."},{status:401});
  return NextResponse.json({connected:!!info.record,property:info.record?.property_uri??null,configured:Boolean(process.env.GOOGLE_CLIENT_ID)});
 }catch{return NextResponse.json({error:"Integration unavailable."},{status:503})}
}
export async function DELETE(request:NextRequest) {
 if(csrf(request))return NextResponse.json({error:"Invalid origin."},{status:403});
 try{
  const user=await authorize(request,"editor");if(!user)return NextResponse.json({error:"Permission denied."},{status:403});
  await getPool().query("DELETE FROM gsc_connections WHERE workspace_id=$1 AND user_id=$2",[user.workspaceId,user.id]);
  return NextResponse.json({disconnected:true});
 }catch{return NextResponse.json({error:"Unable to disconnect."},{status:503})}
}
export async function PATCH(request:NextRequest){
 if(csrf(request))return NextResponse.json({error:"Invalid origin."},{status:403});
 try {
  gscConfig();
  const info=await connection(request);
  if(!info?.record||info.user.role==="viewer")return NextResponse.json({error:"Connect a Google account with editor access."},{status:403});
  const body=await request.json(),property=String(body.property??"");
  if(property.length>500||!(property.startsWith("sc-domain:")||/^https:\/\//.test(property)))return NextResponse.json({error:"Invalid Search Console property."},{status:400});
  const access=await getAccessToken(decrypt(info.record.refresh_token_enc));
  const response=await fetch("https://www.googleapis.com/webmasters/v3/sites",{headers:{authorization:`Bearer ${access}`},signal:AbortSignal.timeout(10000),cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Unable to verify accessible Google properties."},{status:502});
  const data=await response.json();
  if(!Array.isArray(data.siteEntry)||!data.siteEntry.some((s:{siteUrl?:string})=>s.siteUrl===property))return NextResponse.json({error:"Property is not accessible with this Google account."},{status:403});
  await getPool().query("UPDATE gsc_connections SET property_uri=$1,updated_at=now() WHERE id=$2 AND workspace_id=$3",[property,info.record.id,info.user.workspaceId]);
  return NextResponse.json({property});
 }catch{return NextResponse.json({error:"Unable to select property."},{status:503})}
}
