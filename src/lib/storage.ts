import "server-only";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

// ที่เก็บไฟล์: ตั้ง SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY = Supabase Storage (bucket สาธารณะ, CDN)
// ไม่ตั้ง = เก็บใน .data/uploads แล้วเสิร์ฟผ่าน /media/* (เครื่องเดียว / dev)
const ROOT = path.join(process.cwd(), ".data/uploads");

export const MEDIA_TYPES: Record<string, string> = {
  glb: "model/gltf-binary", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", avif: "image/avif",
};

export async function saveUpload(shopId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!MEDIA_TYPES[ext]) throw new Error(`ไม่รองรับไฟล์ .${ext}`);
  const name = `${randomUUID()}.${ext}`;
  const sb = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, bucket = process.env.STORAGE_BUCKET ?? "media";
  if (sb && key) {
    const r = await fetch(`${sb}/storage/v1/object/${bucket}/${shopId}/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": MEDIA_TYPES[ext], "Cache-Control": "31536000", "x-upsert": "false" },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!r.ok) throw new Error(`อัปโหลดไม่สำเร็จ (${r.status})`);
    return `${sb}/storage/v1/object/public/${bucket}/${shopId}/${name}`;
  }
  await mkdir(path.join(ROOT, shopId), { recursive: true });
  await writeFile(path.join(ROOT, shopId, name), Buffer.from(await file.arrayBuffer()));
  return `/media/${shopId}/${name}`;
}

export async function readUpload(shopId: string, name: string) {
  if (!/^[0-9a-f-]{36}$/.test(shopId) || !/^[0-9a-f-]{36}\.[a-z]{3,4}$/.test(name)) return null;
  const type = MEDIA_TYPES[name.split(".").pop()!];
  if (!type) return null;
  try { return { body: await readFile(path.join(ROOT, shopId, name)), type }; } catch { return null; }
}
