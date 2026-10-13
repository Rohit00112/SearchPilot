import { NextRequest, NextResponse } from "next/server";
import { databaseAvailable, getPool } from "@/lib/db";
import { demoKeywords } from "@/lib/demo";
import { errorResponse } from "@/lib/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!databaseAvailable) return NextResponse.json({
    keywords: demoKeywords.filter((keyword) => !projectId || keyword.projectId === projectId), demo: true,
  });
  try {
    const { rows } = await getPool().query(
      `SELECT id, project_id AS "projectId", keyword, position, volume, difficulty,
              created_at AS "createdAt" FROM keywords
       WHERE ($1::uuid IS NULL OR project_id = $1::uuid) ORDER BY created_at DESC`,
      [projectId || null],
    );
    return NextResponse.json({ keywords: rows, demo: false });
  } catch (error) { return errorResponse(error, 400); }
}

export async function POST(request: NextRequest) {
  if (!databaseAvailable) return errorResponse(new Error("Configure DATABASE_URL to save keywords."), 503);
  try {
    const body = await request.json();
    const keyword = String(body.keyword ?? "").trim();
    const projectId = String(body.projectId ?? "");
    if (!keyword || keyword.length > 200) throw new Error("Keyword must have 1–200 characters.");
    const position = body.position == null ? null : Number(body.position);
    const volume = body.volume == null ? null : Number(body.volume);
    const difficulty = body.difficulty == null ? null : Number(body.difficulty);
    if (position !== null && (!Number.isInteger(position) || position < 1 || position > 1000)) throw new Error("Position must be between 1 and 1000.");
    if (volume !== null && (!Number.isInteger(volume) || volume < 0)) throw new Error("Volume must be a nonnegative integer.");
    if (difficulty !== null && (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > 100)) throw new Error("Difficulty must be between 0 and 100.");
    const { rows } = await getPool().query(
      `INSERT INTO keywords (project_id, keyword, position, volume, difficulty) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, project_id AS "projectId", keyword, position, volume, difficulty, created_at AS "createdAt"`,
      [projectId, keyword, position, volume, difficulty],
    );
    return NextResponse.json({ keyword: rows[0] }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest) {
  if (!databaseAvailable) return errorResponse(new Error("Configure DATABASE_URL to modify keywords."), 503);
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return errorResponse(new Error("Keyword ID is required."));
  try {
    const { rowCount } = await getPool().query("DELETE FROM keywords WHERE id = $1", [id]);
    return NextResponse.json({ deleted: Boolean(rowCount) });
  } catch (error) { return errorResponse(error); }
}
