import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import type { CatalogProduct } from "./pricing";

export const shopTag = (slug: string) => `shop:${slug}`;

export async function loadCatalog(shopId: string, includeHidden = false) {
  const db = await getDb();
  const [cats, prods, groups] = await Promise.all([
    db.select().from(s.categories).where(eq(s.categories.shopId, shopId)).orderBy(asc(s.categories.sort)),
    db.select().from(s.products).where(eq(s.products.shopId, shopId)).orderBy(asc(s.products.sort)),
    db.select().from(s.optionGroups).where(eq(s.optionGroups.shopId, shopId)).orderBy(asc(s.optionGroups.sort)),
  ]);
  const pIds = prods.map((p) => p.id);
  const gIds = groups.map((g) => g.id);
  const [vars, opts, links] = await Promise.all([
    pIds.length ? db.select().from(s.productVariants).where(inArray(s.productVariants.productId, pIds)).orderBy(asc(s.productVariants.sort)) : [],
    gIds.length ? db.select().from(s.options).where(inArray(s.options.groupId, gIds)).orderBy(asc(s.options.sort)) : [],
    pIds.length ? db.select().from(s.productOptionGroups).where(inArray(s.productOptionGroups.productId, pIds)).orderBy(asc(s.productOptionGroups.sort)) : [],
  ]);

  const groupMap = new Map(groups.map((g) => [g.id, {
    id: g.id, name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect,
    options: opts.filter((o) => o.groupId === g.id).map((o) => ({
      id: o.id, name: o.name, priceDelta: o.priceDelta, isDefault: o.isDefault, isAvailable: o.isAvailable,
    })),
  }]));

  const products: CatalogProduct[] = prods
    .filter((p) => includeHidden || p.status !== "hidden")
    .map((p) => ({
      id: p.id, categoryId: p.categoryId, name: p.name, description: p.description, emoji: p.emoji,
      badge: p.badge, basePrice: p.basePrice, status: p.status,
      variants: vars.filter((v) => v.productId === p.id).map((v) => ({ id: v.id, name: v.name, price: v.price, stock: v.stock })),
      groups: links.filter((l) => l.productId === p.id).map((l) => groupMap.get(l.groupId)!).filter(Boolean),
    }));

  return { categories: cats, products, groups: [...groupMap.values()] };
}

export async function getShop(slug: string) {
  const db = await getDb();
  const [shop] = await db.select().from(s.shops).where(eq(s.shops.slug, slug)).limit(1);
  return shop ?? null;
}

/** หน้าร้าน: cache ตามร้าน, หลังบ้านแก้ไขแล้วเรียก updateTag(shopTag(slug)) */
export async function getStorefront(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(shopTag(slug));
  const shop = await getShop(slug);
  if (!shop) return null;
  return { shop, ...(await loadCatalog(shop.id)) };
}

export async function listShops() {
  "use cache";
  cacheLife("hours");
  cacheTag("shops");
  const db = await getDb();
  return db.select({ slug: s.shops.slug, name: s.shops.name, tagline: s.shops.tagline, type: s.shops.type, theme: s.shops.theme })
    .from(s.shops).orderBy(asc(s.shops.createdAt));
}
