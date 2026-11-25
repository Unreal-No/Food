import { Suspense } from "react";
import Link from "next/link";
import { adminShop } from "@/lib/admin-data";
import { shopAnalytics } from "@/lib/analytics";
import { baht } from "@/lib/pricing";
import { ColumnChart, SplitBar } from "@/components/admin/charts";

export const metadata = { title: "สถิติ" };
const RANGES = [7, 30, 90] as const;
const TH_DAY = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });

export default function Page({ params, searchParams }: PageProps<"/admin/[shop]/analytics">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}><Analytics params={params} searchParams={searchParams} /></Suspense>;
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return <span className="text-xs text-stone-400">ไม่มีข้อมูลช่วงก่อน</span>;
  const d = Math.round(((cur - prev) / prev) * 100);
  return <span className={`text-xs font-medium ${d >= 0 ? "text-[#006c10]" : "text-red-700"}`}>{d >= 0 ? "▲" : "▼"} {Math.abs(d)}% จากช่วงก่อน</span>;
}

async function Analytics({ params, searchParams }: Pick<PageProps<"/admin/[shop]/analytics">, "params" | "searchParams">) {
  const { shop: slug } = await params;
  const r = Number((await searchParams).range);
  const days = (RANGES as readonly number[]).includes(r) ? r : 7;
  const shop = await adminShop(slug, "dashboard");
  const a = await shopAnalytics(shop.id, days);
  const maxTop = Math.max(1, ...a.top.map((t) => t.revenue));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">สถิติร้าน</h1>
        <nav className="flex rounded-xl bg-white p-1 text-sm ring-1 ring-black/5" aria-label="ช่วงเวลา">
          {RANGES.map((d) => (
            <Link key={d} href={`?range=${d}`} aria-current={d === days ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 ${d === days ? "bg-stone-900 font-semibold text-white" : "text-stone-600 hover:bg-black/5"}`}>{d} วัน</Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["ยอดขาย", baht(a.revenue), <Delta key="r" cur={a.revenue} prev={a.prevRevenue} />],
          ["ออเดอร์", a.orders.toLocaleString("th-TH"), <Delta key="o" cur={a.orders} prev={a.prevOrders} />],
          ["เฉลี่ยต่อบิล", baht(a.avg), <span key="d" className="text-xs text-stone-400">ไม่รวมบิลรอชำระ/ยกเลิก</span>],
          ["ส่วนลดคูปอง", baht(a.discount), <span key="c" className="text-xs text-stone-400">ยกเลิก {a.cancelled} บิล</span>],
        ].map(([k, v, sub]) => (
          <div key={k as string} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs text-stone-500">{k}</p><p className="mt-1 text-2xl font-semibold text-stone-900">{v}</p>{sub}
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <ColumnChart label={`ยอดขายรายวัน (${days} วัน)`} unit="baht"
          data={a.daily.map((d) => ({ key: d.date, tick: TH_DAY.format(new Date(d.date)), title: `${TH_DAY.format(new Date(d.date))} · ${d.orders} บิล`, value: d.revenue }))} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <ColumnChart label="ออเดอร์ตามช่วงเวลา (ชั่วโมงที่สั่ง)" height={180} unit="orders"
            data={a.hourly.map((v, h) => ({ key: String(h), tick: `${h}`, title: `${String(h).padStart(2, "0")}:00–${String(h).padStart(2, "0")}:59`, value: v }))} />
        </section>
        <section className="space-y-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <SplitBar label="ช่องทาง" parts={[{ name: "ทานที่ร้าน", value: a.channel.dine_in }, { name: "กลับบ้าน", value: a.channel.takeaway }]} />
          <SplitBar label="การชำระเงิน" parts={[{ name: "PromptPay", value: a.payment.promptpay }, { name: "เคาน์เตอร์", value: a.payment.counter }]} />
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <h2 className="border-b border-black/5 px-5 py-3 text-sm font-semibold">เมนูทำเงินสูงสุด</h2>
        {a.top.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-stone-500"><tr><th className="px-5 py-2">เมนู</th><th className="text-right">ขาย (ชิ้น)</th><th className="w-1/3 px-5">ยอดขาย</th></tr></thead>
            <tbody className="divide-y divide-black/5">
              {a.top.map((t) => (
                <tr key={t.name}>
                  <td className="px-5 py-2 text-stone-900">{t.name}</td><td className="text-right tabular-nums">{t.qty}</td>
                  <td className="px-5"><div className="flex items-center gap-2"><div className="h-2 rounded-r" style={{ width: `${(t.revenue / maxTop) * 70}%`, background: "#257de0" }} /><span className="tabular-nums text-stone-700">{baht(t.revenue)}</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="p-8 text-center text-sm text-stone-500">ยังไม่มียอดขายในช่วงนี้</p>}
      </section>
    </>
  );
}
