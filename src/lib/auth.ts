import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyPassword } from "./password";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import type { Role } from "@/db/schema";
import { getShop } from "./catalog";
import { PERMS, type Perm } from "./perms";

// เข้าระบบ: พนักงาน (username/password ในตาราง staff) หรือผู้ดูแลระบบ (username "admin" + ADMIN_PASSWORD)
const COOKIE = "vs_admin";
const TTL = 60 * 60 * 12;

function adminPassword() {
  const p = process.env.ADMIN_PASSWORD;
  if (p) return p;
  if (process.env.NODE_ENV === "production") throw new Error("ต้องตั้ง ADMIN_PASSWORD");
  return "admin";
}
const secret = () => process.env.AUTH_SECRET ?? `dev:${adminPassword()}`;
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
function safeEq(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export type Session = { super: true; name: string } | { super: false; id: string; shopId: string; role: Role; name: string };

export async function getSession(): Promise<Session | null> {
  await connection();
  const v = (await cookies()).get(COOKIE)?.value;
  const [sub, exp, sig] = v?.split(".") ?? [];
  if (!sig || !safeEq(sig, sign(`${sub}.${exp}`)) || Number(exp) < Date.now() / 1000) return null;
  if (sub === "super") return { super: true, name: "ผู้ดูแลระบบ" };
  const db = await getDb();
  const [u] = await db.select().from(s.staff).where(and(eq(s.staff.id, sub), eq(s.staff.active, true)));
  return u ? { super: false, id: u.id, shopId: u.shopId, role: u.role, name: u.name } : null;
}

export async function requireSession() {
  const ses = await getSession();
  if (!ses) redirect("/admin/login");
  return ses;
}

export const can = (ses: Session, perm: Perm) => ses.super || PERMS[ses.role].includes(perm);

/** ตรวจว่าเข้าร้านนี้ได้และมีสิทธิ์ perm · ไม่มีสิทธิ์ = 404 (ไม่บอกว่าร้านมีอยู่) */
export async function requireShop(slug: string, perm: Perm) {
  const ses = await requireSession();
  const shop = await getShop(slug);
  if (!shop || (!ses.super && ses.shopId !== shop.id) || !can(ses, perm)) notFound();
  return { ses, shop };
}

export async function login(username: string, pw: string) {
  username = username.trim().toLowerCase();
  let sub: string | null = null;
  if (username === "admin") sub = safeEq(pw, adminPassword()) ? "super" : null;
  else {
    const db = await getDb();
    const [u] = await db.select().from(s.staff).where(and(eq(s.staff.username, username), eq(s.staff.active, true)));
    sub = u && (await verifyPassword(pw, u.passwordHash)) ? u.id : null;
  }
  if (!sub) return false;
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  (await cookies()).set(COOKIE, `${sub}.${exp}.${sign(`${sub}.${exp}`)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL,
  });
  return true;
}

export async function logoutSession() {
  (await cookies()).delete(COOKIE);
}
