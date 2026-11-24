import type { SceneConfig } from "@/db/schema";

// ผังร้าน 3D (หน่วยเมตร) · ห้อง x −5..5, z −4..4, สูง 3.2 · ประตูหน้าร้านอยู่ z = 4
export type V3 = [number, number, number];
export type FixtureKind = "counter" | "case" | "shelf" | "table" | "plant" | "pendant" | "board" | "machine" | "stove" | "island" | "fridge";
export type Fixture = { kind: FixtureKind; p: V3; r?: number; w?: number };
export type Slot = { p: V3; zone: number };
export type Zone = { label: string; pos: V3; look: V3 };
export type Layout = { label: string; fixtures: Fixture[]; slots: Slot[]; zones: Zone[]; wall: string; floor: string };

const row = (n: number, x0: number, dx: number, y: number, z: number, zone: number): Slot[] =>
  Array.from({ length: n }, (_, i) => ({ p: [x0 + i * dx, y, z], zone }));
const shelf = (x: number, zs: number[], ys: number[], zone: number): Slot[] =>
  ys.flatMap((y) => zs.map((z) => ({ p: [x, y, z] as V3, zone })));
const H = Math.PI / 2;

const ENTRY: Zone[] = [
  { label: "หน้าร้าน", pos: [0, 1.9, 9.8], look: [0, 1.7, 0] },
  { label: "ทางเข้า", pos: [0, 1.6, 3.2], look: [-0.5, 1.2, -2.5] },
];

export const LAYOUTS: Record<NonNullable<SceneConfig["template"]>, Layout> = {
  cafe: {
    label: "คาเฟ่", wall: "#efe4d6", floor: "#9c6b45",
    fixtures: [
      { kind: "counter", p: [-1.6, 0, -2.7], w: 4.2 }, { kind: "machine", p: [-3.1, 1.05, -2.8] },
      { kind: "case", p: [1.1, 0, -2.7], w: 1.8 }, { kind: "board", p: [-1.6, 2.25, -3.97] },
      { kind: "shelf", p: [4.55, 0, -0.6], r: -H, w: 3.6 },
      { kind: "table", p: [-3.2, 0, 1.6] }, { kind: "table", p: [-1.2, 0, 2.5] }, { kind: "table", p: [1.6, 0, 2.3] },
      { kind: "plant", p: [-4.4, 0, -3.4] }, { kind: "plant", p: [4.4, 0, 3.4] }, { kind: "plant", p: [-4.4, 0, 3.4] },
      { kind: "pendant", p: [-2.6, 2.35, -2.6] }, { kind: "pendant", p: [-1.6, 2.35, -2.6] }, { kind: "pendant", p: [-0.6, 2.35, -2.6] },
    ],
    slots: [
      ...row(3, -2.2, 0.85, 1.05, -2.55, 2),
      ...row(2, 0.65, 0.9, 0.45, -2.65, 3), ...row(2, 0.65, 0.9, 0.9, -2.65, 3),
      ...shelf(4.4, [-1.8, -0.6, 0.6], [1.62, 1.08, 0.54], 4),
      { p: [-3.2, 0.76, 1.6], zone: 5 }, { p: [-1.2, 0.76, 2.5], zone: 5 }, { p: [1.6, 0.76, 2.3], zone: 5 },
    ],
    zones: [...ENTRY,
      { label: "เคาน์เตอร์", pos: [-1.5, 1.65, -0.3], look: [-1.5, 1.05, -2.7] },
      { label: "ตู้ขนม", pos: [1.1, 1.45, -0.9], look: [1.1, 0.7, -2.7] },
      { label: "ชั้นวาง", pos: [2.0, 1.55, -0.6], look: [4.5, 1.1, -0.6] },
      { label: "มุมนั่ง", pos: [0.6, 1.55, 0.4], look: [-1.8, 0.75, 2.2] },
    ],
  },
  restaurant: {
    label: "ร้านอาหาร", wall: "#f3e9dc", floor: "#6b4a35",
    fixtures: [
      { kind: "counter", p: [-0.8, 0, -2.7], w: 5.6 }, { kind: "stove", p: [-3.0, 1.05, -2.85] },
      { kind: "board", p: [0.2, 2.25, -3.97] }, { kind: "fridge", p: [4.55, 0, -1.2], r: -H, w: 2.4 },
      { kind: "table", p: [-3.3, 0, 0.6] }, { kind: "table", p: [-3.3, 0, 2.6] }, { kind: "table", p: [-1.0, 0, 1.6] },
      { kind: "table", p: [1.4, 0, 0.8] }, { kind: "table", p: [1.6, 0, 2.8] },
      { kind: "plant", p: [4.4, 0, 3.4] }, { kind: "plant", p: [-4.4, 0, -3.4] },
      { kind: "pendant", p: [-1.6, 2.35, -2.6] }, { kind: "pendant", p: [0.2, 2.35, -2.6] }, { kind: "pendant", p: [1.6, 2.35, -2.6] },
    ],
    slots: [
      ...row(5, -1.9, 0.85, 1.05, -2.55, 2),
      ...shelf(4.4, [-1.9, -1.2, -0.5], [1.55, 1.0], 3),
      { p: [-3.3, 0.76, 0.6], zone: 4 }, { p: [-3.3, 0.76, 2.6], zone: 4 }, { p: [-1.0, 0.76, 1.6], zone: 4 },
      { p: [1.4, 0.76, 0.8], zone: 4 }, { p: [1.6, 0.76, 2.8], zone: 4 },
    ],
    zones: [...ENTRY,
      { label: "ครัวเปิด", pos: [-0.6, 1.65, -0.2], look: [-0.6, 1.05, -2.7] },
      { label: "ตู้เครื่องดื่ม", pos: [2.2, 1.5, -1.2], look: [4.5, 1.2, -1.2] },
      { label: "โต๊ะ", pos: [0.2, 1.9, -0.6], look: [-1.5, 0.75, 1.8] },
    ],
  },
  retail: {
    label: "ร้านค้า", wall: "#f4f4f2", floor: "#c8b89f",
    fixtures: [
      { kind: "shelf", p: [-4.55, 0, -0.6], r: H, w: 3.6 }, { kind: "shelf", p: [4.55, 0, -0.6], r: -H, w: 3.6 },
      { kind: "island", p: [0, 0, -0.4] }, { kind: "counter", p: [0, 0, -3.0], w: 3 }, { kind: "board", p: [0, 2.25, -3.97] },
      { kind: "plant", p: [-4.4, 0, 3.4] }, { kind: "plant", p: [4.4, 0, 3.4] },
      { kind: "pendant", p: [-0.8, 2.35, -0.4] }, { kind: "pendant", p: [0.8, 2.35, -0.4] },
    ],
    slots: [
      ...row(4, -0.9, 0.6, 0.95, -0.4, 2),
      ...shelf(-4.4, [0.6, -0.6, -1.8], [1.62, 1.08, 0.54], 3),
      ...shelf(4.4, [-1.8, -0.6, 0.6], [1.62, 1.08, 0.54], 4),
    ],
    zones: [...ENTRY,
      { label: "โต๊ะกลาง", pos: [0, 1.7, 1.6], look: [0, 0.9, -0.4] },
      { label: "ชั้นซ้าย", pos: [-2.0, 1.55, -0.6], look: [-4.5, 1.1, -0.6] },
      { label: "ชั้นขวา", pos: [2.0, 1.55, -0.6], look: [4.5, 1.1, -0.6] },
    ],
  },
};

