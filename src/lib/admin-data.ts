import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { requireShop } from "./auth";
import type { Perm } from "./perms";
import { loadCatalog } from "./catalog";

export async function adminShop(slug: string, perm: Perm) {
  return (await requireShop(slug, perm)).shop;
}

export async function adminCatalog(slug: string, perm: Perm = "catalog") {
  const shop = await adminShop(slug, perm);
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
  const phones = [...new Set(orders.map((o) => o.customerPhone).filter(Boolean))];
  const members = phones.length
    ? await db.select({ phone: s.customers.phone, points: s.customers.points }).from(s.customers).where(and(eq(s.customers.shopId, shopId), inArray(s.customers.phone, phones)))
    : [];
  const pts = new Map(members.map((m) => [m.phone, m.points]));
  return orders.map((o) => ({ ...o, memberPoints: pts.get(o.customerPhone) ?? 0, items: items.filter((i) => i.orderId === o.id) }));
}
export type AdminOrder = Awaited<ReturnType<typeof adminOrders>>[number];
