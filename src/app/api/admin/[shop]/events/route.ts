import { requireShop } from "@/lib/auth";
import { sseResponse } from "@/lib/sse";

export async function GET(req: Request, ctx: RouteContext<"/api/admin/[shop]/events">) {
  const { shop } = await requireShop((await ctx.params).shop, "kitchen");
  return sseResponse(req, (e) => e.shopId === shop.id);
}
