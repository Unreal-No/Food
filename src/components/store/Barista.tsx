"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { askBarista } from "@/app/actions/barista";
import { baht, fromPrice, type CatalogProduct } from "@/lib/pricing";
import { ProductStage } from "./ProductStage";

type Msg = { role: "user" | "assistant"; content: string; productIds?: string[] };
const SUGGEST: Record<string, string[]> = {
  cafe: ["แนะนำเมนูขายดี", "อยากได้อะไรไม่หวานมาก", "ไม่ดื่มนมวัว มีอะไรบ้าง", "ของหวานคู่กับกาแฟ"],
  restaurant: ["เมนูเด็ดของร้าน", "อยากกินเผ็ดๆ", "มีอะไรไม่เผ็ดบ้าง", "เครื่องดื่มคู่กับอาหาร"],
  retail: ["สินค้าขายดี", "ของขวัญงบ 300", "มีอะไรใหม่"],
};

/** ผู้ช่วยแนะนำเมนู (Claude) · แนะนำได้เฉพาะสินค้าในร้าน แตะการ์ดเพื่อเปิดดู/สั่ง */
export function Barista({ shop, shopType, products, onOpen }: { shop: string; shopType: string; products: CatalogProduct[]; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const title = shopType === "restaurant" ? "พนักงาน AI" : shopType === "retail" ? "ผู้ช่วย AI" : "บาริสต้า AI";

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, pending]);

  const send = (q: string) => {
    q = q.trim();
    if (!q || pending) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next); setText(""); setErr("");
    start(async () => {
      const r = await askBarista(shop, next.slice(-12).map(({ role, content }) => ({ role, content })));
      if ("error" in r) { setErr(r.error); return; }
      setMsgs((m) => [...m, { role: "assistant", content: r.reply, productIds: r.productIds }]);
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={`ถาม${title}`}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-card shadow-[0_12px_30px_-8px_rgba(0,0,0,0.5)] transition hover:scale-105 md:bottom-6">
        <span className="text-lg">💬</span><span className="hidden sm:inline">ถาม{title}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end md:p-6" role="dialog" aria-modal aria-label={title}>
          <div className="absolute inset-0 animate-fade bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative flex h-[80dvh] w-full animate-sheet flex-col overflow-hidden rounded-t-[28px] bg-card shadow-2xl md:h-[640px] md:max-w-md md:rounded-[28px]">
            <header className="flex items-center gap-3 border-b border-black/5 bg-brand p-4 text-card">
              <span className="grid size-10 place-items-center rounded-full bg-card/15 text-xl">🤖</span>
              <div className="flex-1"><p className="font-display font-semibold">{title}</p><p className="text-xs text-card/70">แนะนำเมนูจากของที่ร้านมีจริง</p></div>
              <button onClick={() => setOpen(false)} aria-label="ปิด" className="grid size-9 place-items-center rounded-full bg-card/15 text-xl">×</button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {msgs.length === 0 && (
                <div className="space-y-3 pt-4 text-center">
                  <p className="text-4xl">👋</p>
                  <p className="text-sm text-ink/60">สวัสดี! อยากได้อะไรบอกได้เลย เดี๋ยวช่วยเลือกให้</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {(SUGGEST[shopType] ?? SUGGEST.cafe).map((s) => <button key={s} onClick={() => send(s)} className="rounded-full bg-accent/25 px-3 py-1.5 text-sm hover:bg-accent/40">{s}</button>)}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "space-y-2"}>
                  <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "rounded-br-md bg-brand text-card" : "rounded-bl-md bg-black/5"}`}>{m.content}</p>
                  {!!m.productIds?.length && (
                    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                      {m.productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean).map((p) => (
                        <button key={p!.id} onClick={() => onOpen(p!.id)} className="w-36 shrink-0 rounded-2xl bg-card p-2 text-left ring-1 ring-black/10 transition hover:ring-brand">
                          <div className="rounded-xl"><ProductStage emoji={p!.emoji} size="sm" /></div>
                          <p className="mt-1.5 truncate text-sm font-medium">{p!.name}</p>
                          <p className="text-xs text-brand">{baht(fromPrice(p!))} · ดู/สั่ง →</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {pending && <p className="w-fit animate-pulse rounded-2xl bg-black/5 px-4 py-2.5 text-sm text-ink/50">กำลังคิด…</p>}
              {err && <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">{err}</p>}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 border-t border-black/5 p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder="พิมพ์คำถาม…" aria-label="ข้อความ"
                className="h-11 flex-1 rounded-full bg-black/5 px-4 text-sm outline-none focus:ring-2 focus:ring-brand" />
              <button disabled={pending || !text.trim()} className="h-11 rounded-full bg-brand px-5 text-sm font-medium text-card disabled:opacity-40">ส่ง</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
