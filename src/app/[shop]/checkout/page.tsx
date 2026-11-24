import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/catalog";
import { ThemeScope } from "@/components/theme";
import { CheckoutForm } from "@/components/store/CheckoutForm";

export const metadata = { title: "ชำระเงิน" };

export default function Page({ params }: PageProps<"/[shop]/checkout">) {
  return <Suspense><Checkout params={params} /></Suspense>;
}

async function Checkout({ params }: { params: PageProps<"/[shop]/checkout">["params"] }) {
  const data = await getStorefront((await params).shop);
  if (!data) notFound();
  return (
    <ThemeScope theme={data.shop.theme}>
      <CheckoutForm shop={data.shop.slug} shopName={data.shop.name} />
    </ThemeScope>
  );
}
