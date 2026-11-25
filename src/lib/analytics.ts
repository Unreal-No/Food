import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

// ประเทศไทยไม่มี DST → แปลงเวลาเป็น Asia/Bangkok ด้วย +7 ชม.
const TZ = 7 * 3600_000;
const dayKey = (d: Date) => new Date(d.getTime() + TZ).toISOString().slice(0, 10);
const REVENUE = new Set(["paid", "preparing", "ready", "completed"]); // ไม่นับ รอชำระ/ยกเลิก

export async function shopAnalytics(shopId: string, days: number, now = new Date()) {
  const db = await getDb();
  const today0 = new Date(Math.floor((now.getTime() + TZ) / 86400_000) * 86400_000 - TZ); // เที่ยงคืนวันนี้ (BKK)
  const since = new Date(today0.getTime() - (days - 1) * 86400_000);
  const prevSince = new Date(since.getTime() - days * 86400_000);
  const [orders, items] = await Promise.all([
    db.select().from(s.orders).where(and(eq(s.orders.shopId, shopId), gte(s.orders.createdAt, prevSince))),
    db.select({ orderId: s.orderItems.orderId, name: s.orderItems.name, qty: s.orderItems.qty, unitPrice: s.orderItems.unitPrice })
      .from(s.orderItems).innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .where(and(eq(s.orders.shopId, shopId), gte(s.orders.createdAt, since))),
  ]);
  const sold = orders.filter((o) => REVENUE.has(o.status));
  const cur = sold.filter((o) => o.createdAt >= since), prev = sold.filter((o) => o.createdAt < since);
  const sum = (xs: typeof sold) => xs.reduce((a, o) => a + o.total, 0);

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) byDay.set(dayKey(new Date(since.getTime() + i * 86400_000)), { revenue: 0, orders: 0 });
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const o of cur) {
    const d = byDay.get(dayKey(o.createdAt));
    if (d) { d.revenue += o.total; d.orders += 1; }
    byHour[new Date(o.createdAt.getTime() + TZ).getUTCHours()] += 1;
  }
  const curIds = new Set(cur.map((o) => o.id));
  const top = new Map<string, { qty: number; revenue: number }>();
  for (const i of items) {
    if (!curIds.has(i.orderId)) continue;
    const t = top.get(i.name) ?? { qty: 0, revenue: 0 };
    t.qty += i.qty; t.revenue += i.qty * i.unitPrice; top.set(i.name, t);
  }

  return {
    days,
    revenue: sum(cur), prevRevenue: sum(prev),
    orders: cur.length, prevOrders: prev.length,
    avg: cur.length ? Math.round(sum(cur) / cur.length) : 0,
    discount: cur.reduce((a, o) => a + o.discount, 0),
    cancelled: orders.filter((o) => o.createdAt >= since && o.status === "cancelled").length,
    daily: [...byDay].map(([date, v]) => ({ date, ...v })),
    hourly: byHour,
    channel: { dine_in: cur.filter((o) => o.channel === "dine_in").length, takeaway: cur.filter((o) => o.channel === "takeaway").length },
    payment: { promptpay: cur.filter((o) => o.payment === "promptpay").length, counter: cur.filter((o) => o.payment === "counter").length },
    top: [...top].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
  };
}
export type Analytics = Awaited<ReturnType<typeof shopAnalytics>>;
