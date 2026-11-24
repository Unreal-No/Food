import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { requireShop } from "@/lib/auth";
import { StaffManager } from "@/components/admin/StaffManager";

export default function Page({ params }: PageProps<"/admin/[shop]/staff">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}><Staff params={params} /></Suspense>;
}

async function Staff({ params }: { params: PageProps<"/admin/[shop]/staff">["params"] }) {
  const { shop: slug } = await params;
  const { ses, shop } = await requireShop(slug, "staff");
  const rows = await (await getDb()).select({ id: s.staff.id, name: s.staff.name, username: s.staff.username, role: s.staff.role, active: s.staff.active })
    .from(s.staff).where(eq(s.staff.shopId, shop.id)).orderBy(asc(s.staff.createdAt));
  return <StaffManager slug={slug} staff={rows} selfId={ses.super ? null : ses.id} />;
}
