import { Suspense } from "react";
import { adminCatalog } from "@/lib/admin-data";
import { OptionGroupsEditor } from "@/components/admin/OptionGroupsEditor";

export default function Page({ params }: PageProps<"/admin/[shop]/options">) {
  return <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-white" />}><Options params={params} /></Suspense>;
}

async function Options({ params }: { params: PageProps<"/admin/[shop]/options">["params"] }) {
  const { shop: slug } = await params;
  const { groups, products } = await adminCatalog(slug);
  const usage = Object.fromEntries(groups.map((g) => [g.id, products.filter((p) => p.groups.some((x) => x.id === g.id)).length]));
  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-semibold">ตัวเลือกเสริม</h1>
        <p className="text-sm text-stone-500">สร้างครั้งเดียว ใช้ได้กับหลายสินค้า เช่น ความหวาน, ท็อปปิ้ง, ระดับความเผ็ด</p>
      </div>
      <OptionGroupsEditor slug={slug} groups={groups} usage={usage} />
    </>
  );
}
