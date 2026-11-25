import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// เข้ารหัสข้อมูลลับก่อนเก็บลงฐานข้อมูล (AES-256-GCM) · key จาก DATA_KEY (หรือ AUTH_SECRET)
function key() {
  const k = process.env.DATA_KEY ?? process.env.AUTH_SECRET;
  if (!k && process.env.NODE_ENV === "production") throw new Error("ต้องตั้ง DATA_KEY หรือ AUTH_SECRET");
  return createHash("sha256").update(k ?? "dev-only-key").digest();
}

export function seal(plain: string) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `enc:v1:${iv.toString("base64url")}:${c.getAuthTag().toString("base64url")}:${ct.toString("base64url")}`;
}

/** ค่าเก่าที่ยังไม่เข้ารหัสอ่านได้ตามเดิม · ถอดไม่ได้ (key เปลี่ยน) = undefined */
export function unseal(v?: string) {
  if (!v || !v.startsWith("enc:v1:")) return v;
  try {
    const [, , iv, tag, ct] = v.split(":");
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch { return undefined; }
}
