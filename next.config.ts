import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Orders, catalogs, and sessions are request-specific. The starter enables
  // Cache Components, which prerenders a static shell and can serve stale data.
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
