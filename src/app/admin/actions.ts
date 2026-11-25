"use server";
import { z } from "zod";
import { and, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { redirect, unstable_rethrow } from "next/navigation";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { getDb, publish, schema as s } from "@/db";
import { shopTag } from "@/lib/catalog";
import { can, login as doLogin, logoutSession, requireSession, requireShop } from "@/lib/auth";
import type { Perm } from "@/lib/perms";
import { saveUpload } from "@/lib/storage";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/password";
import { notifyShop } from "@/lib/notify";
import { seal } from "@/lib/secret";
import { normCode, pointsFor } from "@/lib/coupons";
import type { OrderStatus } from "@/db/schema";

type Result = { ok: true; id?: string } | { ok: false; error: string };
const satang = z.number().min(0).max(1_000_000).transform((b) => Math.round(b * 100));
const opt = z.uuid().optional();
const mediaUrl = z.string().max(300).regex(/^(\/media\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z]{3,4}|https?:\/\/\S+)$/, "URL สื่อไม่ถูกต้อง");
const Params = z.record(z.string().max(20), z.string().max(20)).optional();
const Parts = z.array(z.string().max(30)).max(20).optional();
const VisualSchema = z.object({ preset: z.string().max(20).optional(), params: Params, show: Parts, hide: Parts, scale: z.number().min(0.5).max(2).optional() });
const MediaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("preset"), preset: z.string().max(20), params: Params, show: Parts }),
  z.object({ type: z.literal("glb"), url: mediaUrl }),
  z.object({ type: z.literal("turntable"), frames: z.array(mediaUrl).min(2, "ภาพหมุนต้องมีอย่างน้อย 2 เฟรม").max(72) }),
  z.object({ type: z.literal("photo"), url: mediaUrl }),
]);

async function ctx(slug: string, perm: Perm) {
  const { ses, shop } = await requireShop(slug, perm);
  return { ses, shop, db: await getDb() };
}
const fail = (e: unknown): Result => { unstable_rethrow(e); return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "ผิดพลาด" }; };
const done = (slug: string, id?: string): Result => { updateTag(shopTag(slug)); return { ok: true, id }; };

/* ---------- auth ---------- */
export async function login(_: unknown, fd: FormData) {
  if (!(await doLogin(String(fd.get("username") ?? ""), String(fd.get("password") ?? "")))) return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  redirect("/admin");
}
export async function logout() {
  await logoutSession();
  redirect("/admin/login");
}

/* ---------- สินค้า ---------- */
const ProductInput = z.object({
  id: opt, categoryId: z.uuid().nullable(), name: z.string().trim().min(1, "กรุณาใส่ชื่อสินค้า").max(80),
  description: z.string().max(300), emoji: z.string().max(8), badge: z.string().max(20),
  basePrice: satang, status: z.enum(["active", "hidden", "soldout"]),
  variants: z.array(z.object({ id: opt, name: z.string().trim().min(1, "ชื่อแบบห้ามว่าง").max(40), price: satang, stock: z.number().int().min(0).nullable(), visual: VisualSchema.default({}) })).max(20),
  media: z.array(MediaSchema).max(1),
  groupIds: z.array(z.uuid()).max(20),
});

