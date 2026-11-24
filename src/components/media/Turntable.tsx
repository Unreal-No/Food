"use client";
import { useEffect, useRef, useState } from "react";

/** ภาพหมุน 360° (หลายเฟรม) หรือภาพเดียว: ลากหมุน · ล้อ/หยิกเพื่อซูม · ลากเมื่อซูมเพื่อเลื่อน */
export function Turntable({ frames, alt }: { frames: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const [z, setZ] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [touched, setTouched] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef({ i: 0, x: 0, y: 0, dist: 0, z: 1, pan: { x: 0, y: 0 } });
  const n = frames.length;

  useEffect(() => { frames.forEach((f) => { const im = new Image(); im.src = f; }); }, [frames]);
  useEffect(() => {
    if (touched || n < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), 90);
    return () => clearInterval(t);
  }, [touched, n]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setTouched(true); setZ((v) => Math.min(4, Math.max(1, v * (e.deltaY < 0 ? 1.12 : 0.89)))); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setTouched(true);
    const [a, b] = [...pts.current.values()];
    start.current = { i, x: e.clientX, y: e.clientY, dist: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0, z, pan: z === 1 ? { x: 0, y: 0 } : pan };
  };
  const move = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = start.current, w = box.current?.clientWidth ?? 300;
    const [a, b] = [...pts.current.values()];
    if (b && s.dist) return setZ(Math.min(4, Math.max(1, (s.z * Math.hypot(a.x - b.x, a.y - b.y)) / s.dist)));
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (z > 1 || n < 2) setPan({ x: s.pan.x + dx / z, y: s.pan.y + dy / z });
    else setI((((s.i - Math.round((dx / w) * n)) % n) + n) % n);
  };
  const up = (e: React.PointerEvent) => { pts.current.delete(e.pointerId); };

  return (
    <div ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onDoubleClick={() => setZ((v) => (v > 1 ? 1 : 2.5))}
      className="relative size-full cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frames[i]} alt={alt} draggable={false}
        style={{ transform: z === 1 ? undefined : `scale(${z}) translate(${pan.x}px, ${pan.y}px)` }}
        className="size-full object-contain transition-transform duration-75" />
      <span className={`pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-black/45 px-3 py-1 text-xs text-white transition-opacity duration-700 ${touched ? "opacity-0" : ""}`}>
        {n > 1 ? "ลากเพื่อหมุน 360° · " : ""}ดับเบิลคลิก/หยิกเพื่อซูม
      </span>
    </div>
  );
}
