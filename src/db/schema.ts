import {
  pgTable, uuid, text, integer, jsonb, timestamp, boolean, primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";

// ราคาเก็บเป็น "สตางค์" (integer) เพื่อความแม่นยำ

export type ShopTheme = {
  primary: string; accent: string; bg: string; surface: string; text: string;
  font: "modern" | "classic"; heroEmoji: string;
};
// ฉากร้าน 3D: แม่แบบ + สี + การจัดวาง (slots[i] = productId · "" = อัตโนมัติ · "-" = เว้นว่าง)
export type SceneConfig = { template?: "cafe" | "restaurant" | "retail"; wall?: string; floor?: string; slots?: string[] };
// การเชื่อมต่อภายนอก (เก็บฝั่ง server เท่านั้น ห้ามส่งไป client)
export type Integrations = { lineToken?: string; lineTo?: string };
export type ShopHours = { open: string; close: string; days: number[] }; // days: 0=อา.
// สื่อหลักของสินค้า: preset = โมเดล 3D สำเร็จรูป (ไม่ต้องมีไฟล์), glb = ไฟล์ 3D, turntable = ภาพหมุน 360°
export type Media =
  | { type: "preset"; preset: string; params?: Record<string, string>; show?: string[] }
  | { type: "glb"; url: string }
  | { type: "turntable"; frames: string[] }
  | { type: "photo"; url: string };
// ผลต่อภาพ 3D เมื่อเลือก variant/option: เปลี่ยน preset, สี (params / ชื่อ material), แสดง/ซ่อนชิ้นส่วน (ชื่อ node), ขนาด
export type Visual = { preset?: string; params?: Record<string, string>; show?: string[]; hide?: string[]; scale?: number };

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").$type<"cafe" | "restaurant" | "retail">().notNull().default("cafe"),
  tagline: text("tagline").notNull().default(""),
  theme: jsonb("theme").$type<ShopTheme>().notNull(),
  hours: jsonb("hours").$type<ShopHours>().notNull(),
  promptpayId: text("promptpay_id").notNull().default(""),
  scene: jsonb("scene").$type<SceneConfig>().notNull().default({}),
  integrations: jsonb("integrations").$type<Integrations>().notNull().default({}),
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
  visual: jsonb("visual").$type<Visual>().notNull().default({}),
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
  visual: jsonb("visual").$type<Visual>().notNull().default({}),
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
  payment: text("payment").$type<"promptpay" | "counter">().notNull().default("promptpay"),
  tableCode: text("table_code").notNull().default(""),
  customerName: text("customer_name").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  note: text("note").notNull().default(""),
  status: text("status").$type<OrderStatus>().notNull().default("pending_payment"),
  discount: integer("discount").notNull().default(0),
  couponCode: text("coupon_code").notNull().default(""),
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

// โต๊ะสำหรับสั่งผ่าน QR (token อยู่ใน URL ของ QR)
export const tables = pgTable("tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("tables_shop_idx").on(t.shopId)]);

export type Role = "owner" | "manager" | "cashier" | "kitchen";
export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<Role>().notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("staff_shop_idx").on(t.shopId)]);

// คูปอง: percent = ลด % (value = 1–100) · amount = ลดเป็นเงิน (value = สตางค์)
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  kind: text("kind").$type<"percent" | "amount">().notNull(),
  value: integer("value").notNull(),
  minTotal: integer("min_total").notNull().default(0),
  maxUses: integer("max_uses"),
  used: integer("used").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
}, (t) => [uniqueIndex("coupons_shop_code_uq").on(t.shopId, t.code)]);

// สมาชิก (ระบุด้วยเบอร์โทรต่อร้าน) · แต้ม = 1 ต่อทุก ฿10 เมื่อออเดอร์เสร็จสิ้น
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  name: text("name").notNull().default(""),
  points: integer("points").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  visits: integer("visits").notNull().default(0),
  lastVisit: timestamp("last_visit", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("customers_shop_phone_uq").on(t.shopId, t.phone)]);
