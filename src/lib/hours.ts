import type { ShopHours } from "@/db/schema";

export function isOpen(h: ShopHours, now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  return h.days.includes(now.getDay()) && mins >= oh * 60 + om && mins < ch * 60 + cm;
}