export function resolveScene(cfg: SceneConfig, shopType: "cafe" | "restaurant" | "retail") {
  const template = cfg.template ?? shopType;
  const layout = LAYOUTS[template];
  return { template, layout, wall: cfg.wall ?? layout.wall, floor: cfg.floor ?? layout.floor };
}

/**
 * จับคู่ช่องวางกับสินค้า: ใช้ค่าที่ตั้งไว้ก่อน → กระจายสินค้าที่เหลือไปทุกโซนแบบวนรอบ
 * → ช่องว่างที่เหลือเติมสินค้าซ้ำ (ให้ชั้นดูเต็ม) · "-" = เว้นว่างเสมอ
 */
export function assignSlots<T extends { id: string }>(slots: { zone: number }[], products: T[], saved: string[] = []) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: (T | null)[] = slots.map((_, i) => byId.get(saved[i] ?? "") ?? null);
  const used = new Set(out.filter(Boolean).map((p) => p!.id));
  const queue = products.filter((p) => !used.has(p.id));
  const seen = new Map<number, number>();
  const order = slots.flatMap((sl, i) => (out[i] || saved[i] === "-" ? [] : [{ i, z: sl.zone, r: 0 }]));
  order.forEach((o) => { o.r = seen.get(o.z) ?? 0; seen.set(o.z, o.r + 1); });
  order.sort((a, b) => a.r - b.r || a.z - b.z);
  order.forEach((o, k) => { out[o.i] = queue[k] ?? (products.length ? products[(k - queue.length) % products.length] : null); });
  return out;
}
