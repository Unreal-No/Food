import { Suspense } from "react";
import { adminShop } from "@/lib/admin-data";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { LineSettings } from "@/components/admin/LineSettings";

export default function Page({ params }: PageProps<"/admin/[shop]/settings">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}><Settings params={params} /></Suspense>;
}

async function Settings({ params }: { params: PageProps<"/admin/[shop]/settings">["params"] }) {
  const { shop: slug } = await params;
  const shop = await adminShop(slug, "settings");
  return (
    <>
    <LineSettings slug={slug} lineTo={shop.integrations.lineTo ?? ""} hasToken={!!shop.integrations.lineToken} />
    <SettingsForm slug={slug} initial={{
      name: shop.name, tagline: shop.tagline, type: shop.type, promptpayId: shop.promptpayId, hours: shop.hours, theme: shop.theme,
    }} />
    </>
  );
}
