import { Suspense } from "react";
import { requireShop, can } from "@/lib/auth";
import { adminOrders } from "@/lib/admin-data";
import { KitchenBoard } from "@/components/admin/KitchenBoard";

export const metadata = { title: "จอครัว" };
const dayAgo = () => new Date(Date.now() - 24 * 3600_000); // บิลค้างไม่เกิน 24 ชม.

export default function Page({ params }: PageProps<"/admin/[shop]/kitchen">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-stone-800" />}><Kitchen params={params} /></Suspense>;
}

async function Kitchen({ params }: { params: PageProps<"/admin/[shop]/kitchen">["params"] }) {
  const { shop: slug } = await params;
  const { ses, shop } = await requireShop(slug, "kitchen");
  const since = dayAgo();
  const orders = (await adminOrders(shop.id, { since, limit: 200 })).filter((o) => o.status !== "completed" && o.status !== "cancelled");
  return (
    <KitchenBoard slug={slug} canComplete={can(ses, "orders")}
      orders={orders.map((o) => ({
        id: o.id, code: o.code, status: o.status, payment: o.payment, channel: o.channel, tableCode: o.tableCode,
        customerName: o.customerName, note: o.note, createdAt: o.createdAt.toISOString(),
        items: o.items.map((i) => ({ id: i.id, qty: i.qty, name: i.name, detail: [i.variantName, ...i.options.map((x) => x.name)].filter(Boolean).join(" · ") })),
      }))} />
  );
}
