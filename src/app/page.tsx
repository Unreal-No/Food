import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { listShops } from "@/lib/catalog";

const TYPE = { cafe: "คาเฟ่", restaurant: "ร้านอาหาร", retail: "ร้านค้า" } as const;

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-ink/50">Virtual Storefront</p>
      <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">เดินเข้าร้านได้ จากทุกที่</h1>
      <p className="mt-3 max-w-xl text-ink/60">เลือกร้านเพื่อเริ่มช้อป หรือเข้า <Link className="underline" href="/admin">หลังบ้าน</Link> เพื่อจัดการร้าน</p>
      <Suspense fallback={<div className="mt-10 h-48 animate-pulse rounded-3xl bg-black/5" />}>
        <ShopList />
      </Suspense>
    </main>
  );
}

async function ShopList() {
  await connection();
  const shops = await listShops();
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {shops.map((s) => (
        <Link key={s.slug} href={`/${s.slug}`} style={{ background: s.theme.primary, color: s.theme.surface }}
          className="group relative overflow-hidden rounded-[28px] p-7 transition hover:-translate-y-1 hover:shadow-2xl">
          <span className="absolute -right-6 -top-6 text-[9rem] opacity-90 transition duration-500 group-hover:rotate-12 group-hover:scale-110">{s.theme.heroEmoji}</span>
          <span className="relative text-xs uppercase tracking-widest opacity-70">{TYPE[s.type]}</span>
          <h2 className="relative mt-14 font-display text-2xl font-semibold">{s.name}</h2>
          <p className="relative mt-1 text-sm opacity-75">{s.tagline}</p>
        </Link>
      ))}
    </div>
  );
}
