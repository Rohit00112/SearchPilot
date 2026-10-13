import { NextRequest, NextResponse } from "next/server";
import { databaseAvailable, getPool, normalizeDomain } from "@/lib/db";
import { demoProjects } from "@/lib/demo";
import { errorResponse } from "@/lib/response";

export const runtime = "nodejs";

export async function GET() {
  if (!databaseAvailable) return NextResponse.json({ projects: demoProjects, demo: true });
  try {
    const { rows } = await getPool().query(
      'SELECT id, name, domain, created_at AS "createdAt" FROM projects ORDER BY created_at DESC',
    );
    return NextResponse.json({ projects: rows, demo: false });
  } catch (error) { return errorResponse(error, 503); }
}

export async function POST(request: NextRequest) {
  if (!databaseAvailable) return errorResponse(new Error("Configure DATABASE_URL to save projects. Demo content is read-only."), 503);
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 120) throw new Error("Project name must have 1–120 characters.");
    const domain = normalizeDomain(String(body.domain ?? ""));
    const { rows } = await getPool().query(
      'INSERT INTO projects (name, domain) VALUES ($1, $2) RETURNING id, name, domain, created_at AS "createdAt"',
      [name, domain],
    );
    return NextResponse.json({ project: rows[0] }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
