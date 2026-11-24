import type { Media, Visual } from "@/db/schema";
import type { CatalogProduct, Selection } from "./pricing";

export type Resolved = { preset?: string; params: Record<string, string>; parts: Set<string>; hidden: Set<string>; scale: number };

/** รวม media หลัก + visual ของ variant + options ที่เลือก → สิ่งที่ viewer ต้องแสดง */
export function resolveVisual(media: Media | undefined, layers: Visual[]): Resolved {
  const r: Resolved = {
    preset: media?.type === "preset" ? media.preset : undefined,
    params: media?.type === "preset" ? { ...media.params } : {},
    parts: new Set(media?.type === "preset" ? media.show ?? [] : []),
    hidden: new Set(), scale: 1,
  };
  for (const v of layers) {
    if (v.preset) r.preset = v.preset;
    Object.assign(r.params, v.params);
    v.show?.forEach((p) => { r.parts.add(p); r.hidden.delete(p); });
    v.hide?.forEach((p) => { r.hidden.add(p); r.parts.delete(p); });
    if (v.scale) r.scale *= v.scale;
  }
  return r;
}

export function selectionVisual(p: CatalogProduct, sel: Selection) {
  const variant = p.variants.find((v) => v.id === sel.variantId);
  const opts = p.groups.flatMap((g) => g.options).filter((o) => sel.optionIds.includes(o.id));
  return resolveVisual(p.media[0], [variant?.visual ?? {}, ...opts.map((o) => o.visual)]);
}

export const has3D = (m?: Media) => !!m && (m.type === "preset" || m.type === "glb");
