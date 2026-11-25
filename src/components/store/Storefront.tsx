"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { baht, defaultSelection, fromPrice, priceLine, type CatalogProduct, type Selection } from "@/lib/pricing";
import { itemKey, useCart, useCartItems } from "@/lib/cart";
import { ProductStage } from "./ProductStage";
import { MediaView } from "@/components/media/MediaView";
import { has3D, selectionVisual } from "@/lib/visual";
import { clearHash, getHash, hasWebGL, noopSubscribe, subscribeHash } from "@/lib/browser";
import { WalkIn, type WalkData } from "./WalkIn";
import { lookupTable } from "@/app/admin/actions";
import { Barista } from "./Barista";
export { ProductStage };

type Category = { id: string; name: string; icon: string };

export const useHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false);

function tilt(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
  el.style.transform = `perspective(700px) rotateX(${-y * 10}deg) rotateY(${x * 12}deg) translateY(-4px)`;
}
const untilt = (e: PointerEvent<HTMLElement>) => { e.currentTarget.style.transform = ""; };

function ProductCard({ p, onOpen, i }: { p: CatalogProduct; onOpen: () => void; i: number }) {
  const sold = p.status === "soldout";
  return (
    <button
      onClick={onOpen} disabled={sold} onPointerMove={tilt} onPointerLeave={untilt}
      style={{ animationDelay: `${i * 50}ms` }}
      className="group relative animate-rise rounded-[28px] bg-card p-2.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/5 transition-[transform,box-shadow] duration-300 will-change-transform hover:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.25)] disabled:opacity-60"
    >
      <div className="relative rounded-[22px]">
        <ProductStage emoji={p.emoji} image={p.media[0]?.type === "photo" ? p.media[0].url : p.media[0]?.type === "turntable" ? p.media[0].frames[0] : undefined} />
        {p.badge && <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-card">{p.badge}</span>}
        {p.media[0] && <span className="absolute right-2.5 top-2.5 rounded-full bg-card/85 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink/70 backdrop-blur">{has3D(p.media[0]) ? "3D" : p.media[0].type === "turntable" ? "360°" : "📷"}</span>}
        {sold && <span className="absolute inset-0 grid place-items-center rounded-[22px] bg-card/60 font-display text-lg font-semibold">หมดแล้ว</span>}
      </div>
      <div className="px-1.5 pb-1.5 pt-3">
        <h3 className="font-display text-[15px] font-semibold leading-tight">{p.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5em] text-xs text-ink/60">{p.description}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display font-semibold text-brand">{p.variants.length > 1 && <span className="text-xs font-normal text-ink/50">เริ่ม </span>}{baht(fromPrice(p))}</span>
          <span className="grid size-8 place-items-center rounded-full bg-brand text-lg leading-none text-card transition group-hover:rotate-90">+</span>
        </div>
      </div>
    </button>
  );
}

/* ---------- เลือกตัวเลือกสินค้า ---------- */
function ProductSheet({ p, shop, onClose }: { p: CatalogProduct; shop: string; onClose: () => void }) {
  const [sel, setSel] = useState<Selection>(() => defaultSelection(p));
  const add = useCart((s) => s.add);
  const line = priceLine(p, sel);
  const visual = useMemo(() => selectionVisual(p, sel), [p, sel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const toggle = (gId: string, oId: string) => setSel((s) => {
    const g = p.groups.find((x) => x.id === gId)!;
    const inGroup = s.optionIds.filter((id) => g.options.some((o) => o.id === id));
    const others = s.optionIds.filter((id) => !inGroup.includes(id));
    if (g.maxSelect === 1) return { ...s, optionIds: [...others, oId] };
    if (inGroup.includes(oId)) return { ...s, optionIds: s.optionIds.filter((id) => id !== oId) };
    if (inGroup.length >= g.maxSelect) return s;
    return { ...s, optionIds: [...s.optionIds, oId] };
  });

  const submit = () => {
    if (!line.ok) return;
    add(shop, {
      key: itemKey(p.id, sel.variantId, sel.optionIds), productId: p.id, name: p.name, emoji: p.emoji,
      variantId: sel.variantId, variantName: line.variant?.name ?? "", optionIds: sel.optionIds,
      optionNames: line.chosen.map((c) => c.name), unitPrice: line.unitPrice, qty: sel.qty,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal aria-label={p.name}>
      <div className="absolute inset-0 animate-fade bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full animate-sheet flex-col overflow-hidden rounded-t-[32px] bg-card shadow-2xl md:max-w-lg md:rounded-[32px]">
        <button onClick={onClose} aria-label="ปิด" className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-card/80 text-xl backdrop-blur">×</button>
        <div className="overflow-y-auto">
          <div className="aspect-square overflow-hidden rounded-b-[32px] md:aspect-[5/4]"><MediaView media={p.media[0]} resolved={visual} emoji={p.emoji} alt={p.name} /></div>
          <div className="space-y-6 p-6">
            <div>
              <h2 className="font-display text-2xl font-semibold">{p.name}</h2>
              <p className="mt-1 text-sm text-ink/65">{p.description}</p>
            </div>

            {p.variants.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">เลือกแบบ <span className="ml-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-normal text-brand">จำเป็น</span></legend>
                <div className="flex flex-wrap gap-2">
                  {p.variants.map((v) => {
                    const on = sel.variantId === v.id, out = v.stock === 0;
                    return (
                      <button key={v.id} disabled={out} onClick={() => setSel((s) => ({ ...s, variantId: v.id }))}
                        className={`rounded-2xl px-4 py-2.5 text-sm ring-1 transition ${on ? "bg-brand text-card ring-brand" : "ring-black/10 hover:ring-brand/50"} disabled:opacity-40`}>
                        {v.name} <span className={on ? "text-card/75" : "text-ink/50"}>{baht(v.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {p.groups.map((g) => {
              const count = g.options.filter((o) => sel.optionIds.includes(o.id)).length;
              const hint = g.minSelect > 0 ? (g.maxSelect === 1 ? "จำเป็น · เลือก 1" : `จำเป็น · ${g.minSelect}–${g.maxSelect}`) : `ไม่บังคับ · สูงสุด ${g.maxSelect}`;
              return (
                <fieldset key={g.id}>
                  <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
                    {g.name}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-normal ${g.minSelect > count ? "bg-brand/10 text-brand" : "bg-black/5 text-ink/55"}`}>{hint}</span>
                  </legend>
                  <div className="divide-y divide-black/5 rounded-2xl ring-1 ring-black/10">
                    {g.options.map((o) => {
                      const on = sel.optionIds.includes(o.id), radio = g.maxSelect === 1;
                      return (
                        <button key={o.id} disabled={!o.isAvailable} onClick={() => toggle(g.id, o.id)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm disabled:opacity-40">
                          <span className={`grid size-5 shrink-0 place-items-center border-2 transition ${radio ? "rounded-full" : "rounded-md"} ${on ? "border-brand bg-brand" : "border-black/20"}`}>
                            {on && <span className={radio ? "size-2 rounded-full bg-card" : "text-[11px] leading-none text-card"}>{radio ? "" : "✓"}</span>}
                          </span>
                          <span className="flex-1">{o.name}{!o.isAvailable && " (หมด)"}</span>
                          {o.priceDelta > 0 && <span className="text-ink/55">+{baht(o.priceDelta)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-black/5 bg-card p-4">
          <div className="flex items-center rounded-full ring-1 ring-black/10">
            <button aria-label="ลด" className="size-11 text-xl" onClick={() => setSel((s) => ({ ...s, qty: Math.max(1, s.qty - 1) }))}>−</button>
            <span className="w-6 text-center font-semibold tabular-nums">{sel.qty}</span>
            <button aria-label="เพิ่ม" className="size-11 text-xl" onClick={() => setSel((s) => ({ ...s, qty: Math.min(99, s.qty + 1) }))}>+</button>
          </div>
          <button onClick={submit} disabled={!line.ok}
            className="flex h-12 flex-1 items-center justify-between rounded-full bg-brand px-6 font-medium text-card transition active:scale-[0.98] disabled:opacity-50">
            <span>{line.ok ? "ใส่ตะกร้า" : line.errors[0]}</span><span className="tabular-nums">{baht(line.total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ตะกร้า ---------- */
export function CartPanel({ shop, onClose }: { shop: string; onClose: () => void }) {
  const items = useCartItems(shop);
  const setQty = useCart((s) => s.setQty);
  const total = items.reduce((a, i) => a + i.unitPrice * i.qty, 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-label="ตะกร้า">
      <div className="absolute inset-0 animate-fade bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md animate-rise flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between p-5">
          <h2 className="font-display text-xl font-semibold">ตะกร้าของคุณ</h2>
          <button onClick={onClose} aria-label="ปิด" className="grid size-9 place-items-center rounded-full bg-black/5 text-xl">×</button>
        </div>
        <ul className="flex-1 space-y-3 overflow-y-auto px-5">
          {items.length === 0 && <li className="py-20 text-center text-ink/50">ยังไม่มีสินค้า</li>}
          {items.map((i) => (
            <li key={i.key} className="flex gap-3 rounded-2xl p-2 ring-1 ring-black/5">
              <div className="size-16 shrink-0 rounded-xl"><ProductStage emoji={i.emoji} size="sm" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{i.name}</p>
                <p className="truncate text-xs text-ink/55">{[i.variantName, ...i.optionNames].filter(Boolean).join(" · ")}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-full ring-1 ring-black/10">
                    <button aria-label="ลด" className="size-7" onClick={() => setQty(shop, i.key, i.qty - 1)}>−</button>
                    <span className="w-5 text-center text-sm tabular-nums">{i.qty}</span>
                    <button aria-label="เพิ่ม" className="size-7" onClick={() => setQty(shop, i.key, Math.min(99, i.qty + 1))}>+</button>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{baht(i.unitPrice * i.qty)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-black/5 p-5">
          <div className="mb-3 flex justify-between font-display text-lg font-semibold"><span>รวม</span><span className="tabular-nums">{baht(total)}</span></div>
          <Link href={`/${shop}/checkout`} aria-disabled={!items.length}
            className={`flex h-12 items-center justify-center rounded-full bg-brand font-medium text-card ${items.length ? "" : "pointer-events-none opacity-50"}`}>
            ไปชำระเงิน
          </Link>
        </div>
      </aside>
    </div>
  );
}

/* ---------- หน้าร้าน ---------- */
export function Storefront({ shop, categories, products, walk, ai, shopType = "cafe" }: { shop: string; categories: Category[]; products: CatalogProduct[]; walk?: WalkData; ai?: boolean; shopType?: string }) {
  const walking = useSyncExternalStore(subscribeHash, getHash, () => "") === "#walk";
  // สแกน QR โต๊ะ (?t=token) → ตรวจกับ server แล้วจำโต๊ะไว้ในตะกร้า
  const qrToken = useSyncExternalStore(noopSubscribe, () => new URLSearchParams(location.search).get("t"), () => null);
  const table = useCart((s) => s.tables[shop]);
  const setTable = useCart((s) => s.setTable);
  useEffect(() => {
    if (!qrToken || table?.token === qrToken) return;
    lookupTable(shop, qrToken).then((code) => setTable(shop, code ? { token: qrToken, code } : undefined));
  }, [qrToken, shop, table?.token, setTable]);
  const gl = useSyncExternalStore(noopSubscribe, hasWebGL, () => false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [active, setActive] = useState(categories[0]?.id);
  const hydrated = useHydrated();
  const items = useCartItems(shop);
  const count = items.reduce((a, i) => a + i.qty, 0);
  const total = items.reduce((a, i) => a + i.unitPrice * i.qty, 0);
  const navRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => categories
    .map((c) => ({ ...c, items: products.filter((p) => p.categoryId === c.id) }))
    .filter((c) => c.items.length), [categories, products]);

  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (v) setActive(v.target.id.replace("cat-", ""));
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach((s) => { const el = document.getElementById(`cat-${s.id}`); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [sections]);

  const current = products.find((p) => p.id === openId);

  return (
    <>
      <nav ref={navRef} className="sticky top-0 z-30 border-b border-black/5 bg-paper/85 backdrop-blur-xl">
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3">
          {sections.map((c) => (
            <a key={c.id} href={`#cat-${c.id}`}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${active === c.id ? "bg-brand text-card shadow-md" : "bg-card ring-1 ring-black/5 hover:ring-brand/40"}`}>
              {c.icon} {c.name}
            </a>
          ))}
        </div>
      </nav>

      {hydrated && table && (
        <div className="sticky top-[57px] z-20 border-b border-black/5 bg-accent/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm text-ink">
            <span className="text-lg">🪑</span><span><b>โต๊ะ {table.code}</b> · สั่งได้เลย ออเดอร์ส่งเข้าครัวพร้อมเลขโต๊ะ</span>
            <span className="flex-1" /><button className="text-xs underline opacity-70" onClick={() => setTable(shop, undefined)}>ไม่ใช่โต๊ะนี้</button>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 pb-32">
        {walk && gl && (
          <a href="#walk" className="group relative mt-8 flex items-center gap-5 overflow-hidden rounded-[28px] bg-ink p-5 text-card shadow-xl transition hover:-translate-y-0.5 sm:p-6">
            <span className="absolute -right-10 -top-10 size-48 rounded-full bg-accent/40 blur-3xl transition group-hover:scale-125" />
            <span className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-card/10 text-4xl ring-1 ring-card/20 transition group-hover:rotate-6">🚪</span>
            <span className="relative flex-1">
              <span className="block font-display text-lg font-semibold sm:text-xl">เดินเข้าร้านแบบ 3D</span>
              <span className="text-sm text-card/70">เดินชมเคาน์เตอร์ ชั้นวาง และหยิบสินค้ามาดูใกล้ๆ เหมือนอยู่ในร้านจริง</span>
            </span>
            <span className="relative hidden rounded-full bg-accent px-4 py-2 text-sm font-medium text-ink sm:block">เข้าร้าน →</span>
          </a>
        )}
        {sections.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-20 pt-10">
            <h2 className="mb-4 flex items-baseline gap-3 font-display text-2xl font-semibold">
              <span>{c.icon}</span>{c.name}<span className="text-sm font-normal text-ink/40">{c.items.length} รายการ</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {c.items.map((p, i) => <ProductCard key={p.id} p={p} i={i} onOpen={() => setOpenId(p.id)} />)}
            </div>
          </section>
        ))}
      </main>

      {hydrated && count > 0 && (
        <button onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-5 z-40 mx-auto flex h-14 max-w-md animate-rise items-center justify-between rounded-full bg-brand px-3 pl-6 text-card shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)]">
          <span className="font-medium">ดูตะกร้า</span>
          <span className="flex items-center gap-3">
            <span className="tabular-nums">{baht(total)}</span>
            <span className="grid size-9 place-items-center rounded-full bg-accent font-semibold text-ink tabular-nums">{count}</span>
          </span>
        </button>
      )}

      {ai && <Barista shop={shop} shopType={shopType} products={products} onOpen={setOpenId} />}
      {walk && gl && walking && <WalkIn data={walk} onSelect={setOpenId} onClose={clearHash} paused={!!current} />}
      {current && <ProductSheet key={current.id} p={current} shop={shop} onClose={() => setOpenId(null)} />}
      {cartOpen && <CartPanel shop={shop} onClose={() => setCartOpen(false)} />}
    </>
  );
}
