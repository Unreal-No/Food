import { Suspense } from "react";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { adminShop } from "@/lib/admin-data";
import { baht } from "@/lib/pricing";
import { CouponManager } from "@/components/admin/CouponManager";

export default function Page({ params }: PageProps<"/admin/[shop]/marketing">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}><Marketing params={params} /></Suspense>;
}

async function Marketing({ params }: { params: PageProps<"/admin/[shop]/marketing">["params"] }) {
  const { shop: slug } = await params;
  const shop = await adminShop(slug, "marketing");
  const db = await getDb();
  const [coupons, members] = await Promise.all([
    db.select().from(s.coupons).where(eq(s.coupons.shopId, shop.id)).orderBy(asc(s.coupons.code)),
    db.select().from(s.customers).where(eq(s.customers.shopId, shop.id)).orderBy(desc(s.customers.totalSpent)).limit(50),
  ]);
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">คูปอง & สมาชิก</h1>
      <CouponManager slug={slug} coupons={coupons.map((c) => ({
        id: c.id, code: c.code, kind: c.kind, value: c.kind === "percent" ? c.value : c.value / 100, minTotal: c.minTotal / 100,
        maxUses: c.maxUses, used: c.used, active: c.active,
        expiresAt: c.expiresAt ? c.expiresAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }) : null,
      }))} />
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <h2 className="border-b border-black/5 px-4 py-3 font-semibold">สมาชิกยอดซื้อสูงสุด <span className="text-sm font-normal text-stone-400">(สะสมอัตโนมัติจากเบอร์โทร เมื่อออเดอร์เสร็จสิ้น · 1 แต้ม/฿10)</span></h2>
        {members.length ? (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500"><tr><th className="px-4 py-2">ลูกค้า</th><th>เบอร์</th><th className="text-right">มา</th><th className="text-right">ยอดรวม</th><th className="px-4 text-right">แต้ม</th></tr></thead>
            <tbody className="divide-y divide-black/5">
              {members.map((m) => (
                <tr key={m.id}><td className="px-4 py-2">{m.name || "—"}</td><td className="tabular-nums">{m.phone}</td><td className="text-right tabular-nums">{m.visits}</td><td className="text-right tabular-nums">{baht(m.totalSpent)}</td><td className="px-4 text-right font-semibold tabular-nums">{m.points}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="p-8 text-center text-sm text-stone-500">ยังไม่มีสมาชิก</p>}
      </section>
    </>
  );
}
