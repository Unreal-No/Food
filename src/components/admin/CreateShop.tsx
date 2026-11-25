"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createShop } from "@/app/admin/actions";
import { btnPrimary, Card, field, Label, useAction } from "./ui";

/** ผู้ดูแลระบบสร้างร้านใหม่ + บัญชีเจ้าของร้าน (ธีม/เวลาเปิดตั้งต้นตามประเภทร้าน) */
export function CreateShop() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", slug: "", type: "cafe", ownerName: "เจ้าของร้าน", ownerUsername: "", ownerPassword: "" });
  const { pending, run, Msg } = useAction();
  const router = useRouter();
  if (!open) return <button className={`${btnPrimary} mt-6`} onClick={() => setOpen(true)}>+ สร้างร้านใหม่</button>;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="mt-6">
      <Card title="ร้านใหม่">
        <div className="grid gap-3 sm:grid-cols-3">
          <Label text="ชื่อร้าน"><input className={field} value={f.name} onChange={set("name")} /></Label>
          <Label text="ลิงก์ร้าน (เช่น my-cafe)"><input className={field} value={f.slug} onChange={set("slug")} autoCapitalize="none" /></Label>
          <Label text="ประเภท">
            <select className={field} value={f.type} onChange={set("type")}><option value="cafe">คาเฟ่</option><option value="restaurant">ร้านอาหาร</option><option value="retail">ร้านค้า</option></select>
          </Label>
          <Label text="ชื่อเจ้าของ"><input className={field} value={f.ownerName} onChange={set("ownerName")} /></Label>
          <Label text="ชื่อผู้ใช้เจ้าของ"><input className={field} value={f.ownerUsername} onChange={set("ownerUsername")} autoCapitalize="none" /></Label>
          <Label text="รหัสผ่าน (8+ ตัว)"><input className={field} type="password" value={f.ownerPassword} onChange={set("ownerPassword")} autoComplete="new-password" /></Label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button disabled={pending} className={btnPrimary} onClick={() => run(() => createShop(f), { onOk: (r) => { const slug = (r as { slug?: string }).slug; if (slug) router.push(`/admin/${slug}/settings`); } })}>สร้างร้าน</button>
          <button className="text-sm text-stone-500" onClick={() => setOpen(false)}>ยกเลิก</button>
          <Msg />
        </div>
      </Card>
    </div>
  );
}
