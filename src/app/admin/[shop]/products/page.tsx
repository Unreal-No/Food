import { Suspense } from "react";
import Link from "next/link";
import { adminCatalog } from "@/lib/admin-data";
import { baht, fromPrice } from "@/lib/pricing";
import { CategoryManager, ProductStatusSelect } from "@/components/admin/CatalogControls";
import { btnPrimary } from "@/components/admin/ui";

export default function Page({ params }: PageProps<"/admin/[shop]/products">) {
  return <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-white" />}><Products params={params} /></Suspense>;
}

async function Products({ params }: { params: PageProps<"/admin/[shop]/products">["params"] }) {
  const { shop: slug } = await params;
  const { categories, products } = await adminCatalog(slug);
  const groups = [...categories.map((c) => ({ id: c.id as string | null, name: `${c.icon} ${c.name}` })), { id: null, name: "ไม่มีหมวด" }];

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">สินค้า <span className="text-base font-normal text-stone-400">{products.length}</span></h1>
        <Link href={`/admin/${slug}/products/new`} className={btnPrimary}>+ เพิ่มสินค้า</Link>
      </div>
      {groups.map((g) => {
        const list = products.filter((p) => p.categoryId === g.id);
        if (!list.length) return null;
        return (
          <section key={g.id ?? "none"} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <h2 className="border-b border-black/5 px-4 py-3 text-sm font-semibold">{g.name}</h2>
            <ul className="divide-y divide-black/5">
              {list.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-2xl">{p.emoji}</span>
                  <Link href={`/admin/${slug}/products/${p.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="truncate font-medium">{p.name} {p.badge && <span className="ml-1 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] text-white">{p.badge}</span>}</p>
                    <p className="truncate text-xs text-stone-500">
                      {baht(fromPrice(p))}{p.variants.length > 1 && "+"} · {p.variants.length ? `${p.variants.length} แบบ` : "ไม่มีแบบย่อย"} · {p.groups.length} กลุ่มตัวเลือก
                    </p>
                  </Link>
                  <ProductStatusSelect slug={slug} id={p.id} status={p.status} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <CategoryManager slug={slug} categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, sort: c.sort }))} />
    </>
  );
}
