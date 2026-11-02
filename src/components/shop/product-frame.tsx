"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { StoreAccountLinks } from "@/components/shop/account-links";
import { BuyerMenu } from "@/components/shop/buyer-menu";
import { CartButton } from "@/components/shop/cart-button";
import { StoreHeader } from "@/components/shop/store-header";
import { Cart, Checkout } from "@/components/shop/shop";
import { supplierTheme } from "@/lib/color";
import type { DemoRole } from "@/lib/demo-shops";
import { normalizeCartQuantity, ordersPath, storePath } from "@/lib/constants";
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
  demoRole = null,
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
  demoRole?: DemoRole | null;
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
      <StoreHeader
        href={backHref}
        name={name}
        logoUrl={logoUrl}
        role={demoRole ? { slug, active: demoRole } : null}
      >
        <StoreAccountLinks slug={slug} buyer={buyer} showAccount={showAccount} />
            <CartButton count={count} onClick={() => setPanel((value) => (value === "product" ? "cart" : "product"))} />
            {buyer ? (
              <BuyerMenu
                buyer={buyer}
                accountHref={`${backHref}?nalog=1`}
                ordersHref={ordersPath(slug)}
                shopPath={backHref}
              />
            ) : null}
      </StoreHeader>
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
            audience={audience}
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
