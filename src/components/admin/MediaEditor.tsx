"use client";
import { useState } from "react";
import type { Media, Visual } from "@/db/schema";
import { uploadMedia } from "@/app/admin/actions";
import { ALL_PARAMS, ALL_PARTS, PRESETS } from "@/lib/presets";
import { resolveVisual } from "@/lib/visual";
import { MediaView } from "@/components/media/MediaView";
import { field } from "./ui";

const chip = "rounded-full px-2.5 py-1 text-xs ring-1 transition";

/** แก้ผลต่อภาพ 3D ของ variant / option: เปลี่ยนโมเดล · แสดง/ซ่อนชิ้นส่วน · เปลี่ยนสี · ขนาด */
export function VisualEditor({ value, onChange, preset, allowPreset }: {
  value: Visual; onChange: (v: Visual) => void; preset?: string; allowPreset?: boolean;
}) {
  const eff = value.preset ?? preset;
  const parts = eff && PRESETS[eff] ? PRESETS[eff].parts : ALL_PARTS;
  const params = eff && PRESETS[eff] ? PRESETS[eff].params : ALL_PARAMS;
  const set = (patch: Partial<Visual>) => {
    const v = { ...value, ...patch };
    (Object.keys(v) as (keyof Visual)[]).forEach((k) => {
      const x = v[k];
      if (x === undefined || x === "" || (Array.isArray(x) && !x.length) || (typeof x === "object" && !Array.isArray(x) && !Object.keys(x).length)) delete v[k];
    });
    onChange(v);
  };
  const cycle = (k: string) => {
    const show = new Set(value.show), hide = new Set(value.hide);
    if (show.has(k)) { show.delete(k); hide.add(k); } else if (hide.has(k)) hide.delete(k); else show.add(k);
    set({ show: [...show], hide: [...hide] });
  };

  return (
    <div className="space-y-2 rounded-xl bg-stone-50 p-3 text-xs">
      {allowPreset && (
        <label className="flex items-center gap-2">โมเดล
          <select className="h-8 rounded-lg bg-white px-2 ring-1 ring-black/10" value={value.preset ?? ""} onChange={(e) => set({ preset: e.target.value || undefined })}>
            <option value="">ตามสินค้าหลัก</option>
            {Object.entries(PRESETS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </label>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-stone-500">ชิ้นส่วน:</span>
        {parts.map((p) => {
          const st = value.show?.includes(p.key) ? "show" : value.hide?.includes(p.key) ? "hide" : "";
          return (
            <button key={p.key} type="button" onClick={() => cycle(p.key)}
              className={`${chip} ${st === "show" ? "bg-emerald-600 text-white ring-emerald-600" : st === "hide" ? "bg-red-50 text-red-600 line-through ring-red-200" : "bg-white ring-black/10"}`}>
              {st === "show" ? "+" : st === "hide" ? "−" : ""}{p.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-stone-500">สี:</span>
        {params.map((p) => {
          const v = value.params?.[p.key];
          return v !== undefined ? (
            <span key={p.key} className={`${chip} flex items-center gap-1 bg-white ring-black/10`}>
              <input type="color" className="size-4 cursor-pointer" value={v || "#ffffff"} onChange={(e) => set({ params: { ...value.params, [p.key]: e.target.value } })} aria-label={p.label} />
              {p.label}
              <button type="button" aria-label="ลบ" onClick={() => { const { [p.key]: _, ...rest } = value.params ?? {}; void _; set({ params: rest }); }}>✕</button>
            </span>
          ) : (
            <button key={p.key} type="button" onClick={() => set({ params: { ...value.params, [p.key]: p.default || "#ffffff" } })} className={`${chip} bg-white text-stone-500 ring-dashed ring-black/10`}>+ {p.label}</button>
          );
        })}
      </div>
      <label className="flex items-center gap-2">ขนาด ×
        <input className="h-8 w-20 rounded-lg bg-white px-2 ring-1 ring-black/10" type="number" step="0.05" min={0.5} max={2} value={value.scale ?? ""} placeholder="1"
          onChange={(e) => set({ scale: e.target.value ? Number(e.target.value) : undefined })} />
      </label>
    </div>
  );
}

type Kind = "none" | Media["type"];
const KINDS: [Kind, string][] = [["none", "ไม่มี (emoji)"], ["preset", "3D สำเร็จรูป"], ["glb", "ไฟล์ 3D (.glb)"], ["turntable", "ภาพหมุน 360°"], ["photo", "รูปภาพ"]];

/** Media Studio: เลือก/อัปโหลดสื่อหลัก + พรีวิวสด (เลือก variant เพื่อดูผล) */
export function MediaEditor({ slug, media, onChange, emoji, previews }: {
  slug: string; media?: Media; onChange: (m?: Media) => void; emoji: string; previews: { name: string; visual: Visual }[];
}) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [pv, setPv] = useState(0);
  const kind: Kind = media?.type ?? "none";

  const upload = async (files: File[]) => {
    setErr("");
    const urls: string[] = [];
    let nodes: string[] | undefined;
    for (const [i, f] of files.entries()) {
      setBusy(`กำลังอัปโหลด ${i + 1}/${files.length}`);
      const fd = new FormData(); fd.set("file", f);
      const r = await uploadMedia(slug, fd);
      if (!r.ok || !r.url) { setErr(r.ok ? "อัปโหลดไม่สำเร็จ" : r.error); setBusy(""); return null; }
      if (r.note) setNote(r.note);
      if (r.nodes) nodes = r.nodes;
      urls.push(r.url);
    }
    setBusy("");
    return { urls, nodes };
  };
  const pick = (accept: string, multiple: boolean, cb: (urls: string[], files: File[], nodes?: string[]) => void) => (
    <input type="file" accept={accept} multiple={multiple} className="text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-white"
      onChange={async (e) => {
        const files = [...(e.target.files ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        e.target.value = "";
        if (!files.length) return;
        setNote("");
        const up = await upload(files);
        if (up) cb(up.urls, files, up.nodes);
      }} />
  );

  const visual = resolveVisual(media, [previews[pv]?.visual ?? {}]);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => onChange(
              k === "none" ? undefined : k === "preset" ? { type: "preset", preset: "cup" } : k === media?.type ? media : k === "turntable" ? { type: "turntable", frames: [] } : { type: k, url: "" },
            )} className={`${chip} ${kind === k ? "bg-stone-900 text-white ring-stone-900" : "bg-white ring-black/10"}`}>{label}</button>
          ))}
        </div>

        {media?.type === "preset" && (
          <div className="space-y-3">
            <select className={field} value={media.preset} onChange={(e) => onChange({ type: "preset", preset: e.target.value })}>
              {Object.entries(PRESETS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
            <div className="flex flex-wrap gap-3">
              {PRESETS[media.preset]?.params.map((p) => (
                <label key={p.key} className="flex items-center gap-1.5 text-xs">
                  <input type="color" className="size-7 cursor-pointer rounded" value={media.params?.[p.key] || p.default || "#ffffff"}
                    onChange={(e) => onChange({ ...media, params: { ...media.params, [p.key]: e.target.value } })} />{p.label}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="text-stone-500">ชิ้นส่วนเริ่มต้น:</span>
              {PRESETS[media.preset]?.parts.filter((p) => !p.on).map((p) => {
                const on = media.show?.includes(p.key);
                return <button key={p.key} type="button" className={`${chip} ${on ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white ring-black/10"}`}
                  onClick={() => onChange({ ...media, show: on ? media.show!.filter((x) => x !== p.key) : [...(media.show ?? []), p.key] })}>{p.label}</button>;
              })}
            </div>
          </div>
        )}
        {media?.type === "glb" && (
          <div className="space-y-2 text-xs text-stone-600">
            {pick(".glb", false, ([url], _f, nodes) => onChange({ type: "glb", url, nodes, flat: media.flat, poster: media.poster }))}
            {media.url && <p className="truncate">✓ {media.url}</p>}
            {media.url && (
              <div className="space-y-2 rounded-xl bg-stone-50 p-3">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!media.flat} onChange={(e) => onChange({ ...media, flat: e.target.checked })} />
                  วางราบบนโต๊ะ <span className="text-stone-400">(โมเดลจากภาพถ่ายมุมบน)</span></label>
                {(media.nodes?.filter((n) => !n.startsWith("opt_")).length ?? 0) > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>ซ่อนชิ้นส่วน:</span>
                    {media.nodes!.filter((n) => !n.startsWith("opt_")).map((n) => {
                      const off = media.hide?.includes(n);
                      return <button key={n} type="button" onClick={() => onChange({ ...media, hide: off ? media.hide!.filter((x) => x !== n) : [...(media.hide ?? []), n] })}
                        className={`${chip} ${off ? "bg-red-50 text-red-600 line-through ring-red-200" : "bg-white ring-black/10"}`}>{n}</button>;
                    })}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span>รูปปกบนการ์ดเมนู:</span>
                  {pick("image/*", false, ([poster]) => onChange({ ...media, poster }))}
                  {media.poster && <button type="button" className="text-red-600 underline" onClick={() => onChange({ ...media, poster: undefined })}>ลบรูปปก</button>}
                </div>
              </div>
            )}
            <p className="text-stone-500">ตั้งชื่อ node ขึ้นต้น <code>opt_</code> (เช่น <code>opt_ice</code>) เพื่อให้ตัวเลือกสั่งแสดง/ซ่อนได้ · ตั้งชื่อ material ให้ตรงกับคีย์สี เพื่อเปลี่ยนสีตาม variant</p>
          </div>
        )}
        {media?.type === "turntable" && (
          <div className="space-y-2 text-xs text-stone-600">
            {pick("image/*", true, (urls) => onChange({ type: "turntable", frames: urls }))}
            <p>{media.frames.length ? `✓ ${media.frames.length} เฟรม` : "เลือกภาพ 24–36 ภาพ ถ่ายบนจานหมุน (เรียงตามชื่อไฟล์)"}</p>
          </div>
        )}
        {media?.type === "photo" && (
          <div className="space-y-2 text-xs text-stone-600">
            {pick("image/*", false, ([url]) => onChange({ type: "photo", url }))}
            {media.url && <p className="truncate">✓ {media.url}</p>}
          </div>
        )}
        {busy && <p className="text-xs text-stone-500">{busy}</p>}
        {note && <p className="text-xs text-emerald-700">✓ {note}</p>}
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>

      <div className="space-y-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-black/5">
          <MediaView media={media?.type === "turntable" && !media.frames.length ? undefined : media} resolved={visual} emoji={emoji} alt="พรีวิว" />
        </div>
        {previews.length > 1 && (
          <select className={`${field} h-9`} value={pv} onChange={(e) => setPv(Number(e.target.value))} aria-label="พรีวิวแบบ">
            {previews.map((p, i) => <option key={i} value={i}>พรีวิว: {p.name || `แบบ ${i + 1}`}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}
