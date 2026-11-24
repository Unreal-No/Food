"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCart, useCartItems } from "@/lib/cart";
import { baht } from "@/lib/pricing";
import { placeOrder } from "@/app/actions/order";
import { ProductStage, useHydrated } from "./Storefront";

const input = "h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-brand";

export function CheckoutForm({ shop, shopName }: { shop: string; shopName: string }) {
  const hydrated = useHydrated();
  const items = useCartItems(shop);
  const clear = useCart((s) => s.clear);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [f, setF] = useState({ channel: "takeaway" as "dine_in" | "takeaway", tableCode: "", customerName: "", customerPhone: "", note: "" });
  const total = items.reduce((a, i) => a + i.unitPrice * i.qty, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await placeOrder(shop, {
        ...f, items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, optionIds: i.optionIds, qty: i.qty })),
      });
      if ("error" in r) return setError(r.error);
      clear(shop);
      router.push(`/${shop}/order/${r.id}`);
    });
  };

  if (!hydrated) return null;

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="space-y-6">
        <Link href={`/${shop}`} className="text-sm text-ink/55 hover:text-ink">← กลับไปที่ {shopName}</Link>
        <h1 className="font-display text-3xl font-semibold">ยืนยันคำสั่งซื้อ</h1>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/5 p-1">
          {([["takeaway", "🛍️ รับกลับบ้าน"], ["dine_in", "🍽️ ทานที่ร้าน"]] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setF({ ...f, channel: v })}
              className={`h-11 rounded-xl text-sm font-medium transition ${f.channel === v ? "bg-card shadow" : "text-ink/60"}`}>{label}</button>
          ))}
        </div>

        {f.channel === "dine_in" && (
          <label className="block space-y-1.5 text-sm font-medium">เลขโต๊ะ
            <input className={input} value={f.tableCode} onChange={(e) => setF({ ...f, tableCode: e.target.value })} placeholder="เช่น A3" required />
          </label>
        )}
        <label className="block space-y-1.5 text-sm font-medium">ชื่อ
          <input className={input} value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} required autoComplete="name" />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">เบอร์โทร
          <input className={input} value={f.customerPhone} onChange={(e) => setF({ ...f, customerPhone: e.target.value.replace(/\D/g, "") })}
            inputMode="tel" pattern="0\d{8,9}" required autoComplete="tel" placeholder="0812345678" />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">หมายเหตุถึงร้าน
          <textarea className={`${input} h-24 py-3`} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={200} />
        </label>

        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={pending || !items.length} className="flex h-14 w-full items-center justify-between rounded-full bg-brand px-6 font-medium text-card disabled:opacity-50">
          <span>{pending ? "กำลังส่ง…" : "สั่งและชำระด้วย PromptPay"}</span><span className="tabular-nums">{baht(total)}</span>
        </button>
      </form>

      <aside className="h-fit space-y-3 rounded-[28px] bg-card p-5 ring-1 ring-black/5 md:sticky md:top-6">
        <h2 className="font-display font-semibold">รายการ ({items.length})</h2>
        {items.length === 0 && <p className="text-sm text-ink/50">ตะกร้าว่าง</p>}
        {items.map((i) => (
          <div key={i.key} className="flex items-center gap-3 text-sm">
            <div className="size-12 shrink-0 rounded-xl"><ProductStage emoji={i.emoji} size="sm" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{i.qty}× {i.name}</p>
              <p className="truncate text-xs text-ink/55">{[i.variantName, ...i.optionNames].filter(Boolean).join(" · ")}</p>
            </div>
            <span className="tabular-nums">{baht(i.unitPrice * i.qty)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-black/5 pt-3 font-display text-lg font-semibold"><span>รวม</span><span>{baht(total)}</span></div>
      </aside>
    </main>
  );
}
