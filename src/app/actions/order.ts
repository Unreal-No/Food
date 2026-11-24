"use server";
import { z } from "zod";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { getDb, schema as s } from "@/db";
import { getShop, loadCatalog, shopTag } from "@/lib/catalog";
import { priceLine } from "@/lib/pricing";

const Input = z.object({
  channel: z.enum(["dine_in", "takeaway"]),
  tableCode: z.string().max(10).default(""),
  customerName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(60),
  customerPhone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง"),
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
  if (input.channel === "dine_in" && !input.tableCode) return { error: "กรุณาระบุโต๊ะ" };

  const shop = await getShop(slug);
  if (!shop) return { error: "ไม่พบร้าน" };
  const { products } = await loadCatalog(shop.id); // ราคาจากฐานข้อมูลเสมอ ไม่เชื่อราคาจาก client

  const lines: { p: (typeof products)[number]; it: (typeof input.items)[number]; r: ReturnType<typeof priceLine> }[] = [];
  for (const it of input.items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) return { error: "มีสินค้าที่ไม่พร้อมขาย กรุณาตรวจตะกร้า" };
    const r = priceLine(p, it);
    if (!r.ok) return { error: `${p.name}: ${r.errors[0]}` };
    lines.push({ p, it, r });
  }
  const total = lines.reduce((a, l) => a + l.r.total, 0);

  const db = await getDb();
  try {
    const id = await db.transaction(async (tx) => {
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.orders).where(eq(s.orders.shopId, shop.id));
      const [order] = await tx.insert(s.orders).values({
        shopId: shop.id, code: String(n + 1).padStart(4, "0"), channel: input.channel,
        tableCode: input.channel === "dine_in" ? input.tableCode : "", customerName: input.customerName,
        customerPhone: input.customerPhone, note: input.note, total,
      }).returning({ id: s.orders.id });
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
      return order.id;
    });
    if (lines.some((l) => l.r.variant?.stock != null)) updateTag(shopTag(slug));
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "สั่งไม่สำเร็จ" };
  }
}
