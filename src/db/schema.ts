import {
  pgTable, uuid, text, integer, jsonb, timestamp, boolean, primaryKey, index,
} from "drizzle-orm/pg-core";

// ราคาเก็บเป็น "สตางค์" (integer) เพื่อความแม่นยำ

export type ShopTheme = {
  primary: string; accent: string; bg: string; surface: string; text: string;
  font: "modern" | "classic"; heroEmoji: string;
};
export type ShopHours = { open: string; close: string; days: number[] }; // days: 0=อา.
export type Media = { type: "photo" | "glb" | "turntable" | "splat"; url: string; frames?: string[] };
export type VariantVisual = { scale?: number; materials?: Record<string, string>; showNodes?: string[]; hideNodes?: string[] };

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").$type<"cafe" | "restaurant" | "retail">().notNull().default("cafe"),
  tagline: text("tagline").notNull().default(""),
  theme: jsonb("theme").$type<ShopTheme>().notNull(),
  hours: jsonb("hours").$type<ShopHours>().notNull(),
  promptpayId: text("promptpay_id").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default(""),
  sort: integer("sort").notNull().default(0),
}, (t) => [index("categories_shop_idx").on(t.shopId)]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  emoji: text("emoji").notNull().default("🍽️"),
  badge: text("badge").notNull().default(""),
  basePrice: integer("base_price").notNull().default(0),
  status: text("status").$type<"active" | "hidden" | "soldout">().notNull().default("active"),
  media: jsonb("media").$type<Media[]>().notNull().default([]),
  sort: integer("sort").notNull().default(0),
}, (t) => [index("products_shop_idx").on(t.shopId)]);

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku").notNull().default(""),
  price: integer("price").notNull(),
  stock: integer("stock"), // null = ไม่จำกัด
  visual: jsonb("visual").$type<VariantVisual>().notNull().default({}),
  sort: integer("sort").notNull().default(0),
}, (t) => [index("variants_product_idx").on(t.productId)]);

export const optionGroups = pgTable("option_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  minSelect: integer("min_select").notNull().default(0),
  maxSelect: integer("max_select").notNull().default(1),
  sort: integer("sort").notNull().default(0),
});

export const options = pgTable("options", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => optionGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  priceDelta: integer("price_delta").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const productOptionGroups = pgTable("product_option_groups", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => optionGroups.id, { onDelete: "cascade" }),
  sort: integer("sort").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.productId, t.groupId] })]);

export type OrderStatus = "pending_payment" | "paid" | "preparing" | "ready" | "completed" | "cancelled";
export type OptionSnapshot = { group: string; name: string; priceDelta: number };

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  channel: text("channel").$type<"dine_in" | "takeaway">().notNull(),
  tableCode: text("table_code").notNull().default(""),
  customerName: text("customer_name").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  note: text("note").notNull().default(""),
  status: text("status").$type<OrderStatus>().notNull().default("pending_payment"),
  total: integer("total").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("orders_shop_created_idx").on(t.shopId, t.createdAt)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  variantName: text("variant_name").notNull().default(""),
  options: jsonb("options").$type<OptionSnapshot[]>().notNull().default([]),
  qty: integer("qty").notNull(),
  unitPrice: integer("unit_price").notNull(),
  note: text("note").notNull().default(""),
});
