import { Suspense } from "react";
import { adminCatalog } from "@/lib/admin-data";
import { baht, fromPrice } from "@/lib/pricing";
import { SceneEditor } from "@/components/admin/SceneEditor";

export default function Page({ params }: PageProps<"/admin/[shop]/scene">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}><Scene params={params} /></Suspense>;
}

async function Scene({ params }: { params: PageProps<"/admin/[shop]/scene">["params"] }) {
  const { shop: slug } = await params;
  const { shop, products } = await adminCatalog(slug);
  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-semibold">ฉากร้าน 3D</h1>
        <p className="text-sm text-stone-500">เลือกแม่แบบร้าน สีผนัง/พื้น และจัดวางสินค้าบนเคาน์เตอร์ ชั้นวาง และโต๊ะ</p>
      </div>
      <SceneEditor slug={slug} shopType={shop.type} initial={shop.scene} shopName={shop.name} theme={shop.theme} hours={shop.hours}
        products={products.filter((p) => p.status !== "hidden").map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, price: baht(fromPrice(p)), media: p.media[0], soldout: p.status === "soldout" }))} />
    </>
  );
}
