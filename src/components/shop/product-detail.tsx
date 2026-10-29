"use client";

import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { productPath, quantityStep, unitLabel } from "@/lib/constants";
import { salePricePara } from "@/lib/data/pricing";
import type { Product } from "@/lib/data/types";
import { formatQuantity, formatRsd } from "@/lib/format";

export function ProductDetail({
  slug,
  product,
  categoryName,
  business,
  backHref,
  others,
}: {
  slug: string;
  product: Product;
  categoryName: string | null;
  business: boolean;
  backHref: string;
  others: Product[];
}) {
  const storageKey = business ? `poruci-cart:${slug}` : `poruci-shop:${slug}`;
  const storedCart = useSyncExternalStore(subscribeCart, () => readCartRaw(storageKey), () => "{}");
  const quantities = useMemo(() => parseCart(storedCart), [storedCart]);
  const quantity = quantities[product.id] ?? 0;
  const sale = salePricePara(product);
  const photos = product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];

  function write(nextQuantity: number) {
    const next = { ...quantities };
    if (nextQuantity <= 0) delete next[product.id];
    else next[product.id] = nextQuantity;
    localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event("poruci-cart"));
  }

  function add() {
    const next =
      quantity === 0
        ? product.minQuantity
        : Math.min(9999, Math.round((quantity + quantityStep(product.unit)) * 1000) / 1000);
    write(next);
  }

  function subtract() {
    const next = Math.round((quantity - quantityStep(product.unit)) * 1000) / 1000;
    write(next < product.minQuantity ? 0 : next);
  }

  return (
    <div>
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
      <Gallery photos={photos} name={product.name} />
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Nazad u prodavnicu
        </Link>
        {categoryName ? <p className="mt-4 text-sm text-muted-foreground">{categoryName}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h1>
        <div className="mt-4 flex items-end gap-3">
          {sale ? <p className="text-sm text-muted-foreground line-through tabular-nums">{formatRsd(product.pricePara)}</p> : null}
          <p className="text-2xl font-semibold tabular-nums">{formatRsd(sale ?? product.pricePara)}</p>
          {sale ? <span className="mb-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Akcija</span> : null}
        </div>
        <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <div>
            <dt className="sr-only">Jedinica</dt>
            <dd>{unitLabel(product.unit)}</dd>
          </div>
          {product.sku ? (
            <div>
              <dt className="sr-only">Šifra</dt>
              <dd>{product.sku}</dd>
            </div>
          ) : null}
          {product.minQuantity > 1 ? (
            <div>
              <dt className="sr-only">Minimalna količina</dt>
              <dd>min. {formatQuantity(product.minQuantity)}</dd>
            </div>
          ) : null}
        </dl>
        {product.description ? (
          <div className="mt-6">
            <h2 className="text-sm font-semibold">Opis</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{product.description}</p>
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            <button
              type="button"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-l-md border border-border bg-card disabled:opacity-40"
              aria-label="Smanji količinu"
              onClick={subtract}
              disabled={quantity === 0}
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span className="inline-flex h-11 min-w-14 items-center justify-center border-y border-border bg-card px-3 text-sm tabular-nums">
              {quantity ? formatQuantity(quantity) : "0"}
            </span>
            <button
              type="button"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-r-md border border-border bg-card"
              aria-label="Povećaj količinu"
              onClick={add}
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
          <Button type="button" onClick={add}>
            {quantity > 0 ? "Dodaj još" : "Dodaj u korpu"}
          </Button>
          {quantity > 0 ? <p className="text-sm text-muted-foreground">U korpi: {formatQuantity(quantity)}</p> : null}
        </div>
      </div>
    </div>
    {others.length > 0 ? (
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6" aria-labelledby="drugi-proizvodi">
        <h2 id="drugi-proizvodi" className="text-lg font-semibold">
          Drugi proizvodi
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {others.map((item) => {
            const itemSale = salePricePara(item);
            return (
              <li key={item.id}>
                <Link
                  href={productPath(slug, item.id, business)}
                  className="block overflow-hidden rounded-2xl bg-card ring-1 ring-black/5"
                >
                  <ProductImage src={item.imageUrl} alt="" className="aspect-[3/2] h-auto w-full rounded-none border-0" />
                  <span className="block p-3">
                    <span className="line-clamp-2 text-sm font-semibold">{item.name}</span>
                    {itemSale ? (
                      <span className="mt-1 block text-xs text-muted-foreground line-through tabular-nums">{formatRsd(item.pricePara)}</span>
                    ) : null}
                    <span className="mt-1 block text-sm font-semibold tabular-nums">{formatRsd(itemSale ?? item.pricePara)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    ) : null}
    </div>
  );
}

function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = photos[index] ?? null;
  const many = photos.length > 1;

  function move(step: number) {
    setIndex((value) => (value + step + photos.length) % photos.length);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-black/5">
        <ProductImage src={current} alt={name} className="aspect-[4/3] h-auto w-full rounded-none border-0" />
        {many ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm"
              aria-label="Prethodna slika"
              onClick={() => move(-1)}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm"
              aria-label="Sledeća slika"
              onClick={() => move(1)}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      {many ? (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {photos.map((photo, photoIndex) => (
            <li key={`${photo}-${photoIndex}`}>
              <button
                type="button"
                aria-label={`Slika ${photoIndex + 1}`}
                aria-current={photoIndex === index ? "true" : undefined}
                className={`block w-full overflow-hidden rounded-lg ${photoIndex === index ? "ring-2 ring-primary" : "ring-1 ring-border"}`}
                onClick={() => setIndex(photoIndex)}
              >
                <ProductImage src={photo} alt="" className="aspect-square h-auto w-full rounded-none border-0" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function readCartRaw(key: string) {
  try {
    return localStorage.getItem(key) ?? "{}";
  } catch {
    return "{}";
  }
}

function parseCart(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function subscribeCart(callback: () => void) {
  window.addEventListener("poruci-cart", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("poruci-cart", callback);
    window.removeEventListener("storage", callback);
  };
}
