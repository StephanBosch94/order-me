"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

import { placeShopOrderAction } from "@/lib/actions/orders";
import { supplierTheme } from "@/lib/color";
import { quantityStep } from "@/lib/constants";
import { lineTotalPara } from "@/lib/data/pricing";
import type { Product, PublicCatalog } from "@/lib/data/types";
import { formatRsd } from "@/lib/format";
import { SupplierLogo } from "@/components/brand/supplier-logo";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/fields";

type Step = "browse" | "cart" | "checkout";

export function Shop({ catalog }: { catalog: PublicCatalog }) {
  const router = useRouter();
  const storageKey = `poruci-shop:${catalog.supplier.slug}`;
  const idempotencyStorage = `poruci-shop-idem:${catalog.supplier.slug}`;
  const [step, setStep] = useState<Step>("browse");
  const [categoryId, setCategoryId] = useState("all");
  const storedCart = useSyncExternalStore(subscribeCart, () => readCartRaw(storageKey), () => "{}");
  const quantities = useMemo(() => parseCart(storedCart), [storedCart]);

  const products = catalog.products.filter(
    (product) => categoryId === "all" || product.categoryId === categoryId,
  );
  const lines = catalog.products
    .map((product) => ({ product, quantity: quantities[product.id] ?? 0 }))
    .filter((line) => line.quantity > 0);
  const total = lines.reduce((sum, line) => sum + lineTotalPara(line.product.pricePara, line.quantity), 0);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  function setQuantity(product: Product, quantity: number) {
    const next = { ...quantities };
    if (quantity <= 0) delete next[product.id];
    else next[product.id] = quantity;
    localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event("poruci-cart"));
  }

  function add(product: Product) {
    const current = quantities[product.id] ?? 0;
    const next =
      current === 0
        ? product.minQuantity
        : Math.min(9999, Math.round((current + quantityStep(product.unit)) * 1000) / 1000);
    setQuantity(product, next);
  }

  return (
    <div className="min-h-dvh bg-background pb-24" style={supplierTheme(catalog.supplier.brandColor)}>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SupplierLogo name={catalog.supplier.name} logoUrl={catalog.supplier.logoUrl} className="size-12" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Internet prodavnica</p>
              <h1 className="truncate text-xl font-semibold tracking-tight">{catalog.supplier.name}</h1>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setStep(step === "browse" ? "cart" : "browse")}>
            <ShoppingBag className="size-4" aria-hidden="true" />
            Korpa
            <span className="tabular-nums">{count}</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {step === "browse" ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Kategorije">
              <CategoryButton active={categoryId === "all"} onClick={() => setCategoryId("all")}>
                Sve
              </CategoryButton>
              {catalog.categories.map((category) => (
                <CategoryButton
                  key={category.id}
                  active={categoryId === category.id}
                  onClick={() => setCategoryId(category.id)}
                >
                  {category.name}
                </CategoryButton>
              ))}
            </div>
            {products.length === 0 ? (
              <p className="mt-6 rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                Trenutno nema proizvoda.
              </p>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <li key={product.id} className="flex flex-col rounded-lg border border-border bg-card p-4">
                    <ProductImage src={product.imageUrl} className="aspect-square h-auto w-full" />
                    <h2 className="mt-3 text-sm font-semibold">{product.name}</h2>
                    {product.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      <p className="text-sm font-semibold tabular-nums">{formatRsd(product.pricePara)}</p>
                      <Button size="sm" onClick={() => add(product)}>
                        <Plus className="size-4" aria-hidden="true" />
                        Dodaj
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}

        {step === "cart" ? (
          <Cart
            lines={lines}
            total={total}
            onChange={setQuantity}
            onBack={() => setStep("browse")}
            onCheckout={() => setStep("checkout")}
          />
        ) : null}

        {step === "checkout" ? (
          <Checkout
            slug={catalog.supplier.slug}
            lines={lines}
            total={total}
            idempotencyStorage={idempotencyStorage}
            onBack={() => setStep("cart")}
            onSuccess={(token) => {
              localStorage.removeItem(storageKey);
              sessionStorage.removeItem(idempotencyStorage);
              window.dispatchEvent(new Event("poruci-cart"));
              router.push(`/s/${catalog.supplier.slug}/potvrda/${token}`);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function Cart({
  lines,
  total,
  onChange,
  onBack,
  onCheckout,
}: {
  lines: { product: Product; quantity: number }[];
  total: number;
  onChange: (product: Product, quantity: number) => void;
  onBack: () => void;
  onCheckout: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={onBack}>
        Nazad na proizvode
      </button>
      <h2 className="mt-2 text-lg font-semibold">Korpa</h2>
      {lines.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Korpa je prazna.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
          {lines.map((line) => (
            <li key={line.product.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{line.product.name}</p>
                <p className="text-sm text-muted-foreground tabular-nums">{formatRsd(line.product.pricePara)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-md border border-border"
                  aria-label={`Smanji ${line.product.name}`}
                  onClick={() =>
                    onChange(
                      line.product,
                      line.quantity - quantityStep(line.product.unit) < line.product.minQuantity
                        ? 0
                        : Math.round((line.quantity - quantityStep(line.product.unit)) * 1000) / 1000,
                    )
                  }
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-md border border-border"
                  aria-label={`Povećaj ${line.product.name}`}
                  onClick={() =>
                    onChange(
                      line.product,
                      Math.min(9999, Math.round((line.quantity + quantityStep(line.product.unit)) * 1000) / 1000),
                    )
                  }
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span>Ukupno</span>
        <span className="font-semibold tabular-nums">{formatRsd(total)}</span>
      </div>
      <Button className="mt-4 w-full" disabled={lines.length === 0} onClick={onCheckout}>
        Na kasu
      </Button>
    </div>
  );
}

function Checkout({
  slug,
  lines,
  total,
  idempotencyStorage,
  onBack,
  onSuccess,
}: {
  slug: string;
  lines: { product: Product; quantity: number }[];
  total: number;
  idempotencyStorage: string;
  onBack: () => void;
  onSuccess: (token: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    const result = await placeShopOrderAction({
      slug,
      idempotencyKey: readIdempotencyKey(idempotencyStorage),
      customerName: form.get("customerName"),
      email: form.get("email"),
      phone: form.get("phone"),
      address: form.get("address"),
      city: form.get("city"),
      notes: form.get("notes") ?? "",
      honeypot,
      items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
    });
    setPending(false);
    if (!result.ok || !result.token) {
      setMessage(result.message ?? "Kupovina nije poslata.");
      setErrors(result.fieldErrors ?? {});
      return;
    }
    onSuccess(result.token);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4" noValidate>
      <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={onBack}>
        Nazad na korpu
      </button>
      <h2 className="text-lg font-semibold">Kasa</h2>
      <p className="text-sm text-muted-foreground">Ukupno {formatRsd(total)}. Isporuka na adresu koju unesete.</p>
      {message ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {message}
        </p>
      ) : null}
      <Field name="customerName" label="Ime i prezime" autoComplete="name" error={errors.customerName} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
      <Field name="phone" label="Telefon" autoComplete="tel" error={errors.phone} />
      <Field name="address" label="Adresa" autoComplete="street-address" error={errors.address} />
      <Field name="city" label="Grad" autoComplete="address-level2" error={errors.city} />
      <div>
        <Label htmlFor="notes">Napomena</Label>
        <Textarea id="notes" name="notes" className="mt-1.5" />
      </div>
      <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
        </label>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Slanje…" : "Potvrdi kupovinu"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  error,
  type = "text",
  autoComplete,
}: {
  name: string;
  label: string;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} autoComplete={autoComplete} required className="mt-1.5 h-11" aria-invalid={Boolean(error)} />
      <FieldError message={error} />
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full px-3 text-sm ${active ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border"}`}
    >
      {children}
    </button>
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

function readIdempotencyKey(storageKey: string) {
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const key = crypto.randomUUID();
  sessionStorage.setItem(storageKey, key);
  return key;
}

function subscribeCart(callback: () => void) {
  window.addEventListener("poruci-cart", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("poruci-cart", callback);
    window.removeEventListener("storage", callback);
  };
}
