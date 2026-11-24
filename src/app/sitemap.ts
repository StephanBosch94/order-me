import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/config";
import { getCommerce } from "@/lib/data";
import { publicStoreUrl } from "@/lib/store-host";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const stores = await getCommerce().listMarketplaceStores();
  const shops = await Promise.all(
    stores.map(async (store) => {
      const catalog = await getCommerce().getPublicCatalog(store.slug);
      const home = publicStoreUrl(store.slug);
      if (!catalog || catalog.closedMessage || catalog.products.length === 0) return [];
      return [
        { url: home, changeFrequency: "daily" as const, priority: 0.8 },
        ...catalog.products.map((product) => ({
          url: `${home}/proizvod/${product.id}`,
          lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        })),
      ];
    }),
  );

  return [
    { url: appUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/signup`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl}/signup/kupac`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${appUrl}/privatnost`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${appUrl}/uslovi`, changeFrequency: "yearly", priority: 0.2 },
    ...shops.flat(),
  ];
}