export async function saveProduct(slug: string, raw: unknown): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "catalog");
    const d = ProductInput.parse(raw);
    const id = await db.transaction(async (tx) => {
      const fields = {
        categoryId: d.categoryId, name: d.name, description: d.description, emoji: d.emoji || "🍽️",
        badge: d.badge, basePrice: d.variants.length ? Math.min(...d.variants.map((v) => v.price)) : d.basePrice, status: d.status, media: d.media,
      };
      let pid = d.id;
      if (pid) {
        const r = await tx.update(s.products).set(fields).where(and(eq(s.products.id, pid), eq(s.products.shopId, shop.id))).returning({ id: s.products.id });
        if (!r.length) throw new Error("ไม่พบสินค้า");
      } else {
        [{ id: pid }] = await tx.insert(s.products).values({ ...fields, shopId: shop.id, sort: Date.now() % 1e9 }).returning({ id: s.products.id });
      }
      // variants: อัปเดตตัวเดิม เพิ่มตัวใหม่ ลบตัวที่เอาออก (order_items เก็บ snapshot ไว้แล้ว)
      const keep = d.variants.flatMap((v) => (v.id ? [v.id] : []));
      await tx.delete(s.productVariants).where(and(eq(s.productVariants.productId, pid!), keep.length ? notInArray(s.productVariants.id, keep) : undefined));
      for (const [i, v] of d.variants.entries()) {
        const row = { name: v.name, price: v.price, stock: v.stock, visual: v.visual, sort: i };
        if (v.id) await tx.update(s.productVariants).set(row).where(and(eq(s.productVariants.id, v.id), eq(s.productVariants.productId, pid!)));
        else await tx.insert(s.productVariants).values({ ...row, productId: pid! });
      }
      // option groups ต้องเป็นของร้านนี้เท่านั้น
      const valid = d.groupIds.length
        ? (await tx.select({ id: s.optionGroups.id }).from(s.optionGroups).where(and(eq(s.optionGroups.shopId, shop.id), inArray(s.optionGroups.id, d.groupIds)))).map((g) => g.id)
        : [];
      await tx.delete(s.productOptionGroups).where(eq(s.productOptionGroups.productId, pid!));
      const links = d.groupIds.filter((g) => valid.includes(g)).map((groupId, i) => ({ productId: pid!, groupId, sort: i }));
      if (links.length) await tx.insert(s.productOptionGroups).values(links);
      return pid!;
    });
    return done(slug, id);
  } catch (e) { return fail(e); }
}

export async function setProductStatus(slug: string, id: string, status: "active" | "hidden" | "soldout"): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "catalog");
    await db.update(s.products).set({ status: z.enum(["active", "hidden", "soldout"]).parse(status) }).where(and(eq(s.products.id, id), eq(s.products.shopId, shop.id)));
    return done(slug);
  } catch (e) { return fail(e); }
}

export async function deleteProduct(slug: string, id: string): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "catalog");
    await db.delete(s.products).where(and(eq(s.products.id, id), eq(s.products.shopId, shop.id)));
    return done(slug);
  } catch (e) { return fail(e); }
}

/* ---------- อัปโหลดสื่อ (ทีละไฟล์) ---------- */
const LIMIT: Record<string, number> = { glb: 15e6, image: 3e6 };
export async function uploadMedia(slug: string, fd: FormData): Promise<Result & { url?: string }> {
  try {
    const { shop } = await ctx(slug, "catalog");
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("ไม่พบไฟล์");
    const kind = file.name.toLowerCase().endsWith(".glb") ? "glb" : "image";
    if (file.size > LIMIT[kind]) throw new Error(`${file.name} ใหญ่เกิน ${LIMIT[kind] / 1e6}MB`);
    return { ok: true, url: await saveUpload(shop.id, file) };
  } catch (e) { return fail(e); }
}

/* ---------- หมวดหมู่ ---------- */
export async function saveCategory(slug: string, raw: unknown): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "catalog");
    const d = z.object({ id: opt, name: z.string().trim().min(1, "กรุณาใส่ชื่อหมวด").max(40), icon: z.string().max(8), sort: z.number().int() }).parse(raw);
    if (d.id) await db.update(s.categories).set(d).where(and(eq(s.categories.id, d.id), eq(s.categories.shopId, shop.id)));
    else await db.insert(s.categories).values({ ...d, shopId: shop.id });
    return done(slug);
  } catch (e) { return fail(e); }
}

export async function deleteCategory(slug: string, id: string): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "catalog");
    await db.delete(s.categories).where(and(eq(s.categories.id, id), eq(s.categories.shopId, shop.id)));
    return done(slug);
  } catch (e) { return fail(e); }
}

/* ---------- กลุ่มตัวเลือกเสริม ---------- */
const GroupInput = z.object({
  id: opt, name: z.string().trim().min(1, "กรุณาใส่ชื่อกลุ่ม").max(40),
  minSelect: z.number().int().min(0).max(20), maxSelect: z.number().int().min(1).max(20),
  options: z.array(z.object({ id: opt, name: z.string().trim().min(1, "ชื่อตัวเลือกห้ามว่าง").max(40), priceDelta: satang, isDefault: z.boolean(), isAvailable: z.boolean(), visual: VisualSchema.default({}) })).min(1, "ต้องมีอย่างน้อย 1 ตัวเลือก").max(30),
}).refine((g) => g.minSelect <= g.maxSelect, "ขั้นต่ำต้องไม่เกินสูงสุด");

