"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

export const field = "h-10 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-stone-800";
export const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:opacity-50";
export const btnPrimary = `${btn} bg-stone-900 text-white hover:bg-stone-700`;
export const btnGhost = `${btn} ring-1 ring-black/10 hover:bg-black/5`;
export const btnDanger = `${btn} text-red-600 hover:bg-red-50`;

export function Card({ title, action, children }: { title?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      {(title || action) && <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export function Label({ text, children, className = "" }: { text: string; children: ReactNode; className?: string }) {
  return <label className={`block space-y-1 text-xs font-medium text-stone-600 ${className}`}><span>{text}</span>{children}</label>;
}

type R = { ok: boolean; error?: string; id?: string };
/** เรียก server action → แสดงผล → refresh ข้อมูล */
export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<R>, opts: { success?: string; onOk?: (r: R) => void } = {}) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (opts.success ? { ok: true, text: opts.success } : null) : { ok: false, text: r.error ?? "ผิดพลาด" });
      if (r.ok) { opts.onOk?.(r); router.refresh(); }
    });
  const Msg = () => msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>;
  return { pending, run, Msg };
}
