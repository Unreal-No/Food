"use server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { getDb, schema as s } from "@/db";
import { requireShop } from "@/lib/auth";
import { shopTag } from "@/lib/catalog";
import { ai, aiEnabled, MODELS, rateLimit } from "@/lib/ai";

// ผลลัพธ์จากรูปเมนู (ราคาเป็นบาท)
const Extracted = z.object({
  categories: z.array(z.object({
    name: z.string(), icon: z.string().describe("emoji 1 ตัวแทนหมวด"),
    items: z.array(z.object({
      name: z.string(), description: z.string().describe("คำบรรยายสั้น ถ้าไม่มีในรูปให้เว้นว่าง"),
      price: z.number().describe("ราคาเริ่มต้น (บาท) ถ้าไม่มีให้ 0"), emoji: z.string(),
      variants: z.array(z.object({ name: z.string(), price: z.number() })).describe("ขนาด/แบบที่ราคาต่างกัน เช่น ร้อน/เย็น, S/M/L"),
    })),
  })),
});
export type ExtractedMenu = z.infer<typeof Extracted>;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export async function extractMenu(slug: string, fd: FormData): Promise<{ ok: true; menu: ExtractedMenu } | { ok: false; error: string }> {
  try {
    const { ses } = await requireShop(slug, "catalog");
    if (!aiEnabled()) throw new Error("ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY");
    if (!rateLimit(`menu:${ses.super ? "super" : ses.id}`, 10, 60 * 60_000)) throw new Error("ใช้ครบ 10 ครั้ง/ชั่วโมงแล้ว");
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("ไม่พบรูป");
    if (!TYPES.includes(file.type as (typeof TYPES)[number])) throw new Error("รองรับ JPG, PNG, WebP, GIF");
    if (file.size > 5e6) throw new Error("รูปใหญ่เกิน 5MB");

    const r = await ai().beta.messages.parse({
      model: MODELS.menuImport,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // ถูกปฏิเสธโดยระบบความปลอดภัย → API ลองรุ่นสำรองให้เอง
      system: "คุณอ่านรูปเมนูร้านอาหาร/คาเฟ่ แล้วแปลงเป็นข้อมูลสินค้า ตามที่เห็นในรูปเท่านั้น ห้ามเดา ใช้ภาษาเดียวกับเมนู",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: file.type as (typeof TYPES)[number], data: Buffer.from(await file.arrayBuffer()).toString("base64") } },
          { type: "text", text: "ดึงทุกเมนูจากรูปนี้ จัดเป็นหมวด ราคาเป็นบาท ถ้าเมนูมีหลายราคา (เช่น ร้อน/เย็น หรือ ขนาด) ใส่ใน variants" },
        ],
      }],
      output_config: { format: betaZodOutputFormat(Extracted) },
    });
    if (r.stop_reason === "refusal") throw new Error("ไม่สามารถอ่านรูปนี้ได้");
    if (!r.parsed_output) throw new Error("อ่านเมนูไม่สำเร็จ ลองรูปที่ชัดขึ้น");
    return { ok: true, menu: r.parsed_output };
  } catch (e) {
    unstable_rethrow(e);
    console.warn("[menu-import]", e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof Error ? e.message : "ผิดพลาด" };
  }
}

const Import = z.array(z.object({
  category: z.string().trim().min(1).max(40), icon: z.string().max(8),
  name: z.string().trim().min(1).max(80), description: z.string().max(300), emoji: z.string().max(8),
  price: z.number().min(0).max(100000), variants: z.array(z.object({ name: z.string().trim().min(1).max(40), price: z.number().min(0).max(100000) })).max(20),
})).min(1).max(300);

export async function importMenu(slug: string, raw: unknown): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    const { shop } = await requireShop(slug, "catalog");
    const items = Import.parse(raw);
    const db = await getDb();
    const B = (b: number) => Math.round(b * 100);
    await db.transaction(async (tx) => {
      const cats = new Map((await tx.select().from(s.categories).where(eq(s.categories.shopId, shop.id))).map((c) => [c.name, c.id]));
      let sort = cats.size;
      for (const it of items) {
        let catId = cats.get(it.category);
        if (!catId) {
          [{ id: catId }] = await tx.insert(s.categories).values({ shopId: shop.id, name: it.category, icon: it.icon || "🍽️", sort: sort++ }).returning({ id: s.categories.id });
          cats.set(it.category, catId);
        }
        const prices = it.variants.map((v) => v.price);
        const [p] = await tx.insert(s.products).values({
          shopId: shop.id, categoryId: catId, name: it.name, description: it.description, emoji: it.emoji || "🍽️",
          basePrice: B(prices.length ? Math.min(...prices) : it.price), sort: Date.now() % 1e9,
        }).returning({ id: s.products.id });
        if (it.variants.length) await tx.insert(s.productVariants).values(it.variants.map((v, i) => ({ productId: p.id, name: v.name, price: B(v.price), sort: i })));
      }
    });
    updateTag(shopTag(slug));
    return { ok: true, count: items.length };
  } catch (e) {
    unstable_rethrow(e);
    return { ok: false, error: e instanceof z.ZodError ? "ข้อมูลไม่ครบ ตรวจชื่อ/ราคา" : e instanceof Error ? e.message : "ผิดพลาด" };
  }
}
