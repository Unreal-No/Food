import "server-only";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

// prod: DATABASE_URL (Supabase Postgres) · dev: PGlite ใน .data/ (ไม่ต้องติดตั้งอะไร)
type DB = ReturnType<typeof drizzlePg<typeof schema>>;

type Listen = (channel: string, cb: (payload: string) => void) => Promise<unknown>;
const g = globalThis as unknown as { __db?: Promise<DB>; __listen?: Listen; __bus?: { subs: Set<(e: AppEvent) => void>; ready?: Promise<unknown> } };

async function init(): Promise<DB> {
  if (process.env.DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL, { prepare: false });
    g.__listen = (ch, cb) => sql.listen(ch, cb);
    return drizzlePg(sql, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = path.join(process.cwd(), ".data/pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  g.__listen = (ch, cb) => client.listen(ch, cb);
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

/* ---------- realtime: Postgres LISTEN/NOTIFY → กระจายให้ผู้ฟังใน process (SSE) ---------- */
export type AppEvent = { type: "order"; shopId: string; orderId: string; status: string; code?: string };
const CHANNEL = "vs_events";

export async function publish(e: AppEvent) {
  const db = await getDb();
  await db.execute(sql`select pg_notify(${CHANNEL}, ${JSON.stringify(e)})`);
}

export async function subscribe(fn: (e: AppEvent) => void) {
  await getDb();
  const bus = (g.__bus ??= { subs: new Set() });
  bus.ready ??= g.__listen!(CHANNEL, (raw) => {
    let e: AppEvent;
    try { e = JSON.parse(raw); } catch { return; }
    bus.subs.forEach((f) => { try { f(e); } catch { /* ผู้ฟังตัวเดียวพังไม่กระทบตัวอื่น */ } });
  }).catch((err) => { bus.ready = undefined; throw err; });
  await bus.ready;
  bus.subs.add(fn);
  return () => { bus.subs.delete(fn); };
}

export { schema };
export type { DB };
