"use client";
import { useState } from "react";
import { deleteCategory, saveCategory, setProductStatus } from "@/app/admin/actions";
import { btnDanger, btnGhost, btnPrimary, Card, field, useAction } from "./ui";

type Status = "active" | "hidden" | "soldout";
const STATUS: Record<Status, string> = { active: "🟢 ขายอยู่", soldout: "🟠 หมดชั่วคราว", hidden: "⚪ ซ่อน" };

export function ProductStatusSelect({ slug, id, status }: { slug: string; id: string; status: Status }) {
  const { pending, run } = useAction();
  return (
    <select disabled={pending} defaultValue={status} aria-label="สถานะ"
      onChange={(e) => run(() => setProductStatus(slug, id, e.target.value as Status))}
      className="h-9 rounded-lg bg-white px-2 text-sm ring-1 ring-black/10">
      {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

type Cat = { id?: string; name: string; icon: string; sort: number };

function CategoryRow({ slug, cat, onDone }: { slug: string; cat: Cat; onDone?: () => void }) {
  const [c, setC] = useState(cat);
  const { pending, run, Msg } = useAction();
  const dirty = c.name !== cat.name || c.icon !== cat.icon || !cat.id;
  return (
    <li className="space-y-1">
      <div className="flex gap-2">
        <input className={`${field} w-16 text-center text-lg`} value={c.icon} onChange={(e) => setC({ ...c, icon: e.target.value })} aria-label="ไอคอน" />
        <input className={field} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="ชื่อหมวด" aria-label="ชื่อหมวด" />
        <button disabled={pending || !dirty} onClick={() => run(() => saveCategory(slug, c), { onOk: onDone })} className={btnPrimary}>บันทึก</button>
        {cat.id && <button disabled={pending} onClick={() => confirm(`ลบหมวด "${cat.name}"? (สินค้าจะย้ายไป "ไม่มีหมวด")`) && run(() => deleteCategory(slug, cat.id!))} className={btnDanger}>ลบ</button>}
      </div>
      <Msg />
    </li>
  );
}

export function CategoryManager({ slug, categories }: { slug: string; categories: Cat[] }) {
  const [adding, setAdding] = useState(0);
  return (
    <Card title="หมวดหมู่" action={<button className={btnGhost} onClick={() => setAdding((n) => n + 1)}>+ เพิ่มหมวด</button>}>
      <ul className="space-y-2">
        {categories.map((c) => <CategoryRow key={`${c.id}-${c.name}-${c.icon}`} slug={slug} cat={c} />)}
        {adding > 0 && <CategoryRow key={`new-${adding}`} slug={slug} cat={{ name: "", icon: "🍽️", sort: categories.length }} onDone={() => setAdding(0)} />}
      </ul>
    </Card>
  );
}
