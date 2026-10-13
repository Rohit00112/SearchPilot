import { NextRequest,NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import {authorize,csrf} from "@/lib/auth";
import {challenge,digest,encrypt,gscConfig} from "@/lib/gsc";
import {getPool} from "@/lib/db";
export const runtime="nodejs";
export async function POST(request:NextRequest){
  if(csrf(request)) return NextResponse.json({error:"Invalid request origin."},{status:403});
  try {
    const user=await authorize(request,"editor");
    if(!user) return NextResponse.json({error:"Workspace editor access required."},{status:403});
    const cfg=gscConfig(),state=randomBytes(24).toString("base64url"),verifier=randomBytes(48).toString("base64url");
    await getPool().query("INSERT INTO gsc_oauth_states(state_hash,workspace_id,user_id,verifier_enc,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')",[digest(state),user.workspaceId,user.id,encrypt(verifier)]);
    const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search=new URLSearchParams({client_id:cfg.id,redirect_uri:cfg.redirect,response_type:"code",scope:"https://www.googleapis.com/auth/webmasters.readonly",access_type:"offline",prompt:"consent",state,code_challenge:challenge(verifier),code_challenge_method:"S256"}).toString();
    return NextResponse.json({authorizationUrl:url.toString()});
  }catch {return NextResponse.json({error:"Google connection is not configured or temporarily unavailable."},{status:503})}
}
