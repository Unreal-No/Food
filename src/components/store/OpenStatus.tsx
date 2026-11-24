"use client";
import { useSyncExternalStore } from "react";
import type { ShopHours } from "@/db/schema";
import { isOpen } from "@/lib/hours";

const sub = (cb: () => void) => { const t = setInterval(cb, 60_000); return () => clearInterval(t); };

export function OpenStatus({ hours }: { hours: ShopHours }) {
  const open = useSyncExternalStore(sub, () => isOpen(hours), () => null);
  if (open === null) return <span className="h-7 w-36" />;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium backdrop-blur ${open ? "bg-emerald-500/15 text-emerald-800" : "bg-black/10 text-ink/70"}`}>
      <span className={`size-2 rounded-full ${open ? "bg-emerald-500 shadow-[0_0_0_4px] shadow-emerald-500/20" : "bg-ink/40"}`} />
      {open ? "เปิดอยู่" : "ปิดแล้ว"} · {hours.open}–{hours.close}
    </span>
  );
}
