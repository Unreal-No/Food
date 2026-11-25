"use server";
import { z } from "zod";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { getDb, publish, schema as s } from "@/db";
import { notifyShop } from "@/lib/notify";
import { baht } from "@/lib/pricing";
import { getShop, loadCatalog, shopTag } from "@/lib/catalog";
import { priceLine } from "@/lib/pricing";
import { claimCoupon, evalCoupon } from "@/lib/coupons";

const Input = z.object({
  channel: z.enum(["dine_in", "takeaway"]),
  tableCode: z.string().max(10).default(""),
  customerName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(60),
  customerPhone: z.string().regex(/^(0\d{8,9})?$/, "เบอร์โทรไม่ถูกต้อง").default(""),
  tableToken: z.string().max(64).optional(),
  payment: z.enum(["promptpay", "counter"]).default("promptpay"),
  couponCode: z.string().max(30).default(""),
  note: z.string().max(200).default(""),
  items: z.array(z.object({
    productId: z.uuid(), variantId: z.uuid().optional(),
    optionIds: z.array(z.uuid()).max(20), qty: z.number().int().min(1).max(99),
  })).min(1, "ตะกร้าว่าง").max(50),
});

export async function placeOrder(slug: string, raw: unknown): Promise<{ id: string } | { error: string }> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;
  const shop = await getShop(slug);
  if (!shop) return { error: "ไม่พบร้าน" };
  if (input.tableToken) {
    // สั่งจาก QR โต๊ะ: เชื่อ token เท่านั้น ไม่เชื่อเลขโต๊ะที่ส่งมา
    const db0 = await getDb();
    const [t] = await db0.select().from(s.tables).where(and(eq(s.tables.token, input.tableToken), eq(s.tables.shopId, shop.id)));
    if (!t) return { error: "QR โต๊ะไม่ถูกต้อง กรุณาสแกนใหม่" };
    input.channel = "dine_in"; input.tableCode = t.code;
  }
  if (input.channel === "dine_in" && !input.tableCode) return { error: "กรุณาระบุโต๊ะ" };
  if (input.channel === "takeaway" && !input.customerPhone) return { error: "กรุณากรอกเบอร์โทร" };
  if (input.payment === "promptpay" && !shop.promptpayId) input.payment = "counter";
  const { products } = await loadCatalog(shop.id); // ราคาจากฐานข้อมูลเสมอ ไม่เชื่อราคาจาก client

  const lines: { p: (typeof products)[number]; it: (typeof input.items)[number]; r: ReturnType<typeof priceLine> }[] = [];
  for (const it of input.items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) return { error: "มีสินค้าที่ไม่พร้อมขาย กรุณาตรวจตะกร้า" };
    const r = priceLine(p, it);
    if (!r.ok) return { error: `${p.name}: ${r.errors[0]}` };
    lines.push({ p, it, r });
  }
  const subtotal = lines.reduce((a, l) => a + l.r.total, 0);
  const promo = input.couponCode.trim() ? await evalCoupon(shop.id, input.couponCode, subtotal) : null;
  if (promo && "error" in promo) return { error: `คูปอง: ${promo.error}` };
  const discount = promo?.discount ?? 0;
  const total = subtotal - discount;

  const db = await getDb();
  try {
    const order = await db.transaction(async (tx) => {
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.orders).where(eq(s.orders.shopId, shop.id));
      const [order] = await tx.insert(s.orders).values({
        shopId: shop.id, code: String(n + 1).padStart(4, "0"), channel: input.channel, payment: input.payment,
        tableCode: input.channel === "dine_in" ? input.tableCode : "", customerName: input.customerName,
        customerPhone: input.customerPhone, note: input.note, total, discount, couponCode: promo?.coupon.code ?? "",
      }).returning({ id: s.orders.id, code: s.orders.code });
      if (promo?.coupon) await claimCoupon(tx, promo.coupon.id);
      await tx.insert(s.orderItems).values(lines.map(({ p, it, r }) => ({
        orderId: order.id, productId: p.id, variantId: r.variant?.id, name: p.name,
        variantName: r.variant?.name ?? "", options: r.chosen, qty: it.qty, unitPrice: r.unitPrice,
      })));
      for (const { it, r } of lines) {
        if (r.variant?.stock == null) continue;
        const res = await tx.update(s.productVariants)
          .set({ stock: sql`${s.productVariants.stock} - ${it.qty}` })
          .where(and(eq(s.productVariants.id, r.variant.id), isNotNull(s.productVariants.stock), sql`${s.productVariants.stock} >= ${it.qty}`))
          .returning({ id: s.productVariants.id });
        if (!res.length) throw new Error(`${r.variant.name} หมดสต็อก`);
      }
      return order;
    });
    const id = order.id;
    await publish({ type: "order", shopId: shop.id, orderId: id, status: "pending_payment", code: order.code });
    after(() => notifyShop(shop.id, [
      `🛎️ ออเดอร์ใหม่ #${order.code} · ${input.channel === "dine_in" ? `โต๊ะ ${input.tableCode}` : "กลับบ้าน"} · ${input.payment === "counter" ? "จ่ายที่เคาน์เตอร์" : "PromptPay"}`,
      ...lines.map(({ p, it, r }) => `${it.qty}× ${p.name}${r.variant ? ` (${r.variant.name})` : ""}${r.chosen.length ? ` + ${r.chosen.map((c) => c.name).join(", ")}` : ""}`),
      `รวม ${baht(total)}${discount ? ` (ลด ${baht(discount)} ${promo?.coupon.code})` : ""} · ${input.customerName}`,
    ].join("\n")));
    if (lines.some((l) => l.r.variant?.stock != null)) updateTag(shopTag(slug));
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "สั่งไม่สำเร็จ" };
  }
}

/** พรีวิวส่วนลดที่หน้าชำระเงิน (ยอดจริงคำนวณใหม่ตอนสั่ง) */
export async function checkCoupon(slug: string, code: string, subtotal: number) {
  const shop = await getShop(slug);
  if (!shop || !code.trim() || !Number.isInteger(subtotal) || subtotal < 0) return { error: "ไม่พบคูปองนี้" };
  const r = await evalCoupon(shop.id, code, subtotal);
  return "error" in r ? { error: r.error } : { code: r.coupon.code, discount: r.discount };
}
