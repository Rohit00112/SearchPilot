import { NextResponse } from "next/server";

export function errorResponse(error: unknown, status = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unable to process request." },
    { status },
  );
}
