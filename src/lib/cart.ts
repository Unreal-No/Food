"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  key: string; productId: string; name: string; emoji: string;
  variantId?: string; variantName: string; optionIds: string[]; optionNames: string[];
  unitPrice: number; qty: number;
};

type CartState = {
  shops: Record<string, CartItem[]>;
  add: (shop: string, item: CartItem) => void;
  setQty: (shop: string, key: string, qty: number) => void;
  clear: (shop: string) => void;
};

const EMPTY: CartItem[] = [];
export const useCartItems = (shop: string) => useCart((s) => s.shops[shop] ?? EMPTY);

export const useCart = create<CartState>()(persist((set) => ({
  shops: {},
  add: (shop, item) => set((s) => {
    const items = s.shops[shop] ?? [];
    const found = items.find((i) => i.key === item.key);
    const next = found
      ? items.map((i) => (i.key === item.key ? { ...i, qty: Math.min(99, i.qty + item.qty) } : i))
      : [...items, item];
    return { shops: { ...s.shops, [shop]: next } };
  }),
  setQty: (shop, key, qty) => set((s) => ({
    shops: { ...s.shops, [shop]: (s.shops[shop] ?? []).map((i) => (i.key === key ? { ...i, qty } : i)).filter((i) => i.qty > 0) },
  })),
  clear: (shop) => set((s) => ({ shops: { ...s.shops, [shop]: [] } })),
}), { name: "vs-cart" }));

export const itemKey = (productId: string, variantId: string | undefined, optionIds: string[]) =>
  [productId, variantId ?? "", [...optionIds].sort().join(".")].join("|");
