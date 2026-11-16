import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/dashboard",
        "/orders",
        "/products",
        "/customers",
        "/zaposleni",
        "/settings",
        "/invoices",
        "/nalog",
        "/kupac",
        "/platform",
        "/login",
        "/signup/potvrda",
        "/narudzbina/",
        "/potvrda/",
        "/s/",
      ],
    },
    sitemap: `${getAppUrl()}/sitemap.xml`,
  };
}
