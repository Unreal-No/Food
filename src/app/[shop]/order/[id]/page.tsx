import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { and, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb, schema as s } from "@/db";
import { getStorefront } from "@/lib/catalog";
import { baht } from "@/lib/pricing";
import { promptpayPayload } from "@/lib/promptpay";
import { ThemeScope } from "@/components/theme";
import { LiveRefresh } from "@/components/LiveRefresh";
import { STATUS_STEPS, STATUS_LABEL } from "@/lib/status";

export const metadata = { title: "คำสั่งซื้อ" };

export default function Page({ params }: PageProps<"/[shop]/order/[id]">) {
  return <Suspense><Order params={params} /></Suspense>;
}

async function Order({ params }: { params: PageProps<"/[shop]/order/[id]">["params"] }) {
  await connection();
  const { shop: slug, id } = await params;
  const data = await getStorefront(slug);
  if (!data || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [order] = await db.select().from(s.orders).where(and(eq(s.orders.id, id), eq(s.orders.shopId, data.shop.id)));
  if (!order) notFound();
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id));
  const qr = order.status === "pending_payment" && order.payment === "promptpay" && data.shop.promptpayId
    ? await QRCode.toString(promptpayPayload(data.shop.promptpayId, order.total), { type: "svg", margin: 1 })
    : null;
  const step = STATUS_STEPS.indexOf(order.status);

  return (
    <ThemeScope theme={data.shop.theme}>
      {order.status !== "completed" && order.status !== "cancelled" && <LiveRefresh url={`/api/orders/${order.id}/events`} fallbackMs={20_000} />}
      <main className="mx-auto max-w-md px-4 py-8">
        <Link href={`/${slug}`} className="text-sm text-ink/55">← {data.shop.name}</Link>
        <div className="mt-4 rounded-[32px] bg-card p-6 text-center shadow-xl ring-1 ring-black/5">
          <p className="text-sm text-ink/55">หมายเลขคำสั่งซื้อ</p>
          <p className="font-display text-5xl font-bold tracking-wider text-brand">#{order.code}</p>
          <p className="mt-2 text-sm text-ink/60">{order.channel === "dine_in" ? `ทานที่ร้าน · โต๊ะ ${order.tableCode}` : "รับกลับบ้าน"} · {order.customerName}</p>

          {order.status === "cancelled" ? (
            <p className="mt-6 rounded-2xl bg-red-50 py-3 text-red-700">ยกเลิกแล้ว</p>
          ) : (
            <ol className="mt-6 grid grid-cols-5 gap-1 text-[11px]">
              {STATUS_STEPS.map((st, i) => (
                <li key={st} className={i <= step ? "text-brand" : "text-ink/35"}>
                  <span className={`mx-auto mb-1 block h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-black/10"}`} />
                  {STATUS_LABEL[st]}
                </li>
              ))}
            </ol>
          )}

          {order.status === "pending_payment" && order.payment === "counter" && (
            <div className="mt-6 rounded-3xl bg-accent/25 p-5">
              <p className="text-3xl">💵</p>
              <p className="mt-1 font-medium">ชำระที่เคาน์เตอร์ <span className="font-display text-xl">{baht(order.total)}</span></p>
              <p className="text-xs text-ink/55">ครัวเริ่มทำแล้ว แจ้งเลขออเดอร์ #{order.code} ตอนชำระ</p>
            </div>
          )}
          {qr && (
            <div className="mt-6 rounded-3xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-sm font-medium text-[#113566]">สแกนจ่ายด้วย PromptPay</p>
              <div className="mx-auto mt-2 w-56 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="font-display text-2xl font-semibold text-[#113566]">{baht(order.total)}</p>
              <p className="mt-1 text-xs text-ink/50">ร้านจะยืนยันเมื่อได้รับยอดโอน หน้านี้อัปเดตอัตโนมัติ</p>
            </div>
          )}
        </div>

        <ul className="mt-6 space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>{i.qty}× {i.name}<span className="block text-xs text-ink/55">{[i.variantName, ...i.options.map((o) => o.name)].filter(Boolean).join(" · ")}</span></span>
              <span className="tabular-nums">{baht(i.unitPrice * i.qty)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-black/10 pt-2 font-semibold"><span>รวม</span><span>{baht(order.total)}</span></li>
        </ul>
      </main>
    </ThemeScope>
  );
}
