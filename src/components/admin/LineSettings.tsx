"use client";
import { useState } from "react";
import { saveLine, testLine } from "@/app/admin/actions";
import { btnGhost, btnPrimary, Card, field, Label, useAction } from "./ui";

/** token ไม่ถูกส่งกลับมาที่ browser: แสดงแค่ว่าตั้งค่าแล้วหรือยัง */
export function LineSettings({ slug, lineTo, hasToken }: { slug: string; lineTo: string; hasToken: boolean }) {
  const [to, setTo] = useState(lineTo);
  const [tok, setTok] = useState("");
  const { pending, run, Msg } = useAction();
  return (
    <Card title="แจ้งเตือนผ่าน LINE" action={<span className={`text-xs ${hasToken ? "text-emerald-700" : "text-stone-400"}`}>{hasToken ? "● เชื่อมต่อแล้ว" : "○ ยังไม่ตั้งค่า"}</span>}>
      <p className="mb-3 text-xs text-stone-500">ใช้ LINE Official Account (Messaging API) · ส่งเมื่อมีออเดอร์ใหม่และเมื่อยืนยันรับเงิน</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label text="Channel access token"><input className={field} type="password" value={tok} onChange={(e) => setTok(e.target.value)} placeholder={hasToken ? "ตั้งไว้แล้ว (เว้นว่าง = ใช้ค่าเดิม)" : "วาง token"} autoComplete="off" /></Label>
        <Label text="ส่งถึง (User ID / Group ID)"><input className={field} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Uxxxxxxxx หรือ Cxxxxxxxx" /></Label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button disabled={pending} className={btnPrimary} onClick={() => run(() => saveLine(slug, { lineTo: to, lineToken: tok || undefined }), { success: "บันทึกแล้ว ✓", onOk: () => setTok("") })}>บันทึก</button>
        <button disabled={pending || !hasToken} className={btnGhost} onClick={() => run(() => testLine(slug), { success: "ส่งข้อความทดสอบแล้ว ✓" })}>ส่งทดสอบ</button>
        {hasToken && <button disabled={pending} className="text-xs text-red-600 underline" onClick={() => confirm("ยกเลิกการเชื่อมต่อ LINE?") && run(() => saveLine(slug, { lineTo: "", clear: true }))}>ยกเลิกการเชื่อมต่อ</button>}
        <Msg />
      </div>
    </Card>
  );
}
