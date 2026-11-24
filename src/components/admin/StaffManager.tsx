"use client";
import { useState } from "react";
import type { Role } from "@/db/schema";
import { deleteStaff, saveStaff } from "@/app/admin/actions";
import { PERMS, ROLE_LABEL } from "@/lib/perms";
import { btnDanger, btnPrimary, Card, field, useAction } from "./ui";

type S = { id?: string; name: string; username: string; role: Role; active: boolean; password?: string };
const PERM_LABEL: Record<string, string> = { dashboard: "ภาพรวม", orders: "ออเดอร์", kitchen: "จอครัว", catalog: "สินค้า", scene: "ฉาก 3D", tables: "โต๊ะ", settings: "ตั้งค่า", staff: "พนักงาน" };

function Row({ init, slug, self, onDone }: { init: S; slug: string; self: boolean; onDone?: () => void }) {
  const [s, setS] = useState<S>(init);
  const { pending, run, Msg } = useAction();
  return (
    <li className="space-y-2 py-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px_150px_auto]">
        <input className={field} placeholder="ชื่อ" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} aria-label="ชื่อ" />
        <input className={field} placeholder="ชื่อผู้ใช้" value={s.username} onChange={(e) => setS({ ...s, username: e.target.value })} aria-label="ชื่อผู้ใช้" autoCapitalize="none" />
        <select className={field} value={s.role} disabled={self} onChange={(e) => setS({ ...s, role: e.target.value as Role })} aria-label="บทบาท">
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <input className={field} type="password" placeholder={init.id ? "รหัสใหม่ (ไม่เปลี่ยนเว้นว่าง)" : "รหัสผ่าน (8+ ตัว)"} value={s.password ?? ""} onChange={(e) => setS({ ...s, password: e.target.value })} aria-label="รหัสผ่าน" autoComplete="new-password" />
        <div className="flex items-center gap-2">
          {init.id && <label className="flex items-center gap-1 text-xs"><input type="checkbox" disabled={self} checked={s.active} onChange={(e) => setS({ ...s, active: e.target.checked })} />ใช้งาน</label>}
          <button disabled={pending} className={btnPrimary} onClick={() => run(() => saveStaff(slug, { ...s, password: s.password || undefined }), { success: "บันทึกแล้ว ✓", onOk: () => { setS({ ...s, password: "" }); onDone?.(); } })}>บันทึก</button>
          {init.id && !self && <button disabled={pending} className={btnDanger} onClick={() => confirm(`ลบ ${init.name}?`) && run(() => deleteStaff(slug, init.id!))}>ลบ</button>}
        </div>
      </div>
      <p className="text-xs text-stone-500">{self && "คุณ · "}สิทธิ์: {PERMS[s.role].map((p) => PERM_LABEL[p]).join(", ")}</p>
      <Msg />
    </li>
  );
}

export function StaffManager({ slug, staff, selfId }: { slug: string; staff: S[]; selfId: string | null }) {
  const [adding, setAdding] = useState(0);
  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-semibold">พนักงาน</h1>
        <p className="text-sm text-stone-500">แต่ละบทบาทเห็นเฉพาะเมนูที่จำเป็น · ครัวเห็นแค่จอครัว</p>
      </div>
      <Card title={`บัญชี (${staff.length})`} action={<button className={btnPrimary} onClick={() => setAdding((n) => n + 1)}>+ เพิ่มพนักงาน</button>}>
        <ul className="divide-y divide-black/5">
          {staff.map((s) => <Row key={s.id + s.role + s.active + s.username} init={s} slug={slug} self={s.id === selfId} />)}
          {adding > 0 && <Row key={`new${adding}`} init={{ name: "", username: "", role: "cashier", active: true }} slug={slug} self={false} onDone={() => setAdding(0)} />}
        </ul>
      </Card>
    </>
  );
}
