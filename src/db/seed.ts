import { randomBytes } from "node:crypto";
import { shops, categories, products, productVariants, optionGroups, options, productOptionGroups, staff, tables, coupons } from "./schema";
import { hashPassword } from "@/lib/password";
import type { DB } from "./index";
import type { Media, Visual } from "./schema";

const B = (baht: number) => Math.round(baht * 100);

type SeedProduct = {
  cat: number; name: string; emoji: string; desc: string; price: number; badge?: string;
  variants?: [string, number, Visual?][]; groups?: number[]; media?: Media;
};
type SeedShop = {
  slug: string; name: string; type: "cafe" | "restaurant"; tagline: string; promptpayId: string;
  theme: typeof shops.$inferInsert["theme"]; hours: typeof shops.$inferInsert["hours"];
  categories: [string, string][];
  staff: [string, string, string, "owner" | "manager" | "cashier" | "kitchen"][]; // ชื่อ, username, รหัส, บทบาท
  groups: { name: string; min: number; max: number; opts: [string, number, boolean?, Visual?][] }[];
  products: SeedProduct[];
};

const DATA: SeedShop[] = [
  {
    slug: "mellow-bean", name: "Mellow Bean", type: "cafe", promptpayId: "0812345678",
    tagline: "คั่วเองทุกเช้า · กาแฟพิเศษจากดอยไทย",
    theme: { primary: "#6b3e26", accent: "#d9a066", bg: "#f7f1e8", surface: "#fffaf3", text: "#2a1a12", font: "classic", heroEmoji: "☕" },
    hours: { open: "07:00", close: "18:00", days: [0, 1, 2, 3, 4, 5, 6] },
    categories: [["กาแฟ", "☕"], ["ชา & นม", "🍵"], ["เบเกอรี่", "🥐"]],
    staff: [["เจ้าของร้าน", "mellow", "mellow1234", "owner"], ["บาริสต้า", "mellow-kitchen", "kitchen1234", "kitchen"]],
    groups: [
      { name: "ความหวาน", min: 1, max: 1, opts: [["ไม่หวาน", 0], ["หวานน้อย", 0], ["หวานปกติ", 0, true], ["หวานมาก", 0]] },
      { name: "นม", min: 1, max: 1, opts: [["นมวัว", 0, true], ["นมโอ๊ต", 15], ["นมอัลมอนด์", 15]] },
      { name: "ท็อปปิ้ง", min: 0, max: 3, opts: [["เพิ่มช็อต", 15, false, { params: { liquid: "#7a4a2e" } }], ["วิปครีม", 10, false, { show: ["whip"] }], ["ไข่มุก", 10, false, { show: ["pearls"] }]] },
    ],
    products: [
      { cat: 0, name: "Signature Latte", emoji: "☕", desc: "เอสเปรสโซ่คั่วกลาง นมสตีมเนียนนุ่ม", price: 55, badge: "ขายดี", groups: [0, 1, 2],
        media: { type: "preset", preset: "cup", params: { liquid: "#c69c72" } },
        variants: [["ร้อน", 55], ["เย็น", 60, { preset: "glass", params: { liquid: "#efe3d0", layer: "#a8754f" }, show: ["ice", "straw"] }], ["ปั่น", 70, { preset: "glass", params: { liquid: "#c9a27e" }, show: ["whip", "straw"] }]] },
      { cat: 0, name: "Americano", emoji: "🖤", desc: "เข้ม สะอาด กลิ่นช็อกโกแลตและถั่ว", price: 45, groups: [0, 2],
        media: { type: "preset", preset: "cup", params: { liquid: "#3b2417" }, show: [] },
        variants: [["ร้อน", 45, { hide: ["art"] }], ["เย็น", 50, { preset: "glass", params: { liquid: "#2a1810" }, show: ["ice", "straw"] }]] },
      { cat: 0, name: "Dirty Coffee", emoji: "🥛", desc: "ช็อตร้อนบนนมเย็นจัด ดื่มทันที", price: 75, badge: "ใหม่", groups: [1],
        media: { type: "preset", preset: "glass", params: { liquid: "#f5efe6", layer: "#4a2c1d" } } },
      { cat: 1, name: "Uji Matcha Latte", emoji: "🍵", desc: "มัทฉะเกรดพิธีจากอุจิ", price: 70, groups: [0, 1, 2],
        media: { type: "preset", preset: "cup", params: { liquid: "#7fa650", art: "#eef3dc" } },
        variants: [["ร้อน", 70], ["เย็น", 75, { preset: "glass", params: { liquid: "#eef0e0", layer: "#6f9a3e" }, show: ["ice", "straw"] }]] },
      { cat: 1, name: "ชาไทยโบราณ", emoji: "🧡", desc: "ชาซีลอนต้มเอง หอมควันเทียน", price: 50, groups: [0, 2],
        media: { type: "preset", preset: "glass", params: { liquid: "#e0782f", layer: "#f3e3cf", straw: "#ffffff" } },
        variants: [["เย็น", 50, { show: ["ice", "straw"] }], ["ปั่น", 60, { params: { layer: "" , liquid: "#eaa066" }, show: ["whip", "straw"] }]] },
      { cat: 2, name: "Butter Croissant", emoji: "🥐", desc: "เนยฝรั่งเศส 27 ชั้น อบใหม่ทุกชั่วโมง", price: 65, media: { type: "preset", preset: "croissant" } },
      { cat: 2, name: "Basque Cheesecake", emoji: "🍰", desc: "ผิวไหม้หอม เนื้อในเยิ้ม", price: 95, badge: "ขายดี", media: { type: "preset", preset: "cake" } },
    ],
  },
  {
    slug: "baan-som", name: "ครัวบ้านส้ม", type: "restaurant", promptpayId: "0898765432",
    tagline: "อาหารตามสั่งรสมือแม่ · ผัดร้อนๆ ทุกจาน",
    theme: { primary: "#c2410c", accent: "#facc15", bg: "#fff7ed", surface: "#ffffff", text: "#1c1917", font: "modern", heroEmoji: "🍳" },
    hours: { open: "10:00", close: "21:00", days: [1, 2, 3, 4, 5, 6] },
    categories: [["จานเดียว", "🍛"], ["ต้ม & แกง", "🍲"], ["เครื่องดื่ม", "🥤"]],
    staff: [["เจ้าของร้าน", "baansom", "baansom1234", "owner"], ["แคชเชียร์", "baansom-cashier", "cashier1234", "cashier"]],
    groups: [
      { name: "ความเผ็ด", min: 1, max: 1, opts: [["ไม่เผ็ด", 0], ["เผ็ดน้อย", 0], ["เผ็ดกลาง", 0, true], ["เผ็ดมาก", 0]] },
      { name: "ไข่", min: 0, max: 2, opts: [["ไข่ดาว", 10, false, { show: ["egg"] }], ["ไข่ดาวไม่สุก", 10, false, { show: ["egg"] }], ["ไข่เจียว", 15, false, { show: ["omelet"] }]] },
      { name: "ขนาด", min: 1, max: 1, opts: [["ธรรมดา", 0, true], ["พิเศษ", 10, false, { scale: 1.12 }]] },
    ],
    products: [
      { cat: 0, name: "ข้าวกะเพรา", emoji: "🍛", desc: "กะเพราป่าแท้ ผัดไฟแรง หอมกระทะ", price: 60, badge: "ขายดี", groups: [0, 1, 2], media: { type: "preset", preset: "plate", params: { topping: "#6b3b22" } },
        variants: [["หมูสับ", 60], ["ไก่", 60, { params: { topping: "#c89a62" } }], ["หมูกรอบ", 70, { params: { topping: "#b5652b" } }], ["กุ้ง", 80, { params: { topping: "#f08a5d" } }]] },
      { cat: 0, name: "ข้าวผัด", emoji: "🍚", desc: "ข้าวหอมมะลิผัดไข่ เม็ดร่วนสวย", price: 60, groups: [1, 2], media: { type: "preset", preset: "plate", params: { rice: "#efcf7d", topping: "#d9a066" }, show: ["cucumber"] },
        variants: [["หมู", 60], ["ปู", 90, { params: { topping: "#f4a261" } }]] },
      { cat: 0, name: "กะเพรากุ้ง ไข่ดาว", emoji: "🦐", desc: "กุ้งตัวโต ผัดกะเพราหมูสับ ไข่ดาวขอบกรอบ", price: 89, badge: "รูปจริง", groups: [0, 2], media: { type: "photo", url: "/demo/kaprao-shrimp.webp" } },
      { cat: 0, name: "กะเพราทะเล ไข่ดาวกรอบ", emoji: "🦑", desc: "กุ้ง ปลาหมึก ผัดพริกสด ไข่ดาวทอดกรอบ", price: 99, badge: "แนะนำ", groups: [0, 2], media: { type: "photo", url: "/demo/kaprao-seafood.webp" } },
      { cat: 0, name: "ผัดไทยกุ้งสด", emoji: "🍤", desc: "เส้นจันท์ ซอสเคี่ยวเอง", price: 80, groups: [0, 2], media: { type: "preset", preset: "plate", params: { rice: "#e3a869", topping: "#f08a5d" } } },
      { cat: 1, name: "ต้มยำกุ้งน้ำข้น", emoji: "🍲", desc: "กุ้งแม่น้ำ น้ำพริกเผาสูตรบ้าน", price: 150, badge: "แนะนำ", groups: [0], media: { type: "preset", preset: "bowl" } },
      { cat: 2, name: "ชามะนาว", emoji: "🍋", desc: "เปรี้ยวหวานสดชื่น", price: 35, media: { type: "preset", preset: "glass", params: { liquid: "#c9711e", slice: "#d9f99d" }, show: ["ice", "straw", "slice"] } },
      { cat: 2, name: "น้ำส้มคั้น", emoji: "🍊", desc: "ส้มสายน้ำผึ้งคั้นสด", price: 45, media: { type: "preset", preset: "glass", params: { liquid: "#f59e0b", slice: "#fb923c" }, show: ["ice", "slice"] } },
    ],
  },
];

