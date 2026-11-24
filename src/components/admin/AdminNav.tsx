"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const NAV = [
  ["", "📊", "ภาพรวม"], ["/orders", "🧾", "ออเดอร์"], ["/products", "🍰", "สินค้า"],
  ["/options", "🧩", "ตัวเลือกเสริม"], ["/settings", "🎨", "ตั้งค่าร้าน"],
] as const;

export function AdminNav() {
  const { shop } = useParams<{ shop: string }>();
  const path = usePathname();
  const base = `/admin/${shop}`;
  return (
    <aside className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur md:h-dvh md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-3 md:block md:py-6">
        <Link href="/admin" className="text-xs uppercase tracking-widest text-stone-500">← ร้านทั้งหมด</Link>
        <p className="font-semibold md:mt-2">/{shop}</p>
      </div>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3">
        {NAV.map(([href, icon, label]) => {
          const to = base + href;
          const on = href ? path.startsWith(to) : path === base;
          return (
            <Link key={href} href={to} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${on ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-black/5"}`}>
              <span>{icon}</span>{label}
            </Link>
          );
        })}
        <Link href={`/${shop}`} target="_blank" className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-600 hover:bg-black/5 md:mt-4">↗ ดูหน้าร้าน</Link>
      </nav>
    </aside>
  );
}
