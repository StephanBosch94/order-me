"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { SupplierLogo } from "@/components/brand/supplier-logo";
import { StoreAccountLinks } from "@/components/shop/account-links";
import { BuyerMenu } from "@/components/shop/buyer-menu";
import { Cart, Checkout } from "@/components/shop/shop";
import { Button } from "@/components/ui/button";
import { supplierTheme } from "@/lib/color";
import { isBusinessStore, normalizeCartQuantity, storePath } from "@/lib/constants";
import { effectivePricePara, lineTotalPara } from "@/lib/data/pricing";
import type { Audience, BuyerAccount, Product } from "@/lib/data/types";

type Panel = "product" | "cart" | "checkout";

export function ProductFrame({
  slug,
  name,
  logoUrl,
  brandColor,
  audience,
  buyer,
  showAccount,
  products,
  children,
}: {
  slug: string;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  audience: Audience;
  buyer: BuyerAccount | null;
  showAccount: boolean;
  products: Product[];
  children: ReactNode;
}) {
  const router = useRouter();
  const backHref = storePath(slug);
  const storageKey = `poruci-shop:${slug}`;
  const idempotencyStorage = `poruci-shop-idem:${slug}`;
  const [panel, setPanel] = useState<Panel>("product");
  const storedCart = useSyncExternalStore(subscribeCart, () => readCartRaw(storageKey), () => "{}");
  const quantities = useMemo(() => parseCart(storedCart), [storedCart]);
  const lines = products
    .map((product) => ({
      product,
      quantity: normalizeCartQuantity(product.unit, quantities[product.id] ?? 0, product.minQuantity),
    }))
    .filter((line) => line.quantity > 0);
  const total = lines.reduce((sum, line) => sum + lineTotalPara(effectivePricePara(line.product), line.quantity), 0);
  const count = lines.length;

  function setQuantity(product: Product, quantity: number) {
    const next = { ...quantities };
    const stored = quantity <= 0 ? 0 : normalizeCartQuantity(product.unit, quantity, product.minQuantity);
    if (stored <= 0) delete next[product.id];
    else next[product.id] = stored;
    localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event("poruci-cart"));
  }

  return (
    <div className="min-h-dvh bg-background" style={supplierTheme(brandColor)}>
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={backHref} className="flex min-w-0 items-center gap-3">
            <SupplierLogo name={name} logoUrl={logoUrl} className="size-10" />
            <span className="truncate text-sm font-semibold">{name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <StoreAccountLinks slug={slug} buyer={buyer} showAccount={showAccount} />
            <Button variant="secondary" onClick={() => setPanel((value) => (value === "product" ? "cart" : "product"))}>
              <ShoppingBag className="size-4" aria-hidden="true" />
              Korpa
              <span className="tabular-nums">{count}</span>
            </Button>
            {buyer ? (
              <BuyerMenu
                buyer={buyer}
                accountHref={`${backHref}?nalog=1`}
                ordersHref={`${backHref}?porudzbine=1`}
                shopPath={backHref}
              />
            ) : null}
          </div>
        </div>
      </header>
      {panel === "cart" ? (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Cart
            lines={lines}
            total={total}
            onChange={setQuantity}
            onBack={() => setPanel("product")}
            onCheckout={() => setPanel("checkout")}
          />
        </div>
      ) : null}
      {panel === "checkout" ? (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Checkout
            slug={slug}
            business={isBusinessStore(audience)}
            buyer={buyer}
            lines={lines}
            total={total}
            idempotencyStorage={idempotencyStorage}
            onBack={() => setPanel("cart")}
            onSuccess={(token) => {
              localStorage.removeItem(storageKey);
              sessionStorage.removeItem(idempotencyStorage);
              window.dispatchEvent(new Event("poruci-cart"));
              router.push(`/s/${slug}/potvrda/${token}`);
            }}
          />
        </div>
      ) : null}
      {panel === "product" ? children : null}
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
