import {createHash,randomBytes} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {authorize,csrf,deny,forbidden} from '@/lib/auth';
import {databaseAvailable,getPool} from '@/lib/db';
import {jsonBody,responseError,uuid,ValidationError} from '@/lib/validation';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers});
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
const allowed=['overview','keywords','audit','manual_rankings','notes'];
const labels:Record<string,string>={
  overview:'Project overview',keywords:'User-recorded keywords',
  audit:'Latest homepage audit',manual_rankings:'Manual rank observations',notes:'Editorial notes',
};
const unavailable=()=>reply({error:'Report sharing requires PostgreSQL.'},503);

export async function GET(request:NextRequest){
  if(!databaseAvailable)return unavailable();
  try{
    const user=await authorize(request);
    if(!user)return deny();
    const reportId=uuid(request.nextUrl.searchParams.get('reportId'),'report ID');
    if(request.nextUrl.search.length>100)return reply({error:'Invalid query length.'},400);
    const owned=await getPool().query('SELECT id FROM report_definitions WHERE workspace_id=$1 AND id=$2',[user.workspaceId,reportId]);
    if(!owned.rows.length)return reply({error:'Report not found.'},404);
    const result=await getPool().query(`SELECT id,report_id AS "reportId",created_at AS "createdAt",expires_at AS "expiresAt",revoked_at AS "revokedAt"
      FROM report_shares WHERE workspace_id=$1 AND report_id=$2 ORDER BY created_at DESC LIMIT 100`,[user.workspaceId,reportId]);
    return reply({shares:result.rows});
  }catch(error){const res=responseError(error,'Unable to load report shares.');res.headers.set('Cache-Control','no-store');return res;}
}

export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return unavailable();
  try{
    const user=await authorize(request,'editor');if(!user)return forbidden();
    const body=await jsonBody(request);
    if(Object.keys(body).some(key=>!['reportId','ttlDays','acknowledgeLimitedShare'].includes(key)))throw new ValidationError('Unexpected share options.');
    const reportId=uuid(body.reportId,'report ID');
    if(body.acknowledgeLimitedShare!==true)throw new ValidationError('Confirm that this link shares the report title, project domain and section headings with anyone holding the link.');
    if(typeof body.ttlDays!=='number'||!Number.isInteger(body.ttlDays)||body.ttlDays<1||body.ttlDays>30)
      throw new ValidationError('Expiry must be 1–30 whole days.');
    const report=await getPool().query<{title:string;domain:string;blocks:unknown}>(`
      SELECT r.title,p.domain,r.blocks FROM report_definitions r
      JOIN projects p ON p.workspace_id=r.workspace_id AND p.id=r.project_id
      WHERE r.workspace_id=$1 AND r.id=$2`,[user.workspaceId,reportId]);
    if(!report.rows.length)return reply({error:'Report not found.'},404);
    const {title,domain,blocks}=report.rows[0];
    if(!Array.isArray(blocks)||blocks.length<1||blocks.length>5||blocks.some(block=>typeof block!=='string'||!allowed.includes(block))||new Set(blocks).size!==blocks.length)
      throw new ValidationError('Report contains unsupported section headings.');
    const token=randomBytes(32).toString('base64url');
    const sections=blocks.map((block:string)=>labels[block]);
    const result=await getPool().query(`INSERT INTO report_shares
      (workspace_id,report_id,token_hash,snapshot_title,snapshot_domain,snapshot_sections,created_by,expires_at)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,now()+($8::integer * interval '1 day'))
      RETURNING id,report_id AS "reportId",created_at AS "createdAt",expires_at AS "expiresAt"`,
      [user.workspaceId,reportId,hash(token),title,domain,JSON.stringify(sections),user.id,body.ttlDays]);
    return reply({share:result.rows[0],token,delivery:'manual_copy_only',scope:'title_domain_headings_only'},201);
  }catch(error){const res=responseError(error,'Unable to create report share.');res.headers.set('Cache-Control','no-store');return res;}
}

export async function DELETE(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return unavailable();
  try{
    const user=await authorize(request,'editor');if(!user)return forbidden();
    if(request.nextUrl.search.length>100)return reply({error:'Invalid query length.'},400);
    const id=uuid(request.nextUrl.searchParams.get('id'),'share ID');
    const result=await getPool().query(`UPDATE report_shares SET revoked_at=now()
      WHERE workspace_id=$1 AND id=$2 AND revoked_at IS NULL RETURNING id`,[user.workspaceId,id]);
    return result.rows.length?reply({revoked:true}):reply({error:'Active share not found.'},404);
  }catch(error){const res=responseError(error,'Unable to revoke report share.');res.headers.set('Cache-Control','no-store');return res;}
}
