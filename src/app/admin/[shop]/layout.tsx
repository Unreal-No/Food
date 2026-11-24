import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

export default function Layout({ children }: LayoutProps<"/admin/[shop]">) {
  return (
    <div className="min-h-dvh bg-stone-100 md:flex">
      <Suspense fallback={<aside className="h-24 bg-white md:h-dvh md:w-56" />}><AdminNav /></Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 md:p-8">{children}</main>
    </div>
  );
}
