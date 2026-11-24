import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/catalog";
import { ThemeScope } from "@/components/theme";
import { OpenStatus } from "@/components/store/OpenStatus";
import { Storefront } from "@/components/store/Storefront";

export async function generateMetadata({ params }: PageProps<"/[shop]">): Promise<Metadata> {
  const data = await getStorefront((await params).shop);
  return data ? { title: data.shop.name, description: data.shop.tagline } : {};
}

export default function Page({ params }: PageProps<"/[shop]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh animate-pulse bg-stone-100" />}>
      <Store params={params} />
    </Suspense>
  );
}

async function Store({ params }: { params: PageProps<"/[shop]">["params"] }) {
  const { shop: slug } = await params;
  const data = await getStorefront(slug);
  if (!data) notFound();
  const { shop, categories, products } = data;

  return (
    <ThemeScope theme={shop.theme}>
      <header className="grain relative overflow-hidden bg-brand text-card">
        <div className="absolute -right-24 -top-24 size-[28rem] rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 size-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl items-center gap-6 px-4 pb-14 pt-6 md:pb-20">
          <div className="flex-1">
            <Link href="/" className="text-sm text-card/60 hover:text-card">← ร้านทั้งหมด</Link>
            <h1 className="mt-8 font-display text-4xl font-bold leading-[1.1] md:text-6xl">{shop.name}</h1>
            <p className="mt-3 max-w-md text-card/75 md:text-lg">{shop.tagline}</p>
            <div className="mt-5 [&>span]:bg-card/90"><OpenStatus hours={shop.hours} /></div>
          </div>
          <div className="relative hidden size-56 shrink-0 place-items-center sm:grid md:size-72">
            <div className="absolute inset-6 rounded-full bg-card/10 ring-1 ring-card/20" />
            <span className="relative animate-float text-[8rem] drop-shadow-[0_30px_30px_rgba(0,0,0,0.35)] md:text-[10rem]">{shop.theme.heroEmoji}</span>
          </div>
        </div>
      </header>
      <Storefront shop={shop.slug} categories={categories} products={products} />
    </ThemeScope>
  );
}
