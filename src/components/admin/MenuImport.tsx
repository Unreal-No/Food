"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extractMenu, importMenu, type ExtractedMenu } from "@/app/admin/menu-import";
import { btnGhost, btnPrimary, Card, field } from "./ui";

type Row = { on: boolean; category: string; icon: string; name: string; description: string; emoji: string; price: number; variants: { name: string; price: number }[] };
const flatten = (m: ExtractedMenu): Row[] => m.categories.flatMap((c) => c.items.map((i) => ({ on: true, category: c.name, icon: c.icon, ...i })));

export function MenuImport({ slug }: { slug: string }) {
  const [img, setImg] = useState<string>("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (i: number, p: Partial<Row>) => setRows((r) => r!.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const chosen = rows?.filter((r) => r.on && r.name.trim()) ?? [];

  const read = (file: File) => {
    setImg(URL.createObjectURL(file)); setRows(null); setMsg(null);
    const fd = new FormData(); fd.set("file", file);
    start(async () => {
      const r = await extractMenu(slug, fd);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      const flat = flatten(r.menu);
      setRows(flat);
      setMsg({ ok: true, text: `อ่านได้ ${flat.length} เมนู ตรวจแล้วกดนำเข้า` });
    });
  };
  const save = () => start(async () => {
    const r = await importMenu(slug, chosen.map(({ on: _, ...x }) => { void _; return x; }));
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: `นำเข้าแล้ว ${r.count} เมนู ✓` }); setRows(null); router.refresh();
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card title="รูปเมนู">
        <label className="grid aspect-[3/4] cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-black/15 bg-stone-50 text-center text-sm text-stone-500 hover:bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {img ? <img src={img} alt="เมนู" className="size-full object-contain" /> : <span>📸<br />แตะเพื่อเลือก/ถ่ายรูป<br /><span className="text-xs">JPG/PNG/WebP ≤ 5MB</span></span>}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" className="hidden" aria-label="รูปเมนู"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) read(f); }} />
        </label>
        {pending && !rows && <p className="mt-3 animate-pulse text-sm text-stone-500">🔎 กำลังอ่านเมนู…</p>}
      </Card>

      <div className="space-y-3">
        {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text} {msg.ok && !rows && msg.text.includes("นำเข้าแล้ว") && <Link className="underline" href={`/admin/${slug}/products`}>ดูสินค้า →</Link>}</p>}
        {rows && (
          <Card title={`ตรวจสอบ (${chosen.length}/${rows.length})`} action={<button disabled={pending || !chosen.length} className={btnPrimary} onClick={save}>นำเข้า {chosen.length} เมนู</button>}>
            <ul className="divide-y divide-black/5">
              {rows.map((r, i) => (
                <li key={i} className={`grid items-center gap-2 py-2 sm:grid-cols-[24px_48px_1fr_140px_90px] ${r.on ? "" : "opacity-40"}`}>
                  <input type="checkbox" checked={r.on} onChange={(e) => set(i, { on: e.target.checked })} aria-label="เลือก" />
                  <input className={`${field} text-center text-lg`} value={r.emoji} onChange={(e) => set(i, { emoji: e.target.value })} aria-label="ไอคอน" />
                  <div>
                    <input className={field} value={r.name} onChange={(e) => set(i, { name: e.target.value })} aria-label="ชื่อเมนู" />
                    {r.variants.length > 0 && <p className="mt-1 text-xs text-stone-500">แบบ: {r.variants.map((v) => `${v.name} ฿${v.price}`).join(" · ")}</p>}
                  </div>
                  <input className={field} value={r.category} onChange={(e) => set(i, { category: e.target.value })} aria-label="หมวด" />
                  <input className={field} type="number" min={0} value={r.price} disabled={r.variants.length > 0} onChange={(e) => set(i, { price: Number(e.target.value) })} aria-label="ราคา" />
                </li>
              ))}
            </ul>
            <button className={`${btnGhost} mt-3 h-8 text-xs`} onClick={() => setRows(rows.map((r) => ({ ...r, on: !rows.every((x) => x.on) })))}>เลือก/ไม่เลือกทั้งหมด</button>
          </Card>
        )}
      </div>
    </div>
  );
}
