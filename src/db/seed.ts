import { shops, categories, products, productVariants, optionGroups, options, productOptionGroups } from "./schema";
import type { DB } from "./index";

const B = (baht: number) => Math.round(baht * 100);

type SeedProduct = {
  cat: number; name: string; emoji: string; desc: string; price: number; badge?: string;
  variants?: [string, number][]; groups?: number[];
};
type SeedShop = {
  slug: string; name: string; type: "cafe" | "restaurant"; tagline: string; promptpayId: string;
  theme: typeof shops.$inferInsert["theme"]; hours: typeof shops.$inferInsert["hours"];
  categories: [string, string][];
  groups: { name: string; min: number; max: number; opts: [string, number, boolean?][] }[];
  products: SeedProduct[];
};

const DATA: SeedShop[] = [
  {
    slug: "mellow-bean", name: "Mellow Bean", type: "cafe", promptpayId: "0812345678",
    tagline: "คั่วเองทุกเช้า · กาแฟพิเศษจากดอยไทย",
    theme: { primary: "#6b3e26", accent: "#d9a066", bg: "#f7f1e8", surface: "#fffaf3", text: "#2a1a12", font: "classic", heroEmoji: "☕" },
    hours: { open: "07:00", close: "18:00", days: [0, 1, 2, 3, 4, 5, 6] },
    categories: [["กาแฟ", "☕"], ["ชา & นม", "🍵"], ["เบเกอรี่", "🥐"]],
    groups: [
      { name: "ความหวาน", min: 1, max: 1, opts: [["ไม่หวาน", 0], ["หวานน้อย", 0], ["หวานปกติ", 0, true], ["หวานมาก", 0]] },
      { name: "นม", min: 1, max: 1, opts: [["นมวัว", 0, true], ["นมโอ๊ต", 15], ["นมอัลมอนด์", 15]] },
      { name: "ท็อปปิ้ง", min: 0, max: 3, opts: [["เพิ่มช็อต", 15], ["วิปครีม", 10], ["ไข่มุก", 10]] },
    ],
    products: [
      { cat: 0, name: "Signature Latte", emoji: "☕", desc: "เอสเปรสโซ่คั่วกลาง นมสตีมเนียนนุ่ม", price: 55, badge: "ขายดี", variants: [["ร้อน", 55], ["เย็น", 60], ["ปั่น", 70]], groups: [0, 1, 2] },
      { cat: 0, name: "Americano", emoji: "🖤", desc: "เข้ม สะอาด กลิ่นช็อกโกแลตและถั่ว", price: 45, variants: [["ร้อน", 45], ["เย็น", 50]], groups: [0, 2] },
      { cat: 0, name: "Dirty Coffee", emoji: "🥛", desc: "ช็อตร้อนบนนมเย็นจัด ดื่มทันที", price: 75, badge: "ใหม่", groups: [1] },
      { cat: 1, name: "Uji Matcha Latte", emoji: "🍵", desc: "มัทฉะเกรดพิธีจากอุจิ", price: 70, variants: [["ร้อน", 70], ["เย็น", 75]], groups: [0, 1, 2] },
      { cat: 1, name: "ชาไทยโบราณ", emoji: "🧡", desc: "ชาซีลอนต้มเอง หอมควันเทียน", price: 50, variants: [["เย็น", 50], ["ปั่น", 60]], groups: [0, 2] },
      { cat: 2, name: "Butter Croissant", emoji: "🥐", desc: "เนยฝรั่งเศส 27 ชั้น อบใหม่ทุกชั่วโมง", price: 65 },
      { cat: 2, name: "Basque Cheesecake", emoji: "🍰", desc: "ผิวไหม้หอม เนื้อในเยิ้ม", price: 95, badge: "ขายดี" },
    ],
  },
  {
    slug: "baan-som", name: "ครัวบ้านส้ม", type: "restaurant", promptpayId: "0898765432",
    tagline: "อาหารตามสั่งรสมือแม่ · ผัดร้อนๆ ทุกจาน",
    theme: { primary: "#c2410c", accent: "#facc15", bg: "#fff7ed", surface: "#ffffff", text: "#1c1917", font: "modern", heroEmoji: "🍳" },
    hours: { open: "10:00", close: "21:00", days: [1, 2, 3, 4, 5, 6] },
    categories: [["จานเดียว", "🍛"], ["ต้ม & แกง", "🍲"], ["เครื่องดื่ม", "🥤"]],
    groups: [
      { name: "ความเผ็ด", min: 1, max: 1, opts: [["ไม่เผ็ด", 0], ["เผ็ดน้อย", 0], ["เผ็ดกลาง", 0, true], ["เผ็ดมาก", 0]] },
      { name: "ไข่", min: 0, max: 2, opts: [["ไข่ดาว", 10], ["ไข่ดาวไม่สุก", 10], ["ไข่เจียว", 15]] },
      { name: "ขนาด", min: 1, max: 1, opts: [["ธรรมดา", 0, true], ["พิเศษ", 10]] },
    ],
    products: [
      { cat: 0, name: "ข้าวกะเพรา", emoji: "🍛", desc: "กะเพราป่าแท้ ผัดไฟแรง หอมกระทะ", price: 60, badge: "ขายดี", variants: [["หมูสับ", 60], ["ไก่", 60], ["หมูกรอบ", 70], ["กุ้ง", 80]], groups: [0, 1, 2] },
      { cat: 0, name: "ข้าวผัด", emoji: "🍚", desc: "ข้าวหอมมะลิผัดไข่ เม็ดร่วนสวย", price: 60, variants: [["หมู", 60], ["ปู", 90]], groups: [1, 2] },
      { cat: 0, name: "ผัดไทยกุ้งสด", emoji: "🍤", desc: "เส้นจันท์ ซอสเคี่ยวเอง", price: 80, groups: [0, 2] },
      { cat: 1, name: "ต้มยำกุ้งน้ำข้น", emoji: "🍲", desc: "กุ้งแม่น้ำ น้ำพริกเผาสูตรบ้าน", price: 150, badge: "แนะนำ", groups: [0] },
      { cat: 2, name: "ชามะนาว", emoji: "🍋", desc: "เปรี้ยวหวานสดชื่น", price: 35 },
      { cat: 2, name: "น้ำส้มคั้น", emoji: "🍊", desc: "ส้มสายน้ำผึ้งคั้นสด", price: 45 },
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

    const cats = await db.insert(categories)
      .values(s.categories.map(([name, icon], i) => ({ shopId: shop.id, name, icon, sort: i })))
      .returning();

    const groupIds: string[] = [];
    for (const [gi, gr] of s.groups.entries()) {
      const [row] = await db.insert(optionGroups)
        .values({ shopId: shop.id, name: gr.name, minSelect: gr.min, maxSelect: gr.max, sort: gi })
        .returning();
      groupIds.push(row.id);
      await db.insert(options).values(gr.opts.map(([name, delta, def], i) => ({
        groupId: row.id, name, priceDelta: B(delta), isDefault: !!def, sort: i,
      })));
    }

    for (const [pi, p] of s.products.entries()) {
      const [row] = await db.insert(products).values({
        shopId: shop.id, categoryId: cats[p.cat].id, name: p.name, emoji: p.emoji,
        description: p.desc, basePrice: B(p.price), badge: p.badge ?? "", sort: pi,
      }).returning();
      if (p.variants?.length) {
        await db.insert(productVariants).values(p.variants.map(([name, price], i) => ({
          productId: row.id, name, price: B(price), sort: i,
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
