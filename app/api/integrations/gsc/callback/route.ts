import {NextRequest,NextResponse} from "next/server";
import {identity} from "@/lib/auth";
import {decrypt,digest,encrypt,gscConfig} from "@/lib/gsc";
import {getPool} from "@/lib/db";
export const runtime="nodejs";
export async function GET(request:NextRequest){
  const origin=process.env.APP_ORIGIN || request.nextUrl.origin;
  const fail=()=>NextResponse.redirect(new URL("/settings?gsc=error",origin));
  try{
    const user=await identity(request),state=request.nextUrl.searchParams.get("state"),code=request.nextUrl.searchParams.get("code");
    if(!user||!state||!code||request.nextUrl.searchParams.has("error"))return fail();
    const pool=getPool(), client=await pool.connect();
    let record:{workspace_id:string;verifier_enc:string}|undefined;
    try {
      await client.query("BEGIN");
      const result=await client.query<{workspace_id:string;verifier_enc:string}>(
        "DELETE FROM gsc_oauth_states WHERE state_hash=$1 AND user_id=$2 AND expires_at>now() RETURNING workspace_id,verifier_enc",[digest(state),user.id]);
      record=result.rows[0];
      await client.query("COMMIT");
    }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
    if(!record)return fail();
    const cfg=gscConfig();
    const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:cfg.id,client_secret:cfg.secret,redirect_uri:cfg.redirect,grant_type:"authorization_code",code_verifier:decrypt(record.verifier_enc)}),signal:AbortSignal.timeout(10000),cache:"no-store"});
    if(!res.ok)return fail();
    const token=await res.json();
    if(typeof token.refresh_token!=="string")return fail();
    const member=await pool.query("SELECT 1 FROM local_workspace_members WHERE workspace_id=$1 AND user_id=$2 AND role IN ('owner','editor')",[record.workspace_id,user.id]);
    if(!member.rowCount)return fail();
    await pool.query("INSERT INTO gsc_connections(workspace_id,user_id,refresh_token_enc) VALUES($1,$2,$3) ON CONFLICT(workspace_id,user_id) DO UPDATE SET refresh_token_enc=excluded.refresh_token_enc,updated_at=now()",[record.workspace_id,user.id,encrypt(token.refresh_token)]);
    return NextResponse.redirect(new URL("/settings?gsc=connected",origin));
  }catch{return fail()}
}
