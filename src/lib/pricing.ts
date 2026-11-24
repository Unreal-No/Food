// ใช้ร่วมกันทั้ง client (แสดงราคา) และ server (คำนวณจริงตอนสั่ง)
import type { Media, Visual } from "@/db/schema";

export type CatalogOption = { id: string; name: string; priceDelta: number; isDefault: boolean; isAvailable: boolean; visual: Visual };
export type CatalogGroup = { id: string; name: string; minSelect: number; maxSelect: number; options: CatalogOption[] };
export type CatalogVariant = { id: string; name: string; price: number; stock: number | null; visual: Visual };
export type CatalogProduct = {
  id: string; categoryId: string | null; name: string; description: string; emoji: string; badge: string;
  basePrice: number; status: "active" | "hidden" | "soldout"; media: Media[];
  variants: CatalogVariant[]; groups: CatalogGroup[];
};

export type Selection = { variantId?: string; optionIds: string[]; qty: number };

export function fromPrice(p: CatalogProduct) {
  return p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : p.basePrice;
}

export function defaultSelection(p: CatalogProduct): Selection {
  return {
    variantId: p.variants[0]?.id,
    optionIds: p.groups.flatMap((g) => g.options.filter((o) => o.isDefault && o.isAvailable).map((o) => o.id)),
    qty: 1,
  };
}

export function priceLine(p: CatalogProduct, sel: Selection) {
  const errors: string[] = [];
  let unit = p.basePrice;
  let variant: CatalogVariant | undefined;

  if (p.status !== "active") errors.push("สินค้าหมด");
  if (p.variants.length) {
    variant = p.variants.find((v) => v.id === sel.variantId);
    if (!variant) errors.push("กรุณาเลือกแบบ");
    else {
      unit = variant.price;
      if (variant.stock !== null && variant.stock < sel.qty) errors.push(`${variant.name} เหลือ ${variant.stock}`);
    }
  }

  const chosen: { group: string; name: string; priceDelta: number }[] = [];
  const known = new Set<string>();
  for (const g of p.groups) {
    const picked = g.options.filter((o) => sel.optionIds.includes(o.id));
    picked.forEach((o) => known.add(o.id));
    if (picked.some((o) => !o.isAvailable)) errors.push(`${g.name}: บางตัวเลือกหมด`);
    if (picked.length < g.minSelect) errors.push(`กรุณาเลือก${g.name}`);
    if (picked.length > g.maxSelect) errors.push(`${g.name} เลือกได้ไม่เกิน ${g.maxSelect}`);
    for (const o of picked) { unit += o.priceDelta; chosen.push({ group: g.name, name: o.name, priceDelta: o.priceDelta }); }
  }
  if (sel.optionIds.some((id) => !known.has(id))) errors.push("ตัวเลือกไม่ถูกต้อง");
  if (!Number.isInteger(sel.qty) || sel.qty < 1 || sel.qty > 99) errors.push("จำนวนไม่ถูกต้อง");

  return { unitPrice: unit, total: unit * sel.qty, variant, chosen, errors, ok: errors.length === 0 };
}

export const baht = (satang: number) =>
  "฿" + (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: satang % 100 ? 2 : 0, maximumFractionDigits: 2 });
