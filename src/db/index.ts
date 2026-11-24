import "server-only";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import * as schema from "./schema";

// prod: DATABASE_URL (Supabase Postgres) · dev: PGlite ใน .data/ (ไม่ต้องติดตั้งอะไร)
type DB = ReturnType<typeof drizzlePg<typeof schema>>;

const g = globalThis as unknown as { __db?: Promise<DB> };

async function init(): Promise<DB> {
  if (process.env.DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    return drizzlePg(postgres(process.env.DATABASE_URL, { prepare: false }), { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = path.join(process.cwd(), ".data/pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzleLite(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(db as unknown as DB);
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  g.__db ??= init().catch((e) => { g.__db = undefined; throw e; });
  return g.__db;
}

export { schema };
export type { DB };
