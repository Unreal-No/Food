"use client";
import { useActionState } from "react";
import { login } from "../actions";
import { btnPrimary, field } from "@/components/admin/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <main className="grid min-h-dvh place-items-center bg-stone-100 px-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/5">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500">Virtual Storefront</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">เข้าสู่หลังบ้าน</h1>
        </div>
        <input name="username" placeholder="ชื่อผู้ใช้" className={field} required autoFocus autoComplete="username" autoCapitalize="none" />
        <input name="password" type="password" placeholder="รหัสผ่าน" className={field} required autoComplete="current-password" />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button disabled={pending} className={`${btnPrimary} w-full`}>{pending ? "กำลังเข้า…" : "เข้าสู่ระบบ"}</button>
      </form>
    </main>
  );
}
