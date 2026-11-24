import "server-only";
import { notFound } from "next/navigation";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { requireAdmin } from "./auth";
import { getShop, loadCatalog } from "./catalog";

export async function adminShop(slug: string) {
  await requireAdmin();
  const shop = await getShop(slug);
  if (!shop) notFound();
  return shop;
}

export async function adminCatalog(slug: string) {
  const shop = await adminShop(slug);
  return { shop, ...(await loadCatalog(shop.id, true)) };
}

export async function adminOrders(shopId: string, opts: { since?: Date; limit?: number } = {}) {
  const db = await getDb();
  const orders = await db.select().from(s.orders)
    .where(and(eq(s.orders.shopId, shopId), opts.since ? gte(s.orders.createdAt, opts.since) : undefined))
    .orderBy(desc(s.orders.createdAt)).limit(opts.limit ?? 100);
  const items = orders.length
    ? await db.select().from(s.orderItems).where(inArray(s.orderItems.orderId, orders.map((o) => o.id)))
    : [];
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}
export type AdminOrder = Awaited<ReturnType<typeof adminOrders>>[number];
