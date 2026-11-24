import "server-only";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

// P1: เก็บไฟล์ใน .data/uploads แล้วเสิร์ฟผ่าน /media/* · production ควรย้ายไป Supabase Storage/R2 + CDN
const ROOT = path.join(process.cwd(), ".data/uploads");

export const MEDIA_TYPES: Record<string, string> = {
  glb: "model/gltf-binary", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", avif: "image/avif",
};

export async function saveUpload(shopId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!MEDIA_TYPES[ext]) throw new Error(`ไม่รองรับไฟล์ .${ext}`);
  const name = `${randomUUID()}.${ext}`;
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
