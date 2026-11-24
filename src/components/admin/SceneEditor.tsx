"use client";
import { useState } from "react";
import type { SceneConfig, ShopHours, ShopTheme } from "@/db/schema";
import { saveScene } from "@/app/admin/actions";
import { LAYOUTS, assignSlots, resolveScene } from "@/lib/scene";
import { WalkIn } from "@/components/store/WalkIn";
import type { SceneProduct } from "@/components/three/StoreScene";
import { btnGhost, btnPrimary, Card, useAction } from "./ui";

type T = NonNullable<SceneConfig["template"]>;

export function SceneEditor({ slug, shopType, initial, products, shopName, theme, hours }: {
  slug: string; shopType: T; initial: SceneConfig; products: SceneProduct[]; shopName: string; theme: ShopTheme; hours: ShopHours;
}) {
  const [cfg, setCfg] = useState<SceneConfig>({ ...initial, template: initial.template ?? shopType });
  const [sel, setSel] = useState<number | undefined>();
  const { pending, run, Msg } = useAction();
  const sc = resolveScene(cfg, shopType);
  const n = sc.layout.slots.length;
  const saved = Array.from({ length: n }, (_, i) => cfg.slots?.[i] ?? "");
  const placed = assignSlots(sc.layout.slots, products, saved);
  const setSlot = (i: number, v: string) => setCfg({ ...cfg, slots: saved.map((x, j) => (j === i ? v : x)) });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-3 xl:sticky xl:top-8 xl:h-fit">
        <div className="aspect-[16/10] w-full">
          <WalkIn embedded zone={sel === undefined ? undefined : sc.layout.slots[sel].zone} highlight={sel}
            data={{ layout: sc.layout, wall: sc.wall, floor: sc.floor, theme, shopName, hours, slots: placed }} />
        </div>
        <p className="text-xs text-stone-500">ลากเพื่อมองรอบ · คลิกช่องทางขวาเพื่อไปยังตำแหน่งนั้น (วงสีเขียว)</p>
      </div>

      <div className="space-y-4">
        <Card title="แม่แบบ">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(LAYOUTS) as T[]).map((t) => (
              <button key={t} onClick={() => { setCfg({ ...cfg, template: t, slots: [] }); setSel(undefined); }}
                className={`rounded-xl px-2 py-3 text-sm ring-1 ${cfg.template === t ? "bg-stone-900 text-white ring-stone-900" : "ring-black/10 hover:bg-black/5"}`}>{LAYOUTS[t].label}</button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2">ผนัง <input type="color" className="size-8 cursor-pointer rounded" value={sc.wall} onChange={(e) => setCfg({ ...cfg, wall: e.target.value })} /></label>
            <label className="flex items-center gap-2">พื้น <input type="color" className="size-8 cursor-pointer rounded" value={sc.floor} onChange={(e) => setCfg({ ...cfg, floor: e.target.value })} /></label>
            <button className="text-stone-500 underline" onClick={() => setCfg({ ...cfg, wall: undefined, floor: undefined })}>สีเริ่มต้น</button>
          </div>
        </Card>

        <Card title="จัดวางสินค้า" action={<button className={`${btnGhost} h-8 text-xs`} onClick={() => setCfg({ ...cfg, slots: [] })}>อัตโนมัติทั้งหมด</button>}>
          <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
            {sc.layout.zones.map((z, zi) => {
              const idx = sc.layout.slots.flatMap((s, i) => (s.zone === zi ? [i] : []));
              if (!idx.length) return null;
              return (
                <div key={z.label}>
                  <p className="mb-1 text-xs font-semibold text-stone-500">{z.label}</p>
                  <ul className="space-y-1">
                    {idx.map((i) => (
                      <li key={i} onClick={() => setSel(i)} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${sel === i ? "bg-emerald-50 ring-1 ring-emerald-300" : "hover:bg-black/5"}`}>
                        <span className="w-6 text-center text-lg">{placed[i]?.emoji ?? "·"}</span>
                        <select className="h-8 flex-1 rounded-lg bg-white px-2 text-sm ring-1 ring-black/10" value={saved[i]}
                          onFocus={() => setSel(i)} onChange={(e) => setSlot(i, e.target.value)} aria-label={`ช่อง ${i + 1}`}>
                          <option value="">อัตโนมัติ{!saved[i] && placed[i] ? ` (${placed[i]!.name})` : ""}</option>
                          <option value="-">— เว้นว่าง —</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="flex items-center justify-end gap-3">
          <Msg />
          <button disabled={pending} className={btnPrimary} onClick={() => run(() => saveScene(slug, { template: cfg.template, wall: cfg.wall, floor: cfg.floor, slots: saved }), { success: "บันทึกแล้ว ✓" })}>
            {pending ? "กำลังบันทึก…" : "บันทึกฉาก"}
          </button>
        </div>
      </div>
    </div>
  );
}