export async function saveOptionGroup(slug: string, raw: unknown): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "catalog");
    const d = GroupInput.parse(raw);
    const id = await db.transaction(async (tx) => {
      const fields = { name: d.name, minSelect: d.minSelect, maxSelect: d.maxSelect };
      let gid = d.id;
      if (gid) {
        const r = await tx.update(s.optionGroups).set(fields).where(and(eq(s.optionGroups.id, gid), eq(s.optionGroups.shopId, shop.id))).returning({ id: s.optionGroups.id });
        if (!r.length) throw new Error("ไม่พบกลุ่ม");
      } else {
        [{ id: gid }] = await tx.insert(s.optionGroups).values({ ...fields, shopId: shop.id, sort: Date.now() % 1e9 }).returning({ id: s.optionGroups.id });
      }
      const keep = d.options.flatMap((o) => (o.id ? [o.id] : []));
      await tx.delete(s.options).where(and(eq(s.options.groupId, gid!), keep.length ? notInArray(s.options.id, keep) : undefined));
      for (const [i, o] of d.options.entries()) {
        const row = { name: o.name, priceDelta: o.priceDelta, isDefault: o.isDefault, isAvailable: o.isAvailable, visual: o.visual, sort: i };
        if (o.id) await tx.update(s.options).set(row).where(and(eq(s.options.id, o.id), eq(s.options.groupId, gid!)));
        else await tx.insert(s.options).values({ ...row, groupId: gid! });
      }
      return gid!;
    });
    return done(slug, id);
  } catch (e) { return fail(e); }
}

export async function deleteOptionGroup(slug: string, id: string): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "catalog");
    await db.delete(s.optionGroups).where(and(eq(s.optionGroups.id, id), eq(s.optionGroups.shopId, shop.id)));
    return done(slug);
  } catch (e) { return fail(e); }
}

/* ---------- ตั้งค่าร้าน ---------- */
const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "สีไม่ถูกต้อง");
const time = z.string().regex(/^\d{2}:\d{2}$/);
const SettingsInput = z.object({
  name: z.string().trim().min(1).max(60), tagline: z.string().max(120), type: z.enum(["cafe", "restaurant", "retail"]),
  promptpayId: z.string().regex(/^(\d{10}|\d{13})?$/, "PromptPay ต้องเป็นเบอร์ 10 หลัก หรือเลข 13 หลัก"),
  hours: z.object({ open: time, close: time, days: z.array(z.number().int().min(0).max(6)) }),
  theme: z.object({ primary: hex, accent: hex, bg: hex, surface: hex, text: hex, font: z.enum(["modern", "classic"]), heroEmoji: z.string().max(8) }),
});

export async function saveSettings(slug: string, raw: unknown): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "settings");
    await db.update(s.shops).set(SettingsInput.parse(raw)).where(eq(s.shops.id, shop.id));
    updateTag("shops");
    return done(slug);
  } catch (e) { return fail(e); }
}

/* ---------- ฉากร้าน 3D ---------- */
const SceneInput = z.object({
  template: z.enum(["cafe", "restaurant", "retail"]), wall: hex.optional(), floor: hex.optional(),
  slots: z.array(z.union([z.uuid(), z.literal(""), z.literal("-")])).max(40),
});
export async function saveScene(slug: string, raw: unknown): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "scene");
    await db.update(s.shops).set({ scene: SceneInput.parse(raw) }).where(eq(s.shops.id, shop.id));
    return done(slug);
  } catch (e) { return fail(e); }
}

