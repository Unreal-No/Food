import { readUpload } from "@/lib/storage";

export async function GET(_: Request, ctx: RouteContext<"/media/[shop]/[file]">) {
  const { shop, file } = await ctx.params;
  const f = await readUpload(shop, file);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.body), {
    headers: { "Content-Type": f.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
