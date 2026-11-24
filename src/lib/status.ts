import type { OrderStatus } from "@/db/schema";

export const STATUS_STEPS: OrderStatus[] = ["pending_payment", "paid", "preparing", "ready", "completed"];
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "รอชำระ", paid: "ชำระแล้ว", preparing: "กำลังทำ", ready: "พร้อมรับ", completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
};
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending_payment: "paid", paid: "preparing", preparing: "ready", ready: "completed",
};