/* ---------- ออเดอร์ ---------- */
export async function setOrderStatus(slug: string, id: string, status: OrderStatus): Promise<Result> {
  try {
    const st = z.enum(["pending_payment", "paid", "preparing", "ready", "completed", "cancelled"]).parse(status);
    const { ses, shop, db } = await ctx(slug, "kitchen");
    if (!can(ses, "orders") && st !== "preparing" && st !== "ready") throw new Error("ครัวเปลี่ยนได้เฉพาะ กำลังทำ/พร้อมเสิร์ฟ");
    const [prev] = await db.select({ status: s.orders.status }).from(s.orders).where(and(eq(s.orders.id, id), eq(s.orders.shopId, shop.id)));
    if (!prev) throw new Error("ไม่พบออเดอร์");
    const [o] = await db.update(s.orders).set({ status: st }).where(and(eq(s.orders.id, id), eq(s.orders.shopId, shop.id)))
      .returning({ code: s.orders.code, phone: s.orders.customerPhone, name: s.orders.customerName, total: s.orders.total });
    if (!o) throw new Error("ไม่พบออเดอร์");
    if (st === "completed" && prev.status !== "completed" && o.phone) {
      // สะสมแต้มสมาชิก (ครั้งเดียวต่อออเดอร์)
      const pts = pointsFor(o.total);
      await db.insert(s.customers).values({ shopId: shop.id, phone: o.phone, name: o.name, points: pts, totalSpent: o.total, visits: 1 })
        .onConflictDoUpdate({ target: [s.customers.shopId, s.customers.phone], set: {
          points: sql`${s.customers.points} + ${pts}`, totalSpent: sql`${s.customers.totalSpent} + ${o.total}`,
          visits: sql`${s.customers.visits} + 1`, lastVisit: sql`now()`, name: o.name,
        } });
    }
    await publish({ type: "order", shopId: shop.id, orderId: id, status: st, code: o.code });
    if (st === "paid") after(() => notifyShop(shop.id, `💰 รับเงินแล้ว #${o.code}`));
    return { ok: true };
  } catch (e) { return fail(e); }
}

/* ---------- โต๊ะ & QR ---------- */
const token = () => randomBytes(12).toString("base64url");
/** "A1-A6, B1, VIP" → ["A1".."A6","B1","VIP"] */
function parseCodes(raw: string) {
  return raw.split(/[,\s]+/).filter(Boolean).flatMap((part) => {
    const m = part.match(/^([A-Za-z]*)(\d+)-\1?(\d+)$/);
    if (!m) return [part];
    const [a, b] = [Number(m[2]), Number(m[3])].sort((x, y) => x - y);
    return Array.from({ length: Math.min(b - a + 1, 100) }, (_, i) => `${m[1]}${a + i}`);
  }).map((c) => c.toUpperCase().slice(0, 10));
}
export async function addTables(slug: string, raw: string): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "tables");
    const codes = [...new Set(parseCodes(z.string().max(500).parse(raw)))];
    if (!codes.length || codes.length > 100) throw new Error("ใส่เลขโต๊ะ 1–100 โต๊ะ เช่น A1-A6, B1");
    const have = new Set((await db.select({ c: s.tables.code }).from(s.tables).where(eq(s.tables.shopId, shop.id))).map((r) => r.c));
    const add = codes.filter((c) => !have.has(c));
    if (add.length) await db.insert(s.tables).values(add.map((code) => ({ shopId: shop.id, code, token: token() })));
    return { ok: true };
  } catch (e) { return fail(e); }
}
export async function deleteTable(slug: string, id: string): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "tables");
    await db.delete(s.tables).where(and(eq(s.tables.id, id), eq(s.tables.shopId, shop.id)));
    return { ok: true };
  } catch (e) { return fail(e); }
}
/** เปลี่ยน QR (QR เก่าใช้ไม่ได้ทันที) */
export async function rotateTable(slug: string, id: string): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "tables");
    await db.update(s.tables).set({ token: token() }).where(and(eq(s.tables.id, id), eq(s.tables.shopId, shop.id)));
    return { ok: true };
  } catch (e) { return fail(e); }
}

