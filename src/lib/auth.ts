import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";

// P0: รหัสผ่านเดียวสำหรับเจ้าของร้าน · P3 จะเปลี่ยนเป็น Supabase Auth + staff roles
const COOKIE = "vs_admin";
const TTL = 60 * 60 * 24 * 7;

function password() {
  const p = process.env.ADMIN_PASSWORD;
  if (p) return p;
  if (process.env.NODE_ENV === "production") throw new Error("ต้องตั้ง ADMIN_PASSWORD");
  return "admin";
}
const secret = () => process.env.AUTH_SECRET ?? `dev:${password()}`;
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");

function safeEq(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function isAdmin() {
  await connection();
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  return !!sig && safeEq(sig, sign(exp)) && Number(exp) > Date.now() / 1000;
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function startSession(pw: string) {
  if (!safeEq(pw, password())) return false;
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL,
  });
  return true;
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}
