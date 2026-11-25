import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// เปิดใช้เมื่อมี ANTHROPIC_API_KEY (SDK อ่านเอง รวม ANTHROPIC_BASE_URL สำหรับ mock/proxy)
export const aiEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const g = globalThis as unknown as { __ai?: Anthropic };
export const ai = () => (g.__ai ??= new Anthropic({ maxRetries: 1, timeout: 60_000 }));

// เลือกรุ่นตามงาน (เปลี่ยนได้ด้วย env): แชตเร็ว/ถูก = Haiku · อ่านรูปเมนู (vision) = Sonnet
export const MODELS = {
  barista: process.env.BARISTA_MODEL ?? "claude-haiku-5-5",
  menuImport: process.env.MENU_IMPORT_MODEL ?? "claude-sonnet-5-5",
};

/** จำกัดจำนวนครั้งต่อ key (in-memory ต่อ instance) กันโดนยิงจนค่า API บาน */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now(), arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return true;
}