/* ---------- พนักงาน ---------- */
const StaffInput = z.object({
  id: opt, name: z.string().trim().min(1, "กรุณาใส่ชื่อ").max(40),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, "ชื่อผู้ใช้ a-z 0-9 . _ - (3–32 ตัว)").refine((u) => u !== "admin", "ห้ามใช้ชื่อ admin"),
  password: z.string().max(72).optional(),
  role: z.enum(["owner", "manager", "cashier", "kitchen"]), active: z.boolean(),
});
export async function saveStaff(slug: string, raw: unknown): Promise<Result> {
  try {
    const { ses, shop, db } = await ctx(slug, "staff");
    const d = StaffInput.parse(raw);
    if (d.password && d.password.length < 8) throw new Error("รหัสผ่านอย่างน้อย 8 ตัว");
    const [dup] = await db.select({ id: s.staff.id }).from(s.staff).where(and(eq(s.staff.username, d.username), d.id ? ne(s.staff.id, d.id) : undefined));
    if (dup) throw new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
    const self = !ses.super && ses.id === d.id;
    const fields = { name: d.name, username: d.username, ...(self ? {} : { role: d.role, active: d.active }), ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}) };
    if (d.id) {
      const r = await db.update(s.staff).set(fields).where(and(eq(s.staff.id, d.id), eq(s.staff.shopId, shop.id))).returning({ id: s.staff.id });
      if (!r.length) throw new Error("ไม่พบพนักงาน");
    } else {
      if (!d.password) throw new Error("กรุณาตั้งรหัสผ่าน");
      await db.insert(s.staff).values({ shopId: shop.id, name: d.name, username: d.username, role: d.role, active: d.active, passwordHash: await hashPassword(d.password) });
    }
    return { ok: true };
  } catch (e) { return fail(e); }
}
export async function deleteStaff(slug: string, id: string): Promise<Result> {
  try {
    const { ses, shop, db } = await ctx(slug, "staff");
    if (!ses.super && ses.id === id) throw new Error("ลบบัญชีตัวเองไม่ได้");
    await db.delete(s.staff).where(and(eq(s.staff.id, id), eq(s.staff.shopId, shop.id)));
    return { ok: true };
  } catch (e) { return fail(e); }
}

/* ---------- LINE แจ้งเตือน (token เก็บฝั่ง server เท่านั้น) ---------- */
export async function saveLine(slug: string, raw: unknown): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "settings");
    const d = z.object({ lineTo: z.string().trim().max(64), lineToken: z.string().trim().max(400).optional(), clear: z.boolean().optional() }).parse(raw);
    const cur = shop.integrations ?? {};
    const next = d.clear ? {} : { ...cur, lineTo: d.lineTo, ...(d.lineToken ? { lineToken: seal(d.lineToken) } : {}) };
    await db.update(s.shops).set({ integrations: next }).where(eq(s.shops.id, shop.id));
    return { ok: true };
  } catch (e) { return fail(e); }
}
export async function testLine(slug: string): Promise<Result> {
  try {
    const { shop } = await ctx(slug, "settings");
    if (!(await notifyShop(shop.id, `✅ ทดสอบแจ้งเตือนจาก ${shop.name}`))) throw new Error("ส่งไม่สำเร็จ ตรวจ token / ผู้รับ");
    return { ok: true };
  } catch (e) { return fail(e); }
}

/* ---------- หน้าร้าน: ตรวจ QR โต๊ะ (สาธารณะ) ---------- */
export async function lookupTable(slug: string, tableToken: string) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(tableToken)) return null;
  const db = await getDb();
  const [t] = await db.select({ code: s.tables.code }).from(s.tables).innerJoin(s.shops, eq(s.shops.id, s.tables.shopId))
    .where(and(eq(s.tables.token, tableToken), eq(s.shops.slug, slug)));
  return t?.code ?? null;
}

