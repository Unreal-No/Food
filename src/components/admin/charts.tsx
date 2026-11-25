"use client";
import { useState } from "react";
import { baht } from "@/lib/pricing";

// สีกราฟ (dataviz reference palette) · ตัวหนังสือใช้สีข้อความ ไม่ใช้สีข้อมูล
export const C = { blue: "#257de0", orange: "#f47230", grid: "#e7e7e7", axis: "#c2c2c2", ink: "#191919", ink2: "#666666" };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
const compact = (v: number) => (v >= 10_000 ? `${Math.round(v / 1000)}K` : v.toLocaleString("th-TH"));
const axis = (v: number, unit: string) => compact(unit === "baht" ? v / 100 : v); // แกน: บาท (ไม่ใช่สตางค์)

/** คอลัมน์ชุดเดียว: แท่ง ≤24px มุมบนโค้ง 4px ฐานเหลี่ยม · hover/focus = tooltip · มีมุมมองตาราง */
const FORMAT = { baht: (v: number) => baht(v), orders: (v: number) => `${v} บิล` };

export function ColumnChart({ data, label, unit, height = 220 }: {
  data: { key: string; tick: string; title: string; value: number }[]; label: string; unit: keyof typeof FORMAT; height?: number;
}) {
  const format = FORMAT[unit];
  const [hot, setHot] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const W = 640, H = height, L = 44, R = 8, T = 12, B = 24;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const band = (W - L - R) / data.length, bw = Math.min(24, band - 2);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = unit === "orders" && max % 2 ? [0, max] : [0, max / 2, max]; // จำนวนบิลต้องเป็นจำนวนเต็ม
  const every = Math.ceil(data.length / 10); // ป้ายแกน x ไม่ให้ชนกัน
  const h = hot === null ? null : data[hot];

  return (
    <figure className="relative">
      <div className="mb-2 flex items-center justify-between">
        <figcaption className="text-sm font-semibold text-stone-900">{label}</figcaption>
        <button onClick={() => setTable(!table)} className="text-xs text-stone-500 underline">{table ? "ดูกราฟ" : "ดูเป็นตาราง"}</button>
      </div>
      {table ? (
        <div className="max-h-64 overflow-y-auto"><table className="w-full text-sm"><tbody className="divide-y divide-stone-100">
          {data.map((d) => <tr key={d.key}><td className="py-1 text-stone-600">{d.title}</td><td className="py-1 text-right tabular-nums">{format(d.value)}</td></tr>)}
        </tbody></table></div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label} onPointerLeave={() => setHot(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.axis : C.grid} strokeWidth={1} />
              <text x={L - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={C.ink2} style={{ fontVariantNumeric: "tabular-nums" }}>{axis(t, unit)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = L + band * i + (band - bw) / 2, top = y(d.value), hgt = Math.max(0, y(0) - top), r = Math.min(4, hgt);
            const path = hgt > 0 ? `M${x},${y(0)}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${y(0)}Z` : "";
            return (
              <g key={d.key} tabIndex={0} role="graphics-symbol" aria-label={`${d.title}: ${format(d.value)}`}
                onPointerEnter={() => setHot(i)} onFocus={() => setHot(i)} onBlur={() => setHot(null)} className="outline-none">
                <rect x={L + band * i} y={T} width={band} height={H - T - B} fill="transparent" />
                {path && <path d={path} fill={C.blue} opacity={hot === null || hot === i ? 1 : 0.45} />}
                {i % every === 0 && <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={C.ink2}>{d.tick}</text>}
              </g>
            );
          })}
        </svg>
      )}
      {!table && h && hot !== null && (
        <div className="pointer-events-none absolute top-8 z-10 -translate-x-1/2 rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-black/10"
          style={{ left: `${((L + band * hot + band / 2) / W) * 100}%` }}>
          <b className="block text-sm text-stone-900">{format(h.value)}</b><span className="text-stone-500">{h.title}</span>
        </div>
      )}
    </figure>
  );
}

/** แถบแบ่งสัดส่วน 2 ส่วน (ทั้งก้อน = 100%) · มีชื่อ+ค่าเป็นตัวหนังสือเสมอ (สีส้ม contrast ต่ำ) */
export function SplitBar({ label, parts }: { label: string; parts: [{ name: string; value: number }, { name: string; value: number }] }) {
  const total = parts[0].value + parts[1].value;
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const colors = [C.blue, C.orange];
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-stone-900">{label}</p>
      {total ? (
        <div className="flex h-3 gap-[2px]" role="img" aria-label={parts.map((p) => `${p.name} ${p.value} (${pct(p.value)}%)`).join(", ")}>
          {parts.map((p, i) => p.value > 0 && (
            <div key={p.name} title={`${p.name}: ${p.value}`} style={{ flexGrow: p.value, background: colors[i] }}
              className={`${i === 0 ? "rounded-l" : ""} ${i === 1 || !parts[1].value ? "rounded-r" : ""} ${!parts[0].value ? "rounded-l" : ""}`} />
          ))}
        </div>
      ) : <div className="h-3 rounded bg-stone-100" />}
      <div className="mt-2 flex justify-between text-xs text-stone-600">
        {parts.map((p, i) => (
          <span key={p.name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: colors[i] }} />{p.name} <b className="text-stone-900">{p.value}</b> ({pct(p.value)}%)
          </span>
        ))}
      </div>
    </div>
  );
}
