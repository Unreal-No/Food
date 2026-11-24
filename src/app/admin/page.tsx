import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listShops } from "@/lib/catalog";
import { logout } from "./actions";

export const metadata = { title: "หลังบ้าน" };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">เลือกร้าน</h1>
        <form action={logout}><button className="text-sm text-stone-500 hover:text-stone-900">ออกจากระบบ</button></form>
      </div>
      <Suspense><Shops /></Suspense>
    </main>
  );
}

async function Shops() {
  await requireAdmin();
  const shops = await listShops();
  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
      {shops.map((s) => (
        <li key={s.slug}>
          <Link href={`/admin/${s.slug}`} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
            <span className="grid size-12 place-items-center rounded-xl text-2xl" style={{ background: s.theme.primary }}>{s.theme.heroEmoji}</span>
            <span><span className="block font-semibold">{s.name}</span><span className="text-sm text-stone-500">/{s.slug}</span></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
