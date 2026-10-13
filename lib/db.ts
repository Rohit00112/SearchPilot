import { Pool } from "pg";

declare global {
  var searchpilotPool: Pool | undefined;
}

export const databaseAvailable = Boolean(process.env.DATABASE_URL);

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured to enable persistence.");
  }
  if (!global.searchpilotPool) {
    global.searchpilotPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: true } : undefined,
    });
  }
  return global.searchpilotPool;
}

export function normalizeDomain(value: string): string {
  const raw = value.trim();
  if (!raw || raw.length > 253) throw new Error("Enter a valid domain.");
  let hostname: string;
  try {
    hostname = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.toLowerCase();
  } catch {
    throw new Error("Enter a valid domain.");
  }
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)) {
    throw new Error("Enter a valid public domain, such as example.com.");
  }
  return hostname;
}
