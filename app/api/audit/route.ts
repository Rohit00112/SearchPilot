import { NextRequest, NextResponse } from "next/server";
import { databaseAvailable, getPool, normalizeDomain } from "@/lib/db";
import { demoAudits } from "@/lib/demo";
import {authorize,csrf,demoAllowed,deny,forbidden} from '@/lib/auth';
import {AuditFetchError,fetchAuditHtml} from '@/lib/audit-fetch';
import {limitResponse,limitedJson,remoteClient,requestError,RequestBodyError} from '@/lib/rate-limit';
import {uuid,responseError} from '@/lib/validation';

export const runtime = "nodejs";

type Check = { name: string; status: "pass" | "warning" | "fail"; details: string; recommendation: string };

async function runAudit(domain: string): Promise<{ score: number; checks: Check[] }> {
  const { html, status } = await fetchAuditHtml(domain);
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();
  const description = /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)/i.exec(html)?.[1] ??
    /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i.exec(html)?.[1];
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const checks: Check[] = [
    { name: "HTTPS response", status: status >= 200 && status < 300 ? "pass" : "warning", details: `HTTP ${status}`, recommendation: "Ensure the homepage returns a successful HTTPS response." },
    { name: "Page title", status: title ? "pass" : "fail", details: title ? title.slice(0, 110) : "Missing or inaccessible title.", recommendation: "Write a unique, descriptive title of appropriate length." },
    { name: "Meta description", status: description ? "pass" : "warning", details: description ? description.slice(0, 160) : "Missing meta description.", recommendation: "Add a clear summary that describes the page." },
    { name: "Heading structure", status: h1Count === 1 ? "pass" : "warning", details: `${h1Count} H1 heading(s) detected.`, recommendation: "Use one descriptive main heading." },
    { name: "Canonical URL", status: /<link\s+[^>]*rel=["']canonical["']/i.test(html) ? "pass" : "warning", details: /rel=["']canonical["']/i.test(html) ? "Canonical link detected." : "No canonical link detected.", recommendation: "Declare the preferred canonical URL." },
    { name: "Mobile viewport", status: /<meta\s+[^>]*name=["']viewport["']/i.test(html) ? "pass" : "warning", details: /name=["']viewport["']/i.test(html) ? "Viewport declared." : "Mobile viewport declaration not detected.", recommendation: "Declare a responsive viewport." },
  ];
  const score = Math.round((checks.reduce((total, c) => total + (c.status === "pass" ? 1 : c.status === "warning" ? 0.5 : 0), 0) / checks.length) * 100);
  return { score, checks };
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!databaseAvailable) return demoAllowed()?NextResponse.json({ audits: demoAudits.filter((a) => !projectId || a.projectId === projectId), demo: true }):deny();
  try {
    const session=await authorize(request);if(!session)return deny();
    if(projectId)uuid(projectId,'project ID');
    const { rows } = await getPool().query(
      `SELECT id, project_id AS "projectId", domain, score, checks, checked_at AS "checkedAt"
       FROM audits WHERE workspace_id=$1 AND ($2::uuid IS NULL OR project_id = $2::uuid)
       ORDER BY checked_at DESC LIMIT 40`, [session.workspaceId,projectId || null],
    );
    return NextResponse.json({ audits: rows, demo: false });
  } catch (error) { return responseError(error,'Unable to load audit history.'); }
}

export async function POST(request: NextRequest) {
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable&&!demoAllowed())return deny();
  try {
    const body = await limitedJson(request);
    const domain = normalizeDomain(String(body.domain ?? ""));
    const projectId=body.projectId==null?null:uuid(body.projectId,'project ID');
    const session=databaseAvailable?await authorize(request,'editor'):null;
    if(databaseAvailable&&!session)return forbidden();
    const throttled=await limitResponse({
      kind:'audit',
      identity:session?.id??remoteClient(request),
      limit:6,
      windowSeconds:3600,
    });
    if(throttled)return throttled;
    if(databaseAvailable&&projectId){
      const match=await getPool().query('SELECT 1 FROM projects WHERE id=$1 AND workspace_id=$2',[projectId,session!.workspaceId]);
      if(!match.rows.length)return NextResponse.json({error:'Project not found.'},{status:404});
    }
    const { score, checks } = await runAudit(domain);
    if (!databaseAvailable) {
      return NextResponse.json({ audit: { id: crypto.randomUUID(), projectId, domain, score, checkedAt: new Date().toISOString(), checks, demo: false }, persisted: false });
    }
    const { rows } = await getPool().query(
      `INSERT INTO audits (workspace_id,project_id, domain, score, checks) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, project_id AS "projectId", domain, score, checks, checked_at AS "checkedAt"`,
      [session!.workspaceId,projectId, domain, score, JSON.stringify(checks)],
    );
    return NextResponse.json({ audit: rows[0], persisted: true }, { status: 201 });
  } catch (error) {
    if(error instanceof AuditFetchError)return NextResponse.json({error:error.message},{status:422});
    if(error instanceof RequestBodyError)return requestError(error,'Invalid audit request.');
    return responseError(error,'Unable to complete audit.');
  }
}
