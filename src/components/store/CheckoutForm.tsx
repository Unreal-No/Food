"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCart, useCartItems } from "@/lib/cart";
import { baht } from "@/lib/pricing";
import { checkCoupon, placeOrder } from "@/app/actions/order";
import { ProductStage, useHydrated } from "./Storefront";

const input = "h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-brand";

export function CheckoutForm({ shop, shopName }: { shop: string; shopName: string }) {
  const hydrated = useHydrated();
  const items = useCartItems(shop);
  const table = useCart((s) => s.tables[shop]);
  const [payment, setPayment] = useState<"promptpay" | "counter">("promptpay");
  const clear = useCart((s) => s.clear);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [f, setF] = useState({ channel: "takeaway" as "dine_in" | "takeaway", tableCode: "", customerName: "", customerPhone: "", note: "" });
  const subtotal = items.reduce((a, i) => a + i.unitPrice * i.qty, 0);
  const [coupon, setCoupon] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number; at: number } | null>(null);
  const [promoErr, setPromoErr] = useState("");
  const active = promo && promo.at === subtotal ? promo : null; // ตะกร้าเปลี่ยน = ต้องกดใช้ใหม่
  const total = subtotal - (active?.discount ?? 0);
  const applyCoupon = () => start(async () => {
    const r = await checkCoupon(shop, coupon, subtotal);
    if ("error" in r) { setPromo(null); setPromoErr(r.error ?? ""); } else { setPromo({ ...r, at: subtotal }); setPromoErr(""); }
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await placeOrder(shop, {
        ...f, payment, couponCode: active?.code ?? "", ...(table ? { channel: "dine_in" as const, tableToken: table.token, tableCode: table.code } : {}),
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, optionIds: i.optionIds, qty: i.qty })),
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

        {table ? (
          <p className="rounded-2xl bg-accent/40 px-4 py-3 font-medium">🪑 ทานที่ร้าน · โต๊ะ {table.code}</p>
        ) : <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/5 p-1">
          {([["takeaway", "🛍️ รับกลับบ้าน"], ["dine_in", "🍽️ ทานที่ร้าน"]] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setF({ ...f, channel: v })}
              className={`h-11 rounded-xl text-sm font-medium transition ${f.channel === v ? "bg-card shadow" : "text-ink/60"}`}>{label}</button>
          ))}
        </div>}

        {!table && f.channel === "dine_in" && (
          <label className="block space-y-1.5 text-sm font-medium">เลขโต๊ะ
            <input className={input} value={f.tableCode} onChange={(e) => setF({ ...f, tableCode: e.target.value })} placeholder="เช่น A3" required />
          </label>
        )}
        <label className="block space-y-1.5 text-sm font-medium">ชื่อ
          <input className={input} value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} required autoComplete="name" />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">เบอร์โทร{table || f.channel === "dine_in" ? <span className="font-normal text-ink/50"> (ไม่บังคับ)</span> : ""}
          <input className={input} value={f.customerPhone} onChange={(e) => setF({ ...f, customerPhone: e.target.value.replace(/\D/g, "") })}
            inputMode="tel" pattern="0\d{8,9}" required={!table && f.channel === "takeaway"} autoComplete="tel" placeholder="0812345678" />
        </label>
        <fieldset className="space-y-1.5 text-sm font-medium">
          <legend className="mb-1.5">ชำระเงิน</legend>
          <div className="grid grid-cols-2 gap-2">
            {([["promptpay", "📱 PromptPay QR"], ["counter", "💵 จ่ายที่เคาน์เตอร์"]] as const).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setPayment(v)}
                className={`h-12 rounded-2xl text-sm ring-1 transition ${payment === v ? "bg-brand text-card ring-brand" : "bg-card ring-black/10"}`}>{label}</button>
            ))}
          </div>
        </fieldset>
        <label className="block space-y-1.5 text-sm font-medium">หมายเหตุถึงร้าน
          <textarea className={`${input} h-24 py-3`} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={200} />
        </label>

        <div className="space-y-1.5 text-sm font-medium">
          <span>คูปองส่วนลด</span>
          <div className="flex gap-2">
            <input className={input} value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="เช่น WELCOME10" aria-label="คูปอง" />
            <button type="button" disabled={!coupon.trim() || pending} onClick={applyCoupon} className="h-12 shrink-0 rounded-2xl bg-ink px-5 text-card disabled:opacity-40">ใช้</button>
          </div>
          {active && <p className="text-emerald-700">✓ {active.code} ลด {baht(active.discount)}</p>}
          {promoErr && <p className="text-red-600">{promoErr}</p>}
        </div>

        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={pending || !items.length} className="flex h-14 w-full items-center justify-between rounded-full bg-brand px-6 font-medium text-card disabled:opacity-50">
          <span>{pending ? "กำลังส่ง…" : payment === "promptpay" ? "สั่งและชำระด้วย PromptPay" : "ยืนยันสั่ง"}</span><span className="tabular-nums">{baht(total)}</span>
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
        {active && <div className="flex justify-between border-t border-black/5 pt-3 text-sm text-emerald-700"><span>ส่วนลด {active.code}</span><span>−{baht(active.discount)}</span></div>}
        <div className="flex justify-between border-t border-black/5 pt-3 font-display text-lg font-semibold"><span>รวม</span><span>{baht(total)}</span></div>
      </aside>
    </main>
  );
}
