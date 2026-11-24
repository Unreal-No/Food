import { Suspense } from "react";
import { adminOrders, adminShop } from "@/lib/admin-data";
import { OrderBoard } from "@/components/admin/OrderBoard";
import { LiveRefresh } from "@/components/LiveRefresh";

export default function Page({ params }: PageProps<"/admin/[shop]/orders">) {
  return <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-white" />}><Orders params={params} /></Suspense>;
}

async function Orders({ params }: { params: PageProps<"/admin/[shop]/orders">["params"] }) {
  const { shop: slug } = await params;
  const shop = await adminShop(slug, "orders");
  const orders = await adminOrders(shop.id, { limit: 60 });
  return (
    <>
      <LiveRefresh url={`/api/admin/${slug}/events`} />
      <h1 className="font-display text-2xl font-semibold">ออเดอร์ล่าสุด</h1>
      <OrderBoard orders={orders} slug={slug} />
    </>
  );
}
