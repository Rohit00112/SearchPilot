import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { databaseAvailable, getPool, normalizeDomain } from "@/lib/db";
import { demoAudits } from "@/lib/demo";
import { errorResponse } from "@/lib/response";

export const runtime = "nodejs";

type Check = { name: string; status: "pass" | "warning" | "fail"; details: string; recommendation: string };

function isPublicIP(address: string): boolean {
  if (isIP(address) === 4) {
    const n = address.split(".").map(Number);
    return !(n[0] === 0 || n[0] === 10 || n[0] === 127 || n[0] >= 224 ||
      (n[0] === 169 && n[1] === 254) || (n[0] === 172 && n[1] >= 16 && n[1] <= 31) ||
      (n[0] === 192 && n[1] === 168) || (n[0] === 100 && n[1] >= 64 && n[1] <= 127) ||
      (n[0] === 192 && n[1] === 0) || (n[0] === 198 && (n[1] === 18 || n[1] === 19)));
  }
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    return !(value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") ||
      value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") ||
      value.startsWith("::ffff:") || value.startsWith("2001:db8"));
  }
  return false;
}

async function runAudit(domain: string): Promise<{ score: number; checks: Check[] }> {
  const records = await lookup(domain, { all: true });
  if (!records.length || records.some((record) => !isPublicIP(record.address))) {
    throw new Error("Domain must resolve to a public IP address.");
  }
  const response = await fetch(`https://${domain}/`, {
    redirect: "manual", signal: AbortSignal.timeout(8000),
    headers: { "user-agent": "SearchPilotSiteAudit/1.0 (+on-demand single-page check)" },
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") ?? "";
  const html = contentType.includes("text/html") ? (await response.text()).slice(0, 300_000) : "";
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();
  const description = /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)/i.exec(html)?.[1] ??
    /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i.exec(html)?.[1];
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const checks: Check[] = [
    { name: "HTTPS response", status: response.ok ? "pass" : "warning", details: `HTTP ${response.status}`, recommendation: "Ensure the homepage returns a successful HTTPS response." },
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
  if (!databaseAvailable) return NextResponse.json({ audits: demoAudits.filter((a) => !projectId || a.projectId === projectId), demo: true });
  try {
    const { rows } = await getPool().query(
      `SELECT id, project_id AS "projectId", domain, score, checks, checked_at AS "checkedAt"
       FROM audits WHERE ($1::uuid IS NULL OR project_id = $1::uuid)
       ORDER BY checked_at DESC LIMIT 40`, [projectId || null],
    );
    return NextResponse.json({ audits: rows, demo: false });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const domain = normalizeDomain(String(body.domain ?? ""));
    const { score, checks } = await runAudit(domain);
    if (!databaseAvailable) {
      return NextResponse.json({ audit: { id: crypto.randomUUID(), projectId: body.projectId ?? null, domain, score, checkedAt: new Date().toISOString(), checks, demo: false }, persisted: false });
    }
    const projectId = body.projectId || null;
    const { rows } = await getPool().query(
      `INSERT INTO audits (project_id, domain, score, checks) VALUES ($1,$2,$3,$4)
       RETURNING id, project_id AS "projectId", domain, score, checks, checked_at AS "checkedAt"`,
      [projectId, domain, score, JSON.stringify(checks)],
    );
    return NextResponse.json({ audit: rows[0], persisted: true }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
