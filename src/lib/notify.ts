import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { unseal } from "./secret";

/** แจ้งเตือนร้านผ่าน LINE Messaging API (push) · ไม่ได้ตั้งค่า = ข้าม · ล้มเหลวไม่กระทบการสั่งซื้อ */
export async function notifyShop(shopId: string, text: string) {
  try {
    const db = await getDb();
    const [row] = await db.select({ i: s.shops.integrations }).from(s.shops).where(eq(s.shops.id, shopId));
    const { lineTo } = row?.i ?? {};
    const lineToken = unseal(row?.i?.lineToken);
    if (!lineToken || !lineTo) return false;
    const r = await fetch(`${process.env.LINE_API_BASE ?? "https://api.line.me"}/v2/bot/message/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lineToken}` },
      body: JSON.stringify({ to: lineTo, messages: [{ type: "text", text: text.slice(0, 4900) }] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) console.warn("[line] push failed", r.status);
    return r.ok;
  } catch (e) {
    console.warn("[line] push error", e instanceof Error ? e.message : e);
    return false;
  }
}
