import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireShop } from "@/lib/auth";
import { PERMS, type Perm } from "@/lib/perms";

const ALL = PERMS.owner;

async function Nav({ params }: { params: LayoutProps<"/admin/[shop]">["params"] }) {
  const { ses } = await requireShop((await params).shop, "kitchen"); // ทุกบทบาทมีสิทธิ์ kitchen
  const perms: Perm[] = ses.super ? ALL : PERMS[ses.role];
  return <AdminNav perms={perms} who={ses.name} />;
}

export default function Layout({ children, params }: LayoutProps<"/admin/[shop]">) {
  return (
    <div className="min-h-dvh bg-stone-100 md:flex">
      <Suspense fallback={<aside className="h-24 bg-white md:h-dvh md:w-56" />}><Nav params={params} /></Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 md:p-8">{children}</main>
    </div>
  );
}
