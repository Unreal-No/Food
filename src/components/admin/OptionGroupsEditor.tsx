"use client";
import { useState } from "react";
import { deleteOptionGroup, saveOptionGroup } from "@/app/admin/actions";
import type { CatalogGroup } from "@/lib/pricing";
import { btnDanger, btnGhost, btnPrimary, Card, field, Label, useAction } from "./ui";

type O = { id?: string; name: string; priceDelta: string; isDefault: boolean; isAvailable: boolean };
type G = { id?: string; name: string; minSelect: number; maxSelect: number; options: O[] };

const toForm = (g: CatalogGroup): G => ({
  id: g.id, name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect,
  options: g.options.map((o) => ({ id: o.id, name: o.name, priceDelta: String(o.priceDelta / 100), isDefault: o.isDefault, isAvailable: o.isAvailable })),
});
const blank = (): G => ({ name: "", minSelect: 0, maxSelect: 1, options: [{ name: "", priceDelta: "0", isDefault: false, isAvailable: true }] });

function GroupCard({ slug, initial, used, onSaved }: { slug: string; initial: G; used: number; onSaved?: () => void }) {
  const [g, setG] = useState(initial);
  const { pending, run, Msg } = useAction();
  const setO = (i: number, patch: Partial<O>) => setG({ ...g, options: g.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  return (
    <Card
      title={<input className={`${field} font-semibold`} value={g.name} placeholder="ชื่อกลุ่ม เช่น ความหวาน" onChange={(e) => setG({ ...g, name: e.target.value })} aria-label="ชื่อกลุ่ม" />}
      action={<span className="shrink-0 text-xs text-stone-500">{g.id ? `ใช้กับ ${used} สินค้า` : "ใหม่"}</span>}
    >
      <div className="mb-4 grid grid-cols-2 gap-3 sm:w-80">
        <Label text="เลือกขั้นต่ำ (0 = ไม่บังคับ)"><input className={field} type="number" min={0} max={20} value={g.minSelect} onChange={(e) => setG({ ...g, minSelect: Number(e.target.value) })} /></Label>
        <Label text="เลือกได้สูงสุด"><input className={field} type="number" min={1} max={20} value={g.maxSelect} onChange={(e) => setG({ ...g, maxSelect: Number(e.target.value) })} /></Label>
      </div>
      <ul className="space-y-2">
        {g.options.map((o, i) => (
          <li key={o.id ?? `n${i}`} className="flex flex-wrap items-center gap-2">
            <input className={`${field} min-w-40 flex-1`} placeholder="ชื่อตัวเลือก" value={o.name} onChange={(e) => setO(i, { name: e.target.value })} aria-label="ชื่อตัวเลือก" />
            <div className="relative w-28"><span className="absolute left-3 top-2.5 text-sm text-stone-400">+฿</span>
              <input className={`${field} pl-8`} type="number" min={0} step="0.25" value={o.priceDelta} onChange={(e) => setO(i, { priceDelta: e.target.value })} aria-label="ราคาเพิ่ม" /></div>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={o.isDefault} onChange={(e) => setO(i, { isDefault: e.target.checked })} />ค่าเริ่มต้น</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={o.isAvailable} onChange={(e) => setO(i, { isAvailable: e.target.checked })} />มีของ</label>
            <button className={btnDanger} onClick={() => setG({ ...g, options: g.options.filter((_, j) => j !== i) })} aria-label="ลบตัวเลือก">✕</button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className={btnGhost} onClick={() => setG({ ...g, options: [...g.options, { name: "", priceDelta: "0", isDefault: false, isAvailable: true }] })}>+ ตัวเลือก</button>
        <span className="flex-1" />
        <Msg />
        {g.id && <button disabled={pending} className={btnDanger} onClick={() => confirm(`ลบกลุ่ม "${initial.name}"?`) && run(() => deleteOptionGroup(slug, g.id!))}>ลบกลุ่ม</button>}
        <button disabled={pending} className={btnPrimary} onClick={() => run(() => saveOptionGroup(slug, {
          ...g, options: g.options.map((o) => ({ ...o, priceDelta: Number(o.priceDelta) || 0 })),
        }), { success: "บันทึกแล้ว ✓", onOk: onSaved })}>บันทึก</button>
      </div>
    </Card>
  );
}

export function OptionGroupsEditor({ slug, groups, usage }: { slug: string; groups: CatalogGroup[]; usage: Record<string, number> }) {
  const [adding, setAdding] = useState(0);
  return (
    <div className="space-y-4">
      {groups.map((g) => <GroupCard key={g.id + JSON.stringify(g)} slug={slug} initial={toForm(g)} used={usage[g.id] ?? 0} />)}
      {adding > 0 && <GroupCard key={`new${adding}`} slug={slug} initial={blank()} used={0} onSaved={() => setAdding(0)} />}
      <button className={btnGhost} onClick={() => setAdding((n) => n + 1)}>+ สร้างกลุ่มใหม่</button>
    </div>
  );
}
