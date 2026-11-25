import { Suspense } from "react";
import { adminShop } from "@/lib/admin-data";
import { aiEnabled } from "@/lib/ai";
import { MenuImport } from "@/components/admin/MenuImport";

export default function Page({ params }: PageProps<"/admin/[shop]/import">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}><Import params={params} /></Suspense>;
}

async function Import({ params }: { params: PageProps<"/admin/[shop]/import">["params"] }) {
  const { shop: slug } = await params;
  await adminShop(slug, "catalog");
  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-semibold">นำเข้าเมนูจากรูป</h1>
        <p className="text-sm text-stone-500">ถ่ายรูปป้ายเมนู/ใบเมนู → AI อ่านชื่อ ราคา และแบบย่อยให้ → ตรวจแก้ แล้วนำเข้าทีเดียว</p>
      </div>
      {aiEnabled() ? <MenuImport slug={slug} /> : (
        <p className="rounded-2xl bg-amber-50 p-6 text-sm text-amber-900">ยังไม่ได้ตั้งค่า <code>ANTHROPIC_API_KEY</code> บนเซิร์ฟเวอร์ — ตั้งแล้วรีสตาร์ทเพื่อใช้งาน</p>
      )}
    </>
  );
}
