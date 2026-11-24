"use client";
import { useState } from "react";
import { addTables, deleteTable, rotateTable } from "@/app/admin/actions";
import { btnDanger, btnGhost, btnPrimary, Card, field, useAction } from "./ui";

type T = { id: string; code: string; url: string; qr: string };

function TableCard({ t, slug, shopName }: { t: T; slug: string; shopName: string }) {
  const { pending, run, Msg } = useAction();
  return (
    <li className="flex break-inside-avoid flex-col items-center rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-black/5 print:shadow-none print:ring-black/30">
      <p className="text-xs text-stone-500">{shopName}</p>
      <p className="font-display text-3xl font-bold">โต๊ะ {t.code}</p>
      <div className="my-2 w-40 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: t.qr }} />
      <p className="text-sm font-medium">สแกนเพื่อสั่งอาหาร</p>
      <div className="mt-3 flex gap-1 print:hidden">
        <a href={t.url} target="_blank" className={`${btnGhost} h-8 px-3 text-xs`}>ทดลอง</a>
        <button disabled={pending} className={`${btnGhost} h-8 px-3 text-xs`} onClick={() => confirm(`เปลี่ยน QR โต๊ะ ${t.code}? QR เดิมจะใช้ไม่ได้`) && run(() => rotateTable(slug, t.id))}>เปลี่ยน QR</button>
        <button disabled={pending} className={`${btnDanger} h-8 px-3 text-xs`} onClick={() => confirm(`ลบโต๊ะ ${t.code}?`) && run(() => deleteTable(slug, t.id))}>ลบ</button>
      </div>
      <Msg />
    </li>
  );
}

export function TablesManager({ slug, shopName, tables }: { slug: string; shopName: string; tables: T[] }) {
  const [codes, setCodes] = useState("");
  const { pending, run, Msg } = useAction();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-semibold">โต๊ะ & QR สั่งอาหาร</h1>
          <p className="text-sm text-stone-500">ลูกค้าสแกน QR ที่โต๊ะ → สั่งได้ทันที เลขโต๊ะติดไปกับออเดอร์อัตโนมัติ</p>
        </div>
        <button className={btnPrimary} onClick={() => window.print()}>🖨️ พิมพ์ QR ทั้งหมด</button>
      </div>
      <div className="print:hidden">
        <Card title="เพิ่มโต๊ะ">
          <div className="flex gap-2">
            <input className={field} value={codes} onChange={(e) => setCodes(e.target.value)} placeholder="เช่น A1-A6, B1, VIP" aria-label="เลขโต๊ะ" />
            <button disabled={pending || !codes.trim()} className={btnPrimary} onClick={() => run(() => addTables(slug, codes), { onOk: () => setCodes(""), success: "เพิ่มแล้ว ✓" })}>เพิ่ม</button>
          </div>
          <div className="mt-2"><Msg /></div>
        </Card>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
        {tables.map((t) => <TableCard key={t.id + t.url} t={t} slug={slug} shopName={shopName} />)}
      </ul>
      {!tables.length && <p className="rounded-2xl bg-white p-10 text-center text-stone-500">ยังไม่มีโต๊ะ</p>}
    </>
  );
}
