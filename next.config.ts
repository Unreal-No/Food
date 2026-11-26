import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@electric-sql/pglite", "sharp", "meshoptimizer", "@gltf-transform/core", "@gltf-transform/functions", "@gltf-transform/extensions"],
  experimental: { serverActions: { bodySizeLimit: "16mb" } }, // อัปโหลด GLB / ภาพทีละไฟล์
  poweredByHeader: false,
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
    ];
    return [
      { source: "/:path*", headers: [...base, { key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      { source: "/admin/:path*", headers: [{ key: "X-Frame-Options", value: "DENY" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
