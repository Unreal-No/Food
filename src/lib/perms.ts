import type { Role } from "@/db/schema";

// สิทธิ์ตามบทบาท (ใช้ได้ทั้ง server และ client)
export type Perm = "dashboard" | "orders" | "kitchen" | "catalog" | "scene" | "tables" | "settings" | "staff";

export const PERMS: Record<Role, Perm[]> = {
  owner: ["dashboard", "orders", "kitchen", "catalog", "scene", "tables", "settings", "staff"],
  manager: ["dashboard", "orders", "kitchen", "catalog", "scene", "tables"],
  cashier: ["dashboard", "orders", "kitchen"],
  kitchen: ["kitchen"],
};

export const ROLE_LABEL: Record<Role, string> = { owner: "เจ้าของ", manager: "ผู้จัดการ", cashier: "แคชเชียร์", kitchen: "ครัว" };
