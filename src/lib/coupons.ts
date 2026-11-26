import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { baht } from "./pricing";

export type Coupon = typeof s.coupons.$inferSelect;
export const normCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");

/** ตรวจคูปอง (ไม่ตัดสิทธิ์) · subtotal = ยอดก่อนลด (สตางค์) */
export async function evalCoupon(shopId: string, code: string, subtotal: number, now = new Date()) {
  const db = await getDb();
  const [c] = await db.select().from(s.coupons).where(and(eq(s.coupons.shopId, shopId), eq(s.coupons.code, normCode(code))));
  if (!c || !c.active) return { error: "ไม่พบคูปองนี้" } as const;
  if (c.expiresAt && c.expiresAt < now) return { error: "คูปองหมดอายุแล้ว" } as const;
  if (c.maxUses !== null && c.used >= c.maxUses) return { error: "คูปองถูกใช้ครบแล้ว" } as const;
  if (subtotal < c.minTotal) return { error: `ขั้นต่ำ ${baht(c.minTotal)}` } as const;
  const discount = c.kind === "percent" ? Math.floor((subtotal * Math.min(c.value, 100)) / 100) : Math.min(c.value, subtotal);
  return { coupon: c, discount } as const;
}

type Tx = Parameters<Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]>[0];

/** ใช้สิทธิ์คูปอง 1 ครั้ง (ใน transaction เดียวกับการสร้างออเดอร์) — กันใช้เกินจำนวนเมื่อสั่งพร้อมกัน */
export async function claimCoupon(tx: Tx, couponId: string) {
  const r = await tx.update(s.coupons).set({ used: sql`${s.coupons.used} + 1` })
    .where(and(eq(s.coupons.id, couponId), eq(s.coupons.active, true), sql`(${s.coupons.maxUses} is null or ${s.coupons.used} < ${s.coupons.maxUses})`))
    .returning({ id: s.coupons.id });
  if (!r.length) throw new Error("คูปองถูกใช้ครบแล้ว");
}

export const pointsFor = (total: number) => Math.floor(total / 1000); // 1 แต้ม / ฿10
export const POINT_VALUE = 50; // 1 แต้ม = 50 สตางค์ (10 แต้ม = ฿5)
/** แต้มที่ใช้ได้กับบิลนี้: ทีละ 10 แต้ม ลดได้ไม่เกินครึ่งหนึ่งของยอด */
export const redeemable = (points: number, total: number) => Math.floor(Math.min(points, Math.floor(total / 2 / POINT_VALUE)) / 10) * 10;
