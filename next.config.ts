import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/shop/gastro-supply", destination: "/shop/mesara-pajic", permanent: false },
      { source: "/shop/gastro-supply/:path*", destination: "/shop/mesara-pajic/:path*", permanent: false },
      { source: "/s/gastro-supply", destination: "/shop/mesara-pajic", permanent: false },
      { source: "/s/gastro-supply/:path*", destination: "/shop/mesara-pajic/:path*", permanent: false },
      { source: "/shop/butik-vera", destination: "/shop/mercis-atelier", permanent: false },
      { source: "/shop/butik-vera/:path*", destination: "/shop/mercis-atelier/:path*", permanent: false },
      { source: "/s/butik-vera", destination: "/shop/mercis-atelier", permanent: false },
      { source: "/s/butik-vera/:path*", destination: "/shop/mercis-atelier/:path*", permanent: false },
    ];
  },
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
