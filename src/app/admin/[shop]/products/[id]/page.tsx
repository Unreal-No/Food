import { Suspense } from "react";
import { notFound } from "next/navigation";
import { adminCatalog } from "@/lib/admin-data";
import { ProductEditor } from "@/components/admin/ProductEditor";

export default function Page({ params }: PageProps<"/admin/[shop]/products/[id]">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}><Editor params={params} /></Suspense>;
}

async function Editor({ params }: { params: PageProps<"/admin/[shop]/products/[id]">["params"] }) {
  const { shop: slug, id } = await params;
  const { categories, products, groups } = await adminCatalog(slug);
  const product = id === "new" ? null : products.find((p) => p.id === id);
  if (product === undefined) notFound();
  return (
    <ProductEditor
      slug={slug} product={product}
      categories={categories.map((c) => ({ id: c.id, name: `${c.icon} ${c.name}` }))}
      groups={groups.map((g) => ({ id: g.id, name: g.name, summary: g.options.map((o) => o.name).join(", ") }))}
    />
  );
}
