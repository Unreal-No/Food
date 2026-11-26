"use client";
import { redeemPoints, setOrderStatus } from "@/app/admin/actions";
import { baht } from "@/lib/pricing";
import { NEXT_STATUS, STATUS_LABEL } from "@/lib/status";
import type { OrderStatus } from "@/db/schema";
import { btnDanger, btnPrimary, useAction } from "./ui";

type Order = {
  id: string; code: string; status: OrderStatus; channel: string; payment: string; tableCode: string; customerName: string;
  customerPhone: string; note: string; total: number; createdAt: Date; memberPoints: number; pointsUsed: number;
  items: { id: string; name: string; variantName: string; options: { name: string }[]; qty: number }[];
};

const TONE: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800", paid: "bg-sky-100 text-sky-800", preparing: "bg-violet-100 text-violet-800",
  ready: "bg-emerald-100 text-emerald-800", completed: "bg-stone-100 text-stone-500", cancelled: "bg-red-50 text-red-600",
};
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending_payment: "ยืนยันรับเงิน", paid: "เริ่มทำ", preparing: "พร้อมเสิร์ฟ", ready: "ส่งมอบแล้ว",
};

function OrderCard({ o, slug }: { o: Order; slug: string }) {
  const { pending, run, Msg } = useAction();
  const next = NEXT_STATUS[o.status];
  const go = (st: OrderStatus) => run(() => setOrderStatus(slug, o.id, st));
  return (
    <li className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">#{o.code}</p>
          <p className="text-xs text-stone-500">
            {o.channel === "dine_in" ? `โต๊ะ ${o.tableCode}` : "กลับบ้าน"} · {o.payment === "counter" ? "💵 เคาน์เตอร์" : "📱 PromptPay"} · {o.customerName} · {new Date(o.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
      </div>
      <ul className="my-3 flex-1 space-y-1 text-sm">
        {o.items.map((i) => (
          <li key={i.id}><b>{i.qty}×</b> {i.name} <span className="text-stone-500">{[i.variantName, ...i.options.map((x) => x.name)].filter(Boolean).join(" · ")}</span></li>
        ))}
        {o.note && <li className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900">📝 {o.note}</li>}
        {o.pointsUsed > 0 && <li className="text-xs text-emerald-700">⭐ ใช้ {o.pointsUsed} แต้ม (−{baht(o.pointsUsed * 50)})</li>}
        {o.pointsUsed === 0 && o.memberPoints >= 10 && !["completed", "cancelled"].includes(o.status) && (
          <li><button disabled={pending} onClick={() => confirm(`ลูกค้าเบอร์ ${o.customerPhone} มี ${o.memberPoints} แต้ม\nยืนยันตัวตนแล้ว ใช้แต้มลดบิลนี้?`) && run(() => redeemPoints(slug, o.id))}
            className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200">⭐ ใช้แต้มลด (มี {o.memberPoints})</button></li>
        )}
      </ul>
      <div className="flex items-center justify-between gap-2 border-t border-black/5 pt-3">
        <span className="font-semibold">{baht(o.total)}</span>
        <div className="flex gap-1">
          {o.status !== "completed" && o.status !== "cancelled" && (
            <button disabled={pending} onClick={() => confirm(`ยกเลิกออเดอร์ #${o.code}?`) && go("cancelled")} className={btnDanger}>ยกเลิก</button>
          )}
          {next && <button disabled={pending} onClick={() => go(next)} className={btnPrimary}>{NEXT_LABEL[o.status]}</button>}
        </div>
      </div>
      <Msg />
    </li>
  );
}

export function OrderBoard({ orders, slug }: { orders: Order[]; slug: string }) {
  if (!orders.length) return <p className="rounded-2xl bg-white p-10 text-center text-stone-500 ring-1 ring-black/5">ยังไม่มีออเดอร์</p>;
  return <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{orders.map((o) => <OrderCard key={o.id} o={o} slug={slug} />)}</ul>;
}
