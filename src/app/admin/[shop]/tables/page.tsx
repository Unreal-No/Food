import { Suspense } from "react";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb, schema as s } from "@/db";
import { adminShop } from "@/lib/admin-data";
import { TablesManager } from "@/components/admin/TablesManager";

export default function Page({ params }: PageProps<"/admin/[shop]/tables">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}><Tables params={params} /></Suspense>;
}

async function Tables({ params }: { params: PageProps<"/admin/[shop]/tables">["params"] }) {
  const { shop: slug } = await params;
  const shop = await adminShop(slug, "tables");
  const h = await headers();
  const origin = process.env.SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const rows = await (await getDb()).select().from(s.tables).where(eq(s.tables.shopId, shop.id)).orderBy(asc(s.tables.code));
  const tables = await Promise.all(rows.map(async (t) => {
    const url = `${origin}/${slug}?t=${t.token}`;
    return { id: t.id, code: t.code, url, qr: await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) };
  }));
  return <TablesManager slug={slug} shopName={shop.name} tables={tables} />;
}
