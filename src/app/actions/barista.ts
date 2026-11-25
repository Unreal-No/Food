"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getStorefront } from "@/lib/catalog";
import { baht, fromPrice } from "@/lib/pricing";
import { ai, aiEnabled, MODELS, rateLimit } from "@/lib/ai";

const History = z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(600) }))
  .min(1).max(12).refine((h) => h[h.length - 1].role === "user");
const Out = z.object({
  reply: z.string().describe("คำตอบสั้น เป็นกันเอง ไม่เกิน 3 ประโยค"),
  product_ids: z.array(z.string()).describe("id ของเมนูที่แนะนำ (0–3 รายการ) ต้องมาจากรายการเมนูเท่านั้น"),
});

const RULES = `คุณคือพนักงานหน้าร้านที่เป็นมิตร ช่วยลูกค้าเลือกเมนูจาก "รายการเมนู" ด้านล่างเท่านั้น
- ตอบภาษาเดียวกับลูกค้า สั้น กระชับ อบอุ่น
- แนะนำไม่เกิน 3 เมนู ใส่ id ใน product_ids · ห้ามแต่งเมนู ราคา หรือโปรโมชันที่ไม่มีในรายการ
- เมนูที่ "หมด" ห้ามแนะนำ · ถ้าถามเรื่องอื่นที่ไม่เกี่ยวกับร้าน ให้ชวนกลับมาที่เมนูอย่างสุภาพ
- ข้อมูลแพ้อาหาร/ส่วนผสมที่ไม่ได้ระบุ ให้แนะนำสอบถามพนักงานหน้าร้าน`;

export async function askBarista(slug: string, raw: unknown): Promise<{ reply: string; productIds: string[] } | { error: string }> {
  if (!aiEnabled()) return { error: "ยังไม่เปิดใช้ผู้ช่วย AI" };
  const parsed = History.safeParse(raw);
  if (!parsed.success) return { error: "ข้อความยาวเกินไป" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!rateLimit(`barista:${ip}`, 20, 10 * 60_000)) return { error: "ถามถี่ไปหน่อย พักสักครู่แล้วลองใหม่นะ" };

  const data = await getStorefront(slug);
  if (!data) return { error: "ไม่พบร้าน" };
  const cat = new Map(data.categories.map((c) => [c.id, c.name]));
  const menu = data.products.map((p) => [
    `- [${p.id}] ${p.name} (${cat.get(p.categoryId ?? "") ?? "อื่นๆ"}) ${baht(fromPrice(p))}${p.status === "soldout" ? " · หมด" : ""}${p.badge ? ` · ${p.badge}` : ""}`,
    p.description && `  ${p.description}`,
    p.variants.length > 0 && `  แบบ: ${p.variants.map((v) => `${v.name} ${baht(v.price)}`).join(", ")}`,
    p.groups.length > 0 && `  ตัวเลือก: ${p.groups.map((g) => `${g.name} (${g.options.map((o) => o.name).join("/")})`).join("; ")}`,
  ].filter(Boolean).join("\n")).join("\n");

  try {
    const r = await ai().messages.parse({
      model: MODELS.barista,
      max_tokens: 1024,
      system: [
        { type: "text", text: RULES },
        // ส่วนเมนูคงที่ต่อร้าน → cache ไว้ลดค่าใช้จ่ายเมื่อคุยหลายรอบ
        { type: "text", text: `ร้าน: ${data.shop.name} — ${data.shop.tagline}\nเวลาเปิด ${data.shop.hours.open}–${data.shop.hours.close}\n\nรายการเมนู:\n${menu}`, cache_control: { type: "ephemeral" } },
      ],
      messages: parsed.data,
      output_config: { effort: "low", format: zodOutputFormat(Out) },
    });
    if (r.stop_reason === "refusal" || !r.parsed_output) return { reply: "ขอโทษนะ เรื่องนี้ช่วยไม่ได้ ลองถามเรื่องเมนูดูไหม 😊", productIds: [] };
    const valid = new Set(data.products.filter((p) => p.status === "active").map((p) => p.id));
    return { reply: r.parsed_output.reply, productIds: r.parsed_output.product_ids.filter((id) => valid.has(id)).slice(0, 3) };
  } catch (e) {
    console.warn("[barista]", e instanceof Error ? e.message : e);
    return { error: "ผู้ช่วยไม่ว่างชั่วคราว ลองใหม่อีกครั้งนะ" };
  }
}
