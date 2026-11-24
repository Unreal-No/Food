"use client";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { setOrderStatus } from "@/app/admin/actions";
import type { OrderStatus } from "@/db/schema";
import { LiveRefresh } from "@/components/LiveRefresh";
import { useAction } from "./ui";

type Ticket = {
  id: string; code: string; status: OrderStatus; payment: "promptpay" | "counter"; channel: "dine_in" | "takeaway";
  tableCode: string; customerName: string; note: string; createdAt: string;
  items: { id: string; qty: number; name: string; detail: string }[];
};

// นาฬิกากลาง อัปเดตทุก 30 วิ (เวลาที่รอของแต่ละบิล)
const tick = (cb: () => void) => { const t = setInterval(cb, 30_000); return () => clearInterval(t); };
const now = () => Math.floor(Date.now() / 30_000) * 30_000;

function beep() {
  try {
    const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.25, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.6);
  } catch { /* ไม่มีเสียงก็ทำงานต่อได้ */ }
}

const COLS: { key: string; title: string; match: (t: Ticket) => boolean; next?: OrderStatus; action?: string; tone: string }[] = [
  { key: "new", title: "รอทำ", match: (t) => t.status === "paid" || (t.status === "pending_payment" && t.payment === "counter"), next: "preparing", action: "เริ่มทำ", tone: "border-sky-400" },
  { key: "cooking", title: "กำลังทำ", match: (t) => t.status === "preparing", next: "ready", action: "เสร็จแล้ว", tone: "border-amber-400" },
  { key: "ready", title: "พร้อมเสิร์ฟ", match: (t) => t.status === "ready", next: "completed", action: "ส่งแล้ว", tone: "border-emerald-400" },
];

function TicketCard({ t, slug, col, canComplete, at }: { t: Ticket; slug: string; col: (typeof COLS)[number]; canComplete: boolean; at: number }) {
  const { pending, run, Msg } = useAction();
  const mins = Math.max(0, Math.floor((at - new Date(t.createdAt).getTime()) / 60_000));
  const late = mins >= 20 ? "bg-red-500 text-white" : mins >= 10 ? "bg-amber-400 text-stone-900" : "bg-white/10 text-white/80";
  const showBtn = col.next && (col.next !== "completed" || canComplete);
  return (
    <li className={`flex flex-col rounded-2xl border-t-4 bg-stone-800 p-4 text-white shadow-lg ${col.tone}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-3xl font-bold tracking-wide">#{t.code}</p>
          <p className="text-sm text-white/70">{t.channel === "dine_in" ? `🍽️ โต๊ะ ${t.tableCode}` : "🛍️ กลับบ้าน"} · {t.customerName}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${late}`}>{mins} นาที</span>
      </div>
      {t.status === "pending_payment" && <p className="mt-2 rounded-lg bg-amber-400/15 px-2 py-1 text-xs text-amber-300">💵 จ่ายที่เคาน์เตอร์ (ยังไม่ชำระ)</p>}
      <ul className="my-3 flex-1 space-y-2">
        {t.items.map((i) => (
          <li key={i.id} className="text-lg leading-tight"><b className="text-amber-300">{i.qty}×</b> {i.name}{i.detail && <span className="block pl-7 text-sm text-white/60">{i.detail}</span>}</li>
        ))}
        {t.note && <li className="rounded-lg bg-yellow-300/15 px-2 py-1 text-sm text-yellow-200">📝 {t.note}</li>}
      </ul>
      {showBtn && (
        <button disabled={pending} onClick={() => run(() => setOrderStatus(slug, t.id, col.next!))}
          className="h-12 rounded-xl bg-white text-lg font-semibold text-stone-900 transition active:scale-[0.98] disabled:opacity-50">{col.action}</button>
      )}
      <Msg />
    </li>
  );
}

export function KitchenBoard({ slug, orders, canComplete }: { slug: string; orders: Ticket[]; canComplete: boolean }) {
  const at = useSyncExternalStore(tick, now, () => 0);
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  const onEvent = useCallback((e: { status?: string }) => {
    if (soundRef.current && (e.status === "pending_payment" || e.status === "paid")) beep();
  }, []);
  const unpaid = orders.filter((t) => t.status === "pending_payment" && t.payment === "promptpay").length;
  const sorted = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="-m-4 min-h-dvh bg-stone-900 p-4 md:-m-8 md:p-6">
      <LiveRefresh url={`/api/admin/${slug}/events`} fallbackMs={20_000} onEvent={onEvent} />
      <div className="mb-4 flex flex-wrap items-center gap-3 text-white">
        <h1 className="font-display text-2xl font-semibold">👨‍🍳 จอครัว</h1>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm">ทั้งหมด {orders.length - unpaid} บิล</span>
        {unpaid > 0 && <span className="rounded-full bg-amber-400/20 px-3 py-1 text-sm text-amber-200">รอชำระ PromptPay {unpaid}</span>}
        <span className="flex-1" />
        <button onClick={() => { soundRef.current = !sound; setSound(!sound); if (!sound) beep(); }}
          className={`rounded-full px-4 py-2 text-sm ${sound ? "bg-emerald-500 text-white" : "bg-white/10 text-white/80"}`}>{sound ? "🔔 เสียงเปิด" : "🔕 เปิดเสียงแจ้งเตือน"}</button>
        <button onClick={() => document.documentElement.requestFullscreen?.()} className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">⛶ เต็มจอ</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLS.map((col) => {
          const list = sorted.filter(col.match);
          return (
            <section key={col.key}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/60">{col.title}<span className="rounded-full bg-white/10 px-2 text-white">{list.length}</span></h2>
              <ul className="space-y-3">
                {list.map((t) => <TicketCard key={t.id} t={t} slug={slug} col={col} canComplete={canComplete} at={at} />)}
                {!list.length && <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/30">ว่าง</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
