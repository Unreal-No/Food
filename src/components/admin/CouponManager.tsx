"use client";
import { useState } from "react";
import { deleteCoupon, saveCoupon } from "@/app/admin/actions";
import { btnDanger, btnPrimary, Card, field, useAction } from "./ui";

type C = { id?: string; code: string; kind: "percent" | "amount"; value: number; minTotal: number; maxUses: number | null; used?: number; active: boolean; expiresAt: string | null };

function Row({ init, slug, onDone }: { init: C; slug: string; onDone?: () => void }) {
  const [c, setC] = useState(init);
  const { pending, run, Msg } = useAction();
  return (
    <li className="space-y-1 py-3">
      <div className="grid items-center gap-2 sm:grid-cols-[140px_150px_90px_100px_90px_150px_auto]">
        <input className={`${field} font-mono uppercase`} value={c.code} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase() })} placeholder="รหัส" aria-label="รหัสคูปอง" />
        <select className={field} value={c.kind} onChange={(e) => setC({ ...c, kind: e.target.value as C["kind"] })} aria-label="ชนิด">
          <option value="percent">ลด %</option><option value="amount">ลดเป็นบาท</option>
        </select>
        <input className={field} type="number" min={0} value={c.value} onChange={(e) => setC({ ...c, value: Number(e.target.value) })} aria-label="มูลค่า" title={c.kind === "percent" ? "%" : "บาท"} />
        <input className={field} type="number" min={0} value={c.minTotal} onChange={(e) => setC({ ...c, minTotal: Number(e.target.value) })} aria-label="ขั้นต่ำ (บาท)" title="ขั้นต่ำ (บาท)" placeholder="ขั้นต่ำ ฿" />
        <input className={field} type="number" min={1} value={c.maxUses ?? ""} onChange={(e) => setC({ ...c, maxUses: e.target.value ? Number(e.target.value) : null })} aria-label="จำกัดครั้ง" placeholder="∞ ครั้ง" />
        <input className={field} type="date" value={c.expiresAt ?? ""} onChange={(e) => setC({ ...c, expiresAt: e.target.value || null })} aria-label="หมดอายุ" />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={c.active} onChange={(e) => setC({ ...c, active: e.target.checked })} />เปิด</label>
          <button disabled={pending} className={btnPrimary} onClick={() => run(() => saveCoupon(slug, c), { success: "บันทึกแล้ว ✓", onOk: onDone })}>บันทึก</button>
          {init.id && <button disabled={pending} className={btnDanger} onClick={() => confirm(`ลบคูปอง ${init.code}?`) && run(() => deleteCoupon(slug, init.id!))}>ลบ</button>}
        </div>
      </div>
      <p className="text-xs text-stone-500">
        {c.kind === "percent" ? `ลด ${c.value}%` : `ลด ฿${c.value}`}{c.minTotal ? ` เมื่อซื้อครบ ฿${c.minTotal}` : ""}
        {init.id ? ` · ใช้ไปแล้ว ${init.used}${c.maxUses ? `/${c.maxUses}` : ""} ครั้ง` : ""}
      </p>
      <Msg />
    </li>
  );
}

export function CouponManager({ slug, coupons }: { slug: string; coupons: C[] }) {
  const [adding, setAdding] = useState(0);
  return (
    <Card title={`คูปอง (${coupons.length})`} action={<button className={btnPrimary} onClick={() => setAdding((n) => n + 1)}>+ สร้างคูปอง</button>}>
      <ul className="divide-y divide-black/5">
        {coupons.map((c) => <Row key={JSON.stringify(c)} init={c} slug={slug} />)}
        {adding > 0 && <Row key={`n${adding}`} slug={slug} onDone={() => setAdding(0)} init={{ code: "", kind: "percent", value: 10, minTotal: 0, maxUses: null, active: true, expiresAt: null }} />}
      </ul>
      {!coupons.length && !adding && <p className="py-6 text-center text-sm text-stone-500">ยังไม่มีคูปอง</p>}
    </Card>
  );
}
