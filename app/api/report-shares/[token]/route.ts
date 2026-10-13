import {createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {databaseAvailable,getPool} from '@/lib/db';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'};
const missing=()=>NextResponse.json({error:'Shared report unavailable.'},{status:404,headers});
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
export async function GET(_request:NextRequest,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  if(!databaseAvailable||!tokenPattern.test(token))return missing();
  try{
    const digest=createHash('sha256').update(token).digest('hex');
    const result=await getPool().query<{title:string;domain:string;sections:string[];expiresAt:string}>(`
      SELECT snapshot_title AS title,snapshot_domain AS domain,
        snapshot_sections AS sections,expires_at AS "expiresAt"
      FROM report_shares WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()
      LIMIT 1`,[digest]);
    if(!result.rows.length)return missing();
    const row=result.rows[0];
    return NextResponse.json({report:{title:row.title,domain:row.domain,sections:row.sections,expiresAt:row.expiresAt},
      scope:'title_domain_headings_only',readOnly:true},{headers});
  }catch{return missing();}
}
