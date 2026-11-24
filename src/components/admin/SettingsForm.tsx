"use client";
import { useState } from "react";
import { saveSettings } from "@/app/admin/actions";
import type { ShopHours, ShopTheme } from "@/db/schema";
import { themeStyle } from "@/components/theme";
import { btnPrimary, Card, field, Label, useAction } from "./ui";

type S = { name: string; tagline: string; type: "cafe" | "restaurant" | "retail"; promptpayId: string; hours: ShopHours; theme: ShopTheme };

const PRESETS: [string, Omit<ShopTheme, "font" | "heroEmoji">][] = [
  ["Espresso", { primary: "#6b3e26", accent: "#d9a066", bg: "#f7f1e8", surface: "#fffaf3", text: "#2a1a12" }],
  ["Matcha", { primary: "#3f6212", accent: "#bef264", bg: "#f4f7ec", surface: "#ffffff", text: "#1a2e05" }],
  ["Chili", { primary: "#c2410c", accent: "#facc15", bg: "#fff7ed", surface: "#ffffff", text: "#1c1917" }],
  ["Ocean", { primary: "#0e7490", accent: "#67e8f9", bg: "#ecfeff", surface: "#ffffff", text: "#083344" }],
  ["Blush", { primary: "#be185d", accent: "#fbcfe8", bg: "#fdf2f8", surface: "#ffffff", text: "#500724" }],
  ["Midnight", { primary: "#1e1b4b", accent: "#a78bfa", bg: "#f5f5f4", surface: "#ffffff", text: "#0c0a09" }],
];
const COLORS: [keyof ShopTheme, string][] = [["primary", "สีหลัก"], ["accent", "สีเน้น"], ["bg", "พื้นหลัง"], ["surface", "การ์ด"], ["text", "ตัวอักษร"]];
const DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export function SettingsForm({ slug, initial }: { slug: string; initial: S }) {
  const [s, setS] = useState(initial);
  const { pending, run, Msg } = useAction();
  const t = s.theme;
  const setT = (patch: Partial<ShopTheme>) => setS({ ...s, theme: { ...t, ...patch } });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card title="ข้อมูลร้าน">
          <div className="grid gap-3 sm:grid-cols-2">
            <Label text="ชื่อร้าน"><input className={field} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></Label>
            <Label text="ประเภทร้าน">
              <select className={field} value={s.type} onChange={(e) => setS({ ...s, type: e.target.value as S["type"] })}>
                <option value="cafe">คาเฟ่</option><option value="restaurant">ร้านอาหาร</option><option value="retail">ร้านค้า</option>
              </select>
            </Label>
            <Label text="สโลแกน" className="sm:col-span-2"><input className={field} value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} /></Label>
            <Label text="PromptPay (เบอร์มือถือ / เลขบัตร 13 หลัก)"><input className={field} inputMode="numeric" value={s.promptpayId} onChange={(e) => setS({ ...s, promptpayId: e.target.value.replace(/\D/g, "") })} /></Label>
          </div>
        </Card>

        <Card title="เวลาทำการ">
          <div className="flex flex-wrap items-end gap-3">
            <Label text="เปิด"><input className={field} type="time" value={s.hours.open} onChange={(e) => setS({ ...s, hours: { ...s.hours, open: e.target.value } })} /></Label>
            <Label text="ปิด"><input className={field} type="time" value={s.hours.close} onChange={(e) => setS({ ...s, hours: { ...s.hours, close: e.target.value } })} /></Label>
            <div className="flex gap-1">
              {DAYS.map((d, i) => {
                const on = s.hours.days.includes(i);
                return <button key={d} type="button" onClick={() => setS({ ...s, hours: { ...s.hours, days: on ? s.hours.days.filter((x) => x !== i) : [...s.hours.days, i].sort() } })}
                  className={`size-10 rounded-xl text-sm ring-1 ${on ? "bg-stone-900 text-white ring-stone-900" : "ring-black/10"}`}>{d}</button>;
              })}
            </div>
          </div>
        </Card>

        <Card title="ธีม">
          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map(([n, p]) => (
              <button key={n} type="button" onClick={() => setT(p)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm ring-1 ring-black/10 hover:bg-black/5">
                <span className="flex"><span className="size-6 rounded-full" style={{ background: p.primary }} /><span className="-ml-2 size-6 rounded-full ring-2 ring-white" style={{ background: p.accent }} /></span>{n}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {COLORS.map(([k, label]) => (
              <Label key={k} text={label}>
                <input type="color" className="h-10 w-full cursor-pointer rounded-xl ring-1 ring-black/10" value={t[k] as string} onChange={(e) => setT({ [k]: e.target.value })} />
              </Label>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Label text="ฟอนต์หัวข้อ">
              <select className={field} value={t.font} onChange={(e) => setT({ font: e.target.value as ShopTheme["font"] })}>
                <option value="modern">Modern (Prompt)</option><option value="classic">Classic (Serif)</option>
              </select>
            </Label>
            <Label text="ไอคอนหน้าร้าน"><input className={`${field} text-center text-xl`} value={t.heroEmoji} onChange={(e) => setT({ heroEmoji: e.target.value })} /></Label>
          </div>
        </Card>
      </div>

      <div className="space-y-3 lg:sticky lg:top-8 lg:h-fit">
        <p className="text-xs font-medium text-stone-500">ตัวอย่าง</p>
        <div style={themeStyle(t)} className="overflow-hidden rounded-3xl bg-paper text-ink shadow-xl ring-1 ring-black/5">
          <div className="relative overflow-hidden bg-brand p-5 text-card">
            <div className="absolute -right-8 -top-8 size-32 rounded-full bg-accent/40 blur-2xl" />
            <span className="absolute right-4 top-4 text-5xl">{t.heroEmoji}</span>
            <p className="relative mt-8 font-display text-2xl font-bold">{s.name || "ชื่อร้าน"}</p>
            <p className="relative text-xs text-card/75">{s.tagline}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {["เมนู A", "เมนู B"].map((m) => (
              <div key={m} className="rounded-2xl bg-card p-2 ring-1 ring-black/5">
                <div className="aspect-square rounded-xl bg-accent/30" />
                <p className="mt-1 font-display text-sm font-semibold">{m}</p>
                <p className="text-xs font-semibold text-brand">฿59</p>
              </div>
            ))}
          </div>
        </div>
        <button disabled={pending} onClick={() => run(() => saveSettings(slug, s), { success: "บันทึกแล้ว ✓" })} className={`${btnPrimary} w-full`}>
          {pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
        </button>
        <Msg />
      </div>
    </div>
  );
}
