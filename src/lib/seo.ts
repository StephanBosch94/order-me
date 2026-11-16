import type { Metadata } from "next";

import { unitLabel } from "@/lib/constants";
import { getAppUrl } from "@/lib/config";
import { effectivePricePara } from "@/lib/data/pricing";
import type { Product, PublicSupplier } from "@/lib/data/types";
import { formatRsd } from "@/lib/format";
import { publicStoreUrl } from "@/lib/store-host";

export const siteName = "Vendro";

export const siteTitle = "Vendro — porudžbine za veleprodaju, bez poziva";

export const siteDescription =
  "Kupci naručuju online, u bilo koje vreme. Svaka porudžbina stiže na jedno mesto, umesto u poziv ili poruku. Prva 3 meseca besplatno.";

export const noIndex: Metadata = {
  robots: { index: false, follow: false },
};

export function absoluteUrl(path: string, base = getAppUrl()) {
  const root = base.replace(/\/$/, "");
  const value = path.trim();
  if (!value || value === "/") return root;
  if (/^https?:\/\//i.test(value)) return value;
  return `${root}${value.startsWith("/") ? value : `/${value}`}`;
}

export function metaDescription(value: string, fallback: string) {
  const text = value.replace(/\s+/g, " ").trim();
  const source = text || fallback;
  if (source.length <= 160) return source;
  return `${source.slice(0, 157).trimEnd()}…`;
}

export function schemaPrice(para: number) {
  return (para / 100).toFixed(2);
}

export function shopDescription(supplier: Pick<PublicSupplier, "name" | "description" | "city">) {
  const place = supplier.city.trim() ? `, ${supplier.city.trim()},` : "";
  return metaDescription(supplier.description, `${supplier.name}${place} prima porudžbine online. Cenovnik i potvrda u dinarima.`);
}

export function storeMetadata(supplier: PublicSupplier, index: boolean): Metadata {
  const canonical = publicStoreUrl(supplier.slug);
  const description = shopDescription(supplier);
  const image = supplier.coverUrl || supplier.logoUrl;
  return indexedPage({
    title: supplier.name,
    description,
    canonical,
    index,
    image: image ? absoluteUrl(image) : null,
    imageAlt: supplier.name,
  });
}

export function productMetadata(supplier: PublicSupplier, product: Product, index: boolean): Metadata {
  const canonical = `${publicStoreUrl(supplier.slug)}/proizvod/${product.id}`;
  const price = effectivePricePara(product);
  const description = metaDescription(
    product.description,
    `${product.name} kod ${supplier.name}. ${formatRsd(price)} po ${unitLabel(product.unit).toLowerCase()}.`,
  );
  const image = product.imageUrl || product.imageUrls[0] || supplier.coverUrl || supplier.logoUrl;
  return indexedPage({
    title: { absolute: `${product.name} · ${supplier.name}` },
    description,
    canonical,
    index,
    image: image ? absoluteUrl(image) : null,
    imageAlt: product.name,
  });
}

export function signupMetadata(title: string, description: string, path: string): Metadata {
  return indexedPage({
    title,
    description: metaDescription(description, siteDescription),
    canonical: absoluteUrl(path),
    index: true,
    image: null,
    imageAlt: siteName,
  });
}

function indexedPage(input: {
  title: Metadata["title"];
  description: string;
  canonical: string;
  index: boolean;
  image: string | null;
  imageAlt: string;
}): Metadata {
  const title = openGraphTitle(input.title);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.canonical },
    robots: input.index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "sr_RS",
      url: input.canonical,
      siteName,
      title,
      description: input.description,
      images: input.image ? [{ url: input.image, alt: input.imageAlt }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
    },
  };
}

function openGraphTitle(title: Metadata["title"]) {
  if (!title) return siteName;
  if (typeof title === "string") return title;
  if ("absolute" in title && title.absolute) return title.absolute;
  return siteName;
}

export function organizationJsonLd(appUrl = getAppUrl()) {
  const url = appUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: siteName,
        url,
        logo: absoluteUrl("/brand/vendro-logo.png", url),
        email: "porudzbine@vendro.rs",
      },
      {
        "@type": "WebSite",
        name: siteName,
        url,
        inLanguage: "sr",
        description: siteDescription,
      },
    ],
  };
}

export function storeJsonLd(supplier: PublicSupplier) {
  const url = publicStoreUrl(supplier.slug);
  const image = supplier.coverUrl || supplier.logoUrl;
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: supplier.name,
    url,
    description: shopDescription(supplier),
    image: image ? absoluteUrl(image) : undefined,
    telephone: supplier.phone.trim() || undefined,
    address: supplier.city.trim()
      ? {
          "@type": "PostalAddress",
          streetAddress: supplier.address.trim() || undefined,
          addressLocality: supplier.city.trim(),
          addressCountry: "RS",
        }
      : undefined,
  };
}

export function productJsonLd(supplier: PublicSupplier, product: Product) {
  const price = effectivePricePara(product);
  const image = product.imageUrl || product.imageUrls[0] || supplier.coverUrl || supplier.logoUrl;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: metaDescription(product.description, `${product.name} kod ${supplier.name}.`),
    sku: product.sku || undefined,
    image: image ? absoluteUrl(image) : undefined,
    brand: { "@type": "Brand", name: supplier.name },
    offers: {
      "@type": "Offer",
      url: `${publicStoreUrl(supplier.slug)}/proizvod/${product.id}`,
      priceCurrency: "RSD",
      price: schemaPrice(price),
      availability: "https://schema.org/InStock",
    },
  };
}
