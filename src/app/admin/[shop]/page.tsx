import { Suspense } from "react";
import Link from "next/link";
import { adminOrders, adminShop } from "@/lib/admin-data";
import { baht } from "@/lib/pricing";
import { OrderBoard } from "@/components/admin/OrderBoard";
import { LiveRefresh } from "@/components/LiveRefresh";

export default function Page({ params }: PageProps<"/admin/[shop]">) {
  return <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-white" />}><Dashboard params={params} /></Suspense>;
}

async function Dashboard({ params }: { params: PageProps<"/admin/[shop]">["params"] }) {
  const { shop: slug } = await params;
  const shop = await adminShop(slug, "dashboard");
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const today = await adminOrders(shop.id, { since, limit: 500 });
  const valid = today.filter((o) => o.status !== "cancelled");
  const revenue = valid.filter((o) => o.status !== "pending_payment").reduce((a, o) => a + o.total, 0);
  const active = today.filter((o) => !["completed", "cancelled"].includes(o.status));

  const top = new Map<string, number>();
  valid.flatMap((o) => o.items).forEach((i) => top.set(i.name, (top.get(i.name) ?? 0) + i.qty));
  const best = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const stats = [
    ["ยอดขายวันนี้", baht(revenue)], ["ออเดอร์วันนี้", String(valid.length)],
    ["กำลังดำเนินการ", String(active.length)], ["เฉลี่ย/บิล", baht(valid.length ? Math.round(revenue / Math.max(1, valid.filter((o) => o.status !== "pending_payment").length)) : 0)],
  ];

  return (
    <>
      <LiveRefresh url={`/api/admin/${slug}/events`} />
      <h1 className="font-display text-2xl font-semibold">{shop.name}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs text-stone-500">{k}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">ออเดอร์ที่ต้องทำ</h2><Link href={`/admin/${slug}/orders`} className="text-sm text-stone-500">ทั้งหมด →</Link></div>
          <OrderBoard orders={active} slug={slug} />
        </div>
        <div className="h-fit rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-3 font-semibold">ขายดีวันนี้</h2>
          {best.length ? (
            <ol className="space-y-2 text-sm">{best.map(([n, q], i) => <li key={n} className="flex justify-between"><span>{i + 1}. {n}</span><b>{q}</b></li>)}</ol>
          ) : <p className="text-sm text-stone-500">ยังไม่มีข้อมูล</p>}
        </div>
      </div>
    </>
  );
}
