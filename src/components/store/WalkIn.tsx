"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ShopHours, ShopTheme } from "@/db/schema";
import type { Layout } from "@/lib/scene";
import { isOpen } from "@/lib/hours";
import type { Look, SceneProduct } from "@/components/three/StoreScene";

const StoreScene = dynamic(() => import("@/components/three/StoreScene"), {
  ssr: false,
  loading: () => <div className="grid size-full place-items-center text-white/70">กำลังเปิดประตูร้าน…</div>,
});

export type WalkData = { layout: Layout; wall: string; floor: string; theme: ShopTheme; shopName: string; hours: ShopHours; slots: (SceneProduct | null)[] };

const noop = () => () => {};

/** โหมดเดินชมร้าน: เลื่อน/ปัด = เดินไปโซนถัดไป · ลาก = มองรอบ · แตะสินค้า = เปิดดู */
export function WalkIn({ data, onSelect, onClose, paused, embedded, highlight, zone: zoneProp }: {
  data: WalkData; onSelect?: (id: string) => void; onClose?: () => void; paused?: boolean; embedded?: boolean; highlight?: number; zone?: number;
}) {
  const zones = data.layout.zones;
  const [progress, setProgress] = useState(zoneProp ?? 0);
  const [ext, setExt] = useState(zoneProp);
  if (zoneProp !== ext) { setExt(zoneProp); if (zoneProp !== undefined) setProgress(Math.min(zoneProp, zones.length - 1)); }
  const [hint, setHint] = useState(true);
  const look = useRef<Look>({ yaw: 0, pitch: 0 });
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const open = useSyncExternalStore(noop, () => isOpen(data.hours), () => true);
  const max = zones.length - 1;
  const go = (p: number) => { setProgress(Math.max(0, Math.min(max, p))); look.current = { yaw: 0, pitch: 0 }; setHint(false); };
  const zone = Math.round(progress);

  useEffect(() => {
    const el = box.current;
    if (!el || embedded) return;
    let touchY = 0;
    const wheel = (e: WheelEvent) => { e.preventDefault(); setHint(false); setProgress((p) => Math.max(0, Math.min(max, p + e.deltaY * 0.0016))); };
    const ts = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const tm = (e: TouchEvent) => { if (e.touches.length !== 1) return; const dy = touchY - e.touches[0].clientY; touchY = e.touches[0].clientY; setHint(false); setProgress((p) => Math.max(0, Math.min(max, p + dy * 0.006))); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
      if (["ArrowRight", "ArrowDown", " "].includes(e.key)) setProgress((p) => Math.min(max, Math.round(p) + 1));
      if (["ArrowLeft", "ArrowUp"].includes(e.key)) setProgress((p) => Math.max(0, Math.round(p) - 1));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: true });
    document.addEventListener("keydown", key);
    if (!embedded) document.body.style.overflow = "hidden";
    return () => {
      el.removeEventListener("wheel", wheel); el.removeEventListener("touchstart", ts); el.removeEventListener("touchmove", tm);
      document.removeEventListener("keydown", key); document.body.style.overflow = "";
    };
  }, [max, onClose, embedded]);

  return (
    <div ref={box} className={embedded ? "relative size-full overflow-hidden rounded-2xl bg-stone-900" : "fixed inset-0 z-40 animate-fade bg-stone-900"}
      onPointerDown={(e) => { if (e.pointerType === "mouse") drag.current = { x: e.clientX, y: e.clientY, ...look.current }; }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        look.current = { yaw: Math.max(-0.9, Math.min(0.9, d.yaw - (e.clientX - d.x) * 0.004)), pitch: Math.max(-0.35, Math.min(0.35, d.pitch + (e.clientY - d.y) * 0.003)) };
      }}
      onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
      <StoreScene {...data} open={open} progress={progress} look={look} onSelect={onSelect} paused={paused} highlight={highlight} labelRef={label} />
      <div ref={label} className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium text-stone-900 opacity-0 shadow-lg transition-opacity" />

      {!embedded && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="rounded-full bg-black/40 px-4 py-2 font-display text-sm text-white backdrop-blur">{data.shopName} · {zones[zone].label}</span>
          <button onClick={onClose} className="pointer-events-auto grid size-11 place-items-center rounded-full bg-white/90 text-xl shadow-lg" aria-label="ออกจากร้าน">×</button>
        </div>
      )}
      <div className={`absolute inset-x-0 flex flex-col items-center gap-3 px-4 ${embedded ? "bottom-3" : "bottom-6"}`}>
        {hint && !embedded && (
          <p className="animate-rise rounded-full bg-black/50 px-4 py-2 text-center text-xs text-white backdrop-blur sm:text-sm">
            เลื่อนหรือปัดเพื่อเดิน · ลากเพื่อมองรอบ · แตะสินค้าเพื่อดูใกล้ๆ
          </p>
        )}
        <div className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full bg-black/45 p-1.5 backdrop-blur">
          <button aria-label="ย้อน" onClick={() => go(zone - 1)} className="grid size-9 shrink-0 place-items-center rounded-full text-white hover:bg-white/15">‹</button>
          {zones.map((z, i) => (
            <button key={z.label} onClick={() => go(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition sm:text-sm ${zone === i ? "bg-white text-stone-900" : "text-white/80 hover:bg-white/15"}`}>{z.label}</button>
          ))}
          <button aria-label="ถัดไป" onClick={() => go(zone + 1)} className="grid size-9 shrink-0 place-items-center rounded-full text-white hover:bg-white/15">›</button>
        </div>
      </div>
    </div>
  );
}
