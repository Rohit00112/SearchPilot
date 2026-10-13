import {NextRequest,NextResponse} from "next/server";
import {authorize,csrf} from "@/lib/auth";
import {getPool} from "@/lib/db";
import {decrypt,getAccessToken} from "@/lib/gsc";
export const runtime="nodejs";
const dateOk=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d));
export async function GET(request:NextRequest){
 try{
  const user=await authorize(request);if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const from=request.nextUrl.searchParams.get("from"),to=request.nextUrl.searchParams.get("to");
  const property=request.nextUrl.searchParams.get("property");
  if(!from||!to||!dateOk(from)||!dateOk(to)||from>to)return NextResponse.json({error:"Provide valid from and to dates."},{status:400});
  if(property&&(property.length>500||!(property.startsWith("sc-domain:")||/^https:\/\//.test(property))))
    return NextResponse.json({error:"Invalid property filter."},{status:400});
  const {rows}=await getPool().query("SELECT metric_date AS date,property_uri AS property,query,page,country,device,clicks,impressions,ctr,average_position AS \"averagePosition\",collected_at AS \"collectedAt\" FROM gsc_performance WHERE workspace_id=$1 AND metric_date BETWEEN $2 AND $3 AND ($4::text IS NULL OR property_uri=$4) ORDER BY metric_date DESC LIMIT 1000",[user.workspaceId,from,to,property??null]);
  return NextResponse.json({rows:rows.map(r=>({...r,source:"google_search_console",sample:false})),propertyFilter:property??null,source:"google_search_console",sample:false,limited:true},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Unable to read search performance."},{status:503})}
}
export async function POST(request:NextRequest){
 if(csrf(request))return NextResponse.json({error:"Invalid origin."},{status:403});
 try{
  const user=await authorize(request,"editor");if(!user)return NextResponse.json({error:"Editor access required."},{status:403});
  const body=await request.json(),from=String(body.from??""),to=String(body.to??"");
  if(!dateOk(from)||!dateOk(to)||from>to||(Date.parse(to)-Date.parse(from))/86400000>30)return NextResponse.json({error:"Use a valid range of at most 31 days."},{status:400});
  const pool=getPool(),{rows}=await pool.query<{id:string;refresh_token_enc:string;property_uri:string}>("SELECT id,refresh_token_enc,property_uri FROM gsc_connections WHERE workspace_id=$1 AND user_id=$2 AND property_uri IS NOT NULL",[user.workspaceId,user.id]);
  const conn=rows[0];if(!conn)return NextResponse.json({error:"Select an authorized property first."},{status:409});
  const access=await getAccessToken(decrypt(conn.refresh_token_enc));
  const response=await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(conn.property_uri)}/searchAnalytics/query`,{
   method:"POST",headers:{authorization:`Bearer ${access}`,"content-type":"application/json"},
   body:JSON.stringify({startDate:from,endDate:to,dimensions:["date","query","page","country","device"],rowLimit:1000}),
   signal:AbortSignal.timeout(15000),cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Google Search Console request failed.",retryable:response.status===429||response.status>=500},{status:response.status===429?429:502});
  const data=await response.json(),records=Array.isArray(data.rows)?data.rows:[];
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   for(const record of records){
    const keys=record.keys;
    if(!Array.isArray(keys)||keys.length!==5||!dateOk(keys[0]))continue;
    await client.query(`INSERT INTO gsc_performance(workspace_id,connection_id,property_uri,metric_date,query,page,country,device,clicks,impressions,ctr,average_position)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT(connection_id,metric_date,query,page,country,device)
      DO UPDATE SET clicks=excluded.clicks,impressions=excluded.impressions,ctr=excluded.ctr,average_position=excluded.average_position,collected_at=now()`,[user.workspaceId,conn.id,conn.property_uri,...keys,record.clicks,record.impressions,record.ctr,record.position]);
   }
   await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
  return NextResponse.json({imported:records.length,source:"google_search_console",sample:false,partial:records.length===1000,property:conn.property_uri});
 }catch{return NextResponse.json({error:"Search performance import unavailable."},{status:503})}
}
