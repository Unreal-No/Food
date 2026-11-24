import { connection } from "next/server";
import { sseResponse } from "@/lib/sse";

// ลูกค้าดูสถานะออเดอร์ของตัวเอง: ส่งเฉพาะสถานะ ไม่มีข้อมูลอื่น
export async function GET(req: Request, ctx: RouteContext<"/api/orders/[id]/events">) {
  await connection();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  return sseResponse(req, (e) => e.orderId === id, (e) => ({ status: e.status }));
}
