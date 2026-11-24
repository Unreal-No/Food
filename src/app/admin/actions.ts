"use server";
import { z } from "zod";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { redirect, unstable_rethrow } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema as s } from "@/db";
import { getShop, shopTag } from "@/lib/catalog";
import { endSession, requireAdmin, startSession } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";
import type { OrderStatus } from "@/db/schema";

type Result = { ok: true; id?: string } | { ok: false; error: string };
const satang = z.number().min(0).max(1_000_000).transform((b) => Math.round(b * 100));
const opt = z.uuid().optional();
const mediaUrl = z.string().max(300).regex(/^(\/media\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z]{3,4}|https:\/\/\S+)$/, "URL สื่อไม่ถูกต้อง");
const Params = z.record(z.string().max(20), z.string().max(20)).optional();
const Parts = z.array(z.string().max(30)).max(20).optional();
const VisualSchema = z.object({ preset: z.string().max(20).optional(), params: Params, show: Parts, hide: Parts, scale: z.number().min(0.5).max(2).optional() });
const MediaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("preset"), preset: z.string().max(20), params: Params, show: Parts }),
  z.object({ type: z.literal("glb"), url: mediaUrl }),
  z.object({ type: z.literal("turntable"), frames: z.array(mediaUrl).min(2, "ภาพหมุนต้องมีอย่างน้อย 2 เฟรม").max(72) }),
  z.object({ type: z.literal("photo"), url: mediaUrl }),
]);

async function ctx(slug: string) {
  await requireAdmin();
  const shop = await getShop(slug);
  if (!shop) throw new Error("ไม่พบร้าน");
  return { shop, db: await getDb() };
}
const fail = (e: unknown): Result => { unstable_rethrow(e); return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "ผิดพลาด" }; };
const done = (slug: string, id?: string): Result => { updateTag(shopTag(slug)); return { ok: true, id }; };

/* ---------- auth ---------- */
export async function login(_: unknown, fd: FormData) {
  if (!(await startSession(String(fd.get("password") ?? "")))) return { error: "รหัสผ่านไม่ถูกต้อง" };
  redirect("/admin");
}
export async function logout() {
  await endSession();
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
    const { shop, db } = await ctx(slug);
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
    const { shop, db } = await ctx(slug);
    await db.update(s.products).set({ status: z.enum(["active", "hidden", "soldout"]).parse(status) }).where(and(eq(s.products.id, id), eq(s.products.shopId, shop.id)));
    return done(slug);
  } catch (e) { return fail(e); }
}

export async function deleteProduct(slug: string, id: string): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug);
    await db.delete(s.products).where(and(eq(s.products.id, id), eq(s.products.shopId, shop.id)));
    return done(slug);
  } catch (e) { return fail(e); }
}

/* ---------- อัปโหลดสื่อ (ทีละไฟล์) ---------- */
const LIMIT: Record<string, number> = { glb: 15e6, image: 3e6 };
export async function uploadMedia(slug: string, fd: FormData): Promise<Result & { url?: string }> {
  try {
    const { shop } = await ctx(slug);
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
    const { shop, db } = await ctx(slug);
    const d = z.object({ id: opt, name: z.string().trim().min(1, "กรุณาใส่ชื่อหมวด").max(40), icon: z.string().max(8), sort: z.number().int() }).parse(raw);
    if (d.id) await db.update(s.categories).set(d).where(and(eq(s.categories.id, d.id), eq(s.categories.shopId, shop.id)));
    else await db.insert(s.categories).values({ ...d, shopId: shop.id });
    return done(slug);
  } catch (e) { return fail(e); }
}

export async function deleteCategory(slug: string, id: string): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug);
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
    const { shop, db } = await ctx(slug);
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
    const { shop, db } = await ctx(slug);
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
    const { shop, db } = await ctx(slug);
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
    const { shop, db } = await ctx(slug);
    await db.update(s.shops).set({ scene: SceneInput.parse(raw) }).where(eq(s.shops.id, shop.id));
    return done(slug);
  } catch (e) { return fail(e); }
}

/* ---------- ออเดอร์ ---------- */
export async function setOrderStatus(slug: string, id: string, status: OrderStatus): Promise<Result> {
  try {
    const { shop, db } = await ctx(slug);
    const st = z.enum(["pending_payment", "paid", "preparing", "ready", "completed", "cancelled"]).parse(status);
    await db.update(s.orders).set({ status: st }).where(and(eq(s.orders.id, id), eq(s.orders.shopId, shop.id)));
    return { ok: true };
  } catch (e) { return fail(e); }
}
