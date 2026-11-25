import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { can, requireSession } from "@/lib/auth";
import { listShops } from "@/lib/catalog";
import { logout } from "./actions";
import { CreateShop } from "@/components/admin/CreateShop";

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
  const ses = await requireSession();
  if (!ses.super) {
    // พนักงานเข้าร้านตัวเองทันที (ครัว → จอครัว)
    const [shop] = await (await getDb()).select({ slug: s.shops.slug }).from(s.shops).where(eq(s.shops.id, ses.shopId));
    redirect(`/admin/${shop.slug}${can(ses, "dashboard") ? "" : "/kitchen"}`);
  }
  const shops = await listShops();
  return (
    <>
    <CreateShop />
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
      {shops.map((sh) => (
        <li key={sh.slug}>
          <Link href={`/admin/${sh.slug}`} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
            <span className="grid size-12 place-items-center rounded-xl text-2xl" style={{ background: sh.theme.primary }}>{sh.theme.heroEmoji}</span>
            <span><span className="block font-semibold">{sh.name}</span><span className="text-sm text-stone-500">/{sh.slug}</span></span>
          </Link>
        </li>
      ))}
    </ul>
    </>
  );
}
