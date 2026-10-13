import type {Metadata} from 'next';
import {createHash} from 'node:crypto';
import {notFound} from 'next/navigation';
import {databaseAvailable,getPool} from '@/lib/db';
import SharedReport from '@/components/reports/shared-report';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Shared Report | SearchPilot',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  if(!databaseAvailable||!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();
  let report:{title:string;domain:string;sections:string[];expiresAt:string}|undefined;
  try{
    const hash=createHash('sha256').update(token).digest('hex');
    const result=await getPool().query<{title:string;domain:string;sections:string[];expiresAt:string}>(`
      SELECT snapshot_title AS title,snapshot_domain AS domain,snapshot_sections AS sections,
        expires_at AS "expiresAt" FROM report_shares
      WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now() LIMIT 1`,[hash]);
    report=result.rows[0];
  }catch{notFound();}
  if(!report)notFound();
  return <SharedReport report={report}/>;
}