/* ---------- คูปอง ---------- */
const CouponInput = z.object({
  id: opt, code: z.string().transform(normCode).pipe(z.string().regex(/^[A-Z0-9_-]{3,20}$/, "รหัสคูปอง A-Z 0-9 (3–20 ตัว)")),
  kind: z.enum(["percent", "amount"]), value: z.number().positive("ส่วนลดต้องมากกว่า 0"),
  minTotal: z.number().min(0).default(0), maxUses: z.number().int().positive().nullable(),
  expiresAt: z.string().nullable(), active: z.boolean(),
}).refine((c) => c.kind !== "percent" || c.value <= 100, "ลดได้ไม่เกิน 100%");
export async function saveCoupon(slug: string, raw: unknown): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "marketing");
    const d = CouponInput.parse(raw);
    const row = {
      code: d.code, kind: d.kind, value: d.kind === "percent" ? Math.round(d.value) : Math.round(d.value * 100),
      minTotal: Math.round(d.minTotal * 100), maxUses: d.maxUses, active: d.active,
      expiresAt: d.expiresAt ? new Date(`${d.expiresAt}T23:59:59+07:00`) : null,
    };
    const [dup] = await db.select({ id: s.coupons.id }).from(s.coupons).where(and(eq(s.coupons.shopId, shop.id), eq(s.coupons.code, d.code), d.id ? ne(s.coupons.id, d.id) : undefined));
    if (dup) throw new Error("มีรหัสคูปองนี้แล้ว");
    if (d.id) await db.update(s.coupons).set(row).where(and(eq(s.coupons.id, d.id), eq(s.coupons.shopId, shop.id)));
    else await db.insert(s.coupons).values({ ...row, shopId: shop.id });
    return { ok: true };
  } catch (e) { return fail(e); }
}
export async function deleteCoupon(slug: string, id: string): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug, "marketing");
    await db.delete(s.coupons).where(and(eq(s.coupons.id, id), eq(s.coupons.shopId, shop.id)));
    return { ok: true };
  } catch (e) { return fail(e); }
}

/* ---------- สร้างร้านใหม่ (ผู้ดูแลระบบเท่านั้น) ---------- */
const PRESET = {
  cafe: { theme: { primary: "#6b3e26", accent: "#d9a066", bg: "#f7f1e8", surface: "#fffaf3", text: "#2a1a12", font: "classic" as const, heroEmoji: "☕" }, hours: { open: "07:00", close: "18:00", days: [0, 1, 2, 3, 4, 5, 6] } },
  restaurant: { theme: { primary: "#c2410c", accent: "#facc15", bg: "#fff7ed", surface: "#ffffff", text: "#1c1917", font: "modern" as const, heroEmoji: "🍳" }, hours: { open: "10:00", close: "21:00", days: [1, 2, 3, 4, 5, 6] } },
  retail: { theme: { primary: "#1e1b4b", accent: "#a78bfa", bg: "#f5f5f4", surface: "#ffffff", text: "#0c0a09", font: "modern" as const, heroEmoji: "🛍️" }, hours: { open: "10:00", close: "20:00", days: [0, 1, 2, 3, 4, 5, 6] } },
};
const RESERVED = new Set(["admin", "api", "media", "_next", "login", "static"]);
const ShopInput = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อร้าน").max(60),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,30}$/, "ลิงก์ร้าน a-z 0-9 - (3–30 ตัว)").refine((v) => !RESERVED.has(v), "ชื่อนี้สงวนไว้"),
  type: z.enum(["cafe", "restaurant", "retail"]),
  ownerName: z.string().trim().min(1).max(40),
  ownerUsername: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, "ชื่อผู้ใช้ a-z 0-9 . _ - (3–32 ตัว)").refine((u) => u !== "admin", "ห้ามใช้ชื่อ admin"),
  ownerPassword: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัว").max(72),
});
export async function createShop(raw: unknown): Promise<Result & { slug?: string }> {
  try {
    const ses = await requireSession();
    if (!ses.super) throw new Error("เฉพาะผู้ดูแลระบบ");
    const d = ShopInput.parse(raw);
    const db = await getDb();
    if ((await db.select({ id: s.shops.id }).from(s.shops).where(eq(s.shops.slug, d.slug))).length) throw new Error("ลิงก์ร้านนี้ถูกใช้แล้ว");
    if ((await db.select({ id: s.staff.id }).from(s.staff).where(eq(s.staff.username, d.ownerUsername))).length) throw new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
    const hash = await hashPassword(d.ownerPassword);
    await db.transaction(async (tx) => {
      const [shop] = await tx.insert(s.shops).values({ slug: d.slug, name: d.name, type: d.type, ...PRESET[d.type] }).returning({ id: s.shops.id });
      await tx.insert(s.staff).values({ shopId: shop.id, name: d.ownerName, username: d.ownerUsername, role: "owner", passwordHash: hash });
    });
    updateTag("shops");
    return { ok: true, slug: d.slug };
  } catch (e) { return fail(e); }
}