export async function seedIfEmpty(db: DB) {
  const existing = await db.select({ id: shops.id }).from(shops).limit(1);
  if (existing.length) return;

  for (const s of DATA) {
    const [shop] = await db.insert(shops).values({
      slug: s.slug, name: s.name, type: s.type, tagline: s.tagline,
      promptpayId: s.promptpayId, theme: s.theme, hours: s.hours,
    }).returning();

    for (const [name, username, pw, role] of s.staff) {
      await db.insert(staff).values({ shopId: shop.id, name, username, role, passwordHash: await hashPassword(pw) });
    }
    await db.insert(tables).values(["A1", "A2", "A3", "B1", "B2"].map((code) => ({ shopId: shop.id, code, token: randomBytes(12).toString("base64url") })));

    await db.insert(coupons).values({ shopId: shop.id, code: "WELCOME10", kind: "percent", value: 10, minTotal: B(100) });

    const cats = await db.insert(categories)
      .values(s.categories.map(([name, icon], i) => ({ shopId: shop.id, name, icon, sort: i })))
      .returning();

    const groupIds: string[] = [];
    for (const [gi, gr] of s.groups.entries()) {
      const [row] = await db.insert(optionGroups)
        .values({ shopId: shop.id, name: gr.name, minSelect: gr.min, maxSelect: gr.max, sort: gi })
        .returning();
      groupIds.push(row.id);
      await db.insert(options).values(gr.opts.map(([name, delta, def, visual], i) => ({
        groupId: row.id, name, priceDelta: B(delta), isDefault: !!def, visual: visual ?? {}, sort: i,
      })));
    }

    for (const [pi, p] of s.products.entries()) {
      const [row] = await db.insert(products).values({
        shopId: shop.id, categoryId: cats[p.cat].id, name: p.name, emoji: p.emoji,
        description: p.desc, basePrice: B(p.price), badge: p.badge ?? "", media: p.media ? [p.media] : [], sort: pi,
      }).returning();
      if (p.variants?.length) {
        await db.insert(productVariants).values(p.variants.map(([name, price, visual], i) => ({
          productId: row.id, name, price: B(price), visual: visual ?? {}, sort: i,
        })));
      }
      if (p.groups?.length) {
        await db.insert(productOptionGroups).values(p.groups.map((g, i) => ({
          productId: row.id, groupId: groupIds[g], sort: i,
        })));
      }
    }
  }
}
