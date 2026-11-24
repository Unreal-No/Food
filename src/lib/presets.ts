// โมเดล 3D สำเร็จรูป (สร้างด้วยโค้ด ไม่ต้องมีไฟล์) — ใช้ได้ทั้งหน้าร้านและหลังบ้าน
export type PresetMeta = {
  label: string;
  params: { key: string; label: string; default: string }[];
  parts: { key: string; label: string; on?: boolean }[];
};

export const PRESETS: Record<string, PresetMeta> = {
  cup: {
    label: "แก้วร้อน",
    params: [{ key: "liquid", label: "เครื่องดื่ม", default: "#c69c72" }, { key: "art", label: "ลาเต้อาร์ต", default: "#f3e6d3" }, { key: "ceramic", label: "แก้ว", default: "#f8f5f0" }],
    parts: [{ key: "saucer", label: "จานรอง", on: true }, { key: "art", label: "ลาเต้อาร์ต", on: true }, { key: "steam", label: "ไอร้อน", on: true }, { key: "whip", label: "วิปครีม" }],
  },
  glass: {
    label: "แก้วเย็น",
    params: [{ key: "liquid", label: "ชั้นล่าง", default: "#c69c72" }, { key: "layer", label: "ชั้นบน (ว่าง = ไม่มี)", default: "" }, { key: "straw", label: "หลอด", default: "#e85d3a" }, { key: "slice", label: "ผลไม้", default: "#facc15" }],
    parts: [{ key: "ice", label: "น้ำแข็ง" }, { key: "straw", label: "หลอด" }, { key: "whip", label: "วิปครีม" }, { key: "pearls", label: "ไข่มุก" }, { key: "slice", label: "ผลไม้แต่งแก้ว" }],
  },
  plate: {
    label: "จานข้าว",
    params: [{ key: "rice", label: "ข้าว/เส้น", default: "#f7f3ea" }, { key: "topping", label: "กับข้าว", default: "#6b3b22" }, { key: "plate", label: "จาน", default: "#ffffff" }],
    parts: [{ key: "rice", label: "ข้าว", on: true }, { key: "topping", label: "กับข้าว", on: true }, { key: "herbs", label: "ผัก", on: true }, { key: "egg", label: "ไข่ดาว" }, { key: "omelet", label: "ไข่เจียว" }, { key: "cucumber", label: "แตงกวา" }],
  },
  bowl: {
    label: "ชามซุป",
    params: [{ key: "liquid", label: "น้ำซุป", default: "#e2572b" }, { key: "bowl", label: "ชาม", default: "#ffffff" }],
    parts: [{ key: "shrimp", label: "กุ้ง", on: true }, { key: "herbs", label: "สมุนไพร", on: true }, { key: "chili", label: "พริก", on: true }],
  },
  croissant: {
    label: "ครัวซองต์",
    params: [{ key: "crust", label: "สีอบ", default: "#c98a3d" }],
    parts: [{ key: "plate", label: "จาน", on: true }, { key: "sugar", label: "น้ำตาลไอซิ่ง" }],
  },
  cake: {
    label: "เค้ก",
    params: [{ key: "body", label: "เนื้อเค้ก", default: "#f3dca0" }, { key: "top", label: "ผิวหน้า", default: "#5a2e12" }],
    parts: [{ key: "plate", label: "จาน", on: true }, { key: "berry", label: "เบอร์รี่" }],
  },
};

const uniq = <T extends { key: string }>(xs: T[]) => xs.filter((x, i) => xs.findIndex((y) => y.key === x.key) === i);
/** ใช้กับ option (ใช้ได้หลายสินค้า) และ GLB: รวมทุกคีย์ */
export const ALL_PARTS = uniq(Object.values(PRESETS).flatMap((p) => p.parts));
export const ALL_PARAMS = uniq(Object.values(PRESETS).flatMap((p) => p.params));

/** ชิ้นส่วนที่เปิดอยู่จริง = ค่าเริ่มต้นของ preset + show − hide */
export function activeParts(preset: string, show: Set<string>, hide: Set<string>) {
  const meta = PRESETS[preset];
  const on = new Set(meta?.parts.filter((p) => p.on).map((p) => p.key) ?? []);
  show.forEach((p) => on.add(p));
  hide.forEach((p) => on.delete(p));
  return on;
}

export function presetParams(preset: string, params: Record<string, string>) {
  const out: Record<string, string> = {};
  PRESETS[preset]?.params.forEach((p) => { out[p.key] = params[p.key] ?? p.default; });
  return out;
}
