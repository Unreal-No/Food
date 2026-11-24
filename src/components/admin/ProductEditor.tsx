"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProduct, saveProduct } from "@/app/admin/actions";
import type { CatalogProduct } from "@/lib/pricing";
import { btnDanger, btnGhost, btnPrimary, Card, field, Label, useAction } from "./ui";

type V = { id?: string; name: string; price: string; stock: string };
const toBaht = (s: number) => String(s / 100);

export function ProductEditor({ slug, product, categories, groups }: {
  slug: string; product: CatalogProduct | null;
  categories: { id: string; name: string }[]; groups: { id: string; name: string; summary: string }[];
}) {
  const router = useRouter();
  const { pending, run, Msg } = useAction();
  const [f, setF] = useState({
    name: product?.name ?? "", description: product?.description ?? "", emoji: product?.emoji ?? "🍽️",
    badge: product?.badge ?? "", basePrice: toBaht(product?.basePrice ?? 0), status: product?.status ?? "active",
    categoryId: product?.categoryId ?? categories[0]?.id ?? "",
  });
  const [variants, setVariants] = useState<V[]>(product?.variants.map((v) => ({ id: v.id, name: v.name, price: toBaht(v.price), stock: v.stock === null ? "" : String(v.stock) })) ?? []);
  const [groupIds, setGroupIds] = useState<string[]>(product?.groups.map((g) => g.id) ?? []);
  const setV = (i: number, patch: Partial<V>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const base = `/admin/${slug}/products`;

  const save = () => run(() => saveProduct(slug, {
    id: product?.id, ...f, categoryId: f.categoryId || null, basePrice: Number(f.basePrice) || 0,
    variants: variants.map((v) => ({ id: v.id, name: v.name, price: Number(v.price) || 0, stock: v.stock === "" ? null : Math.max(0, Math.floor(Number(v.stock))) })),
    groupIds,
  }), { success: "บันทึกแล้ว ✓", onOk: (r) => { if (!product && r.id) router.replace(`${base}/${r.id}`); } });

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <Link href={base} className="text-sm text-stone-500">← สินค้าทั้งหมด</Link>
        {product && <button disabled={pending} className={btnDanger}
          onClick={() => confirm(`ลบ "${product.name}"?`) && run(() => deleteProduct(slug, product.id), { onOk: () => router.replace(base) })}>ลบสินค้า</button>}
      </div>

      <Card title={product ? "แก้ไขสินค้า" : "สินค้าใหม่"}>
        <div className="grid gap-4 sm:grid-cols-[88px_1fr]">
          <Label text="ไอคอน"><input className={`${field} h-[88px] text-center text-5xl`} value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} /></Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Label text="ชื่อสินค้า" className="sm:col-span-2"><input className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Label>
            <Label text="หมวดหมู่">
              <select className={field} value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
                <option value="">— ไม่มีหมวด —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Label>
            <Label text="ป้าย (เช่น ขายดี, ใหม่)"><input className={field} value={f.badge} onChange={(e) => setF({ ...f, badge: e.target.value })} /></Label>
          </div>
        </div>
        <Label text="คำบรรยาย" className="mt-3"><textarea className={`${field} h-20 py-2`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Label text={variants.length ? "ราคา (คำนวณจากแบบย่อย)" : "ราคา (บาท)"}>
            <input className={field} type="number" min={0} step="0.25" disabled={variants.length > 0} value={f.basePrice} onChange={(e) => setF({ ...f, basePrice: e.target.value })} />
          </Label>
          <Label text="สถานะ">
            <select className={field} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as typeof f.status })}>
              <option value="active">ขายอยู่</option><option value="soldout">หมดชั่วคราว</option><option value="hidden">ซ่อน</option>
            </select>
          </Label>
        </div>
      </Card>

      <Card title="แบบย่อย (Variants)" action={<button className={btnGhost} onClick={() => setVariants([...variants, { name: "", price: f.basePrice, stock: "" }])}>+ เพิ่มแบบ</button>}>
        <p className="mb-3 text-xs text-stone-500">เช่น ร้อน / เย็น / ปั่น หรือ S / M / L — ลูกค้าต้องเลือก 1 แบบ · สต็อกว่าง = ไม่จำกัด</p>
        {variants.length === 0 && <p className="text-sm text-stone-400">ไม่มี — ใช้ราคาหลัก</p>}
        <ul className="space-y-2">
          {variants.map((v, i) => (
            <li key={v.id ?? `n${i}`} className="grid grid-cols-[1fr_90px_80px_auto] gap-2">
              <input className={field} placeholder="ชื่อแบบ" value={v.name} onChange={(e) => setV(i, { name: e.target.value })} aria-label="ชื่อแบบ" />
              <input className={field} type="number" min={0} step="0.25" placeholder="ราคา" value={v.price} onChange={(e) => setV(i, { price: e.target.value })} aria-label="ราคา" />
              <input className={field} type="number" min={0} placeholder="สต็อก" value={v.stock} onChange={(e) => setV(i, { stock: e.target.value })} aria-label="สต็อก" />
              <button className={btnDanger} onClick={() => setVariants(variants.filter((_, j) => j !== i))} aria-label="ลบแบบ">✕</button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="กลุ่มตัวเลือกเสริม" action={<Link href={`/admin/${slug}/options`} className="text-sm text-stone-500">จัดการกลุ่ม →</Link>}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {groups.map((g) => {
            const on = groupIds.includes(g.id);
            return (
              <li key={g.id}>
                <label className={`flex cursor-pointer gap-3 rounded-xl p-3 ring-1 transition ${on ? "bg-stone-900 text-white ring-stone-900" : "ring-black/10 hover:bg-black/5"}`}>
                  <input type="checkbox" className="mt-1" checked={on} onChange={() => setGroupIds(on ? groupIds.filter((x) => x !== g.id) : [...groupIds, g.id])} />
                  <span><span className="block text-sm font-medium">{g.name}</span><span className={`text-xs ${on ? "text-white/70" : "text-stone-500"}`}>{g.summary}</span></span>
                </label>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/90 p-3 backdrop-blur md:left-56">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
          <Msg />
          <button disabled={pending} onClick={save} className={btnPrimary}>{pending ? "กำลังบันทึก…" : "บันทึก"}</button>
        </div>
      </div>
    </div>
  );
}
