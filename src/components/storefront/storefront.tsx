"use client";

import { Minus, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

import { placeOrderAction } from "@/lib/actions/orders";
import { quantityStep, unitLabel } from "@/lib/constants";
import type { BuyerAccount, Product, PublicCatalog } from "@/lib/data/types";
import { formatQuantity, formatRsd } from "@/lib/format";
import { lineTotalPara } from "@/lib/data/pricing";
import { fold } from "@/lib/text";
import { SupplierLogo } from "@/components/brand/supplier-logo";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { supplierTheme } from "@/lib/color";
import { FieldError, Input, Label, Textarea } from "@/components/ui/fields";

type Step = "browse" | "details";

export function Storefront({
  catalog,
  buyer,
  showAccount = true,
}: {
  catalog: PublicCatalog;
  buyer?: BuyerAccount | null;
  showAccount?: boolean;
}) {
  const router = useRouter();
  const storageKey = `poruci-cart:${catalog.supplier.slug}`;
  const idempotencyStorage = `poruci-idem:${catalog.supplier.slug}`;
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [step, setStep] = useState<Step>("browse");
  const [cartOpen, setCartOpen] = useState(false);
  const storedCart = useSyncExternalStore(subscribeCart, () => readCartRaw(storageKey), () => "{}");
  const quantities = useMemo(() => parseCart(storedCart), [storedCart]);

  const products = useMemo(() => {
    const needle = fold(query.trim());
    return catalog.products.filter((product) => {
      const categoryMatches = categoryId === "all" || product.categoryId === categoryId;
      if (!categoryMatches) return false;
      if (!needle) return true;
      return [product.name, product.sku, product.description].map(fold).some((value) => value.includes(needle));
    });
  }, [catalog.products, categoryId, query]);

  const lines = catalog.products
    .map((product) => ({ product, quantity: quantities[product.id] ?? 0 }))
    .filter((line) => line.quantity > 0);
  const total = lines.reduce((sum, line) => sum + lineTotalPara(line.product.pricePara, line.quantity), 0);
  const count = lines.length;

  function setQuantity(product: Product, quantity: number) {
    const next = { ...quantities };
    if (quantity <= 0) delete next[product.id];
    else next[product.id] = quantity;
    localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event("poruci-cart"));
  }

  function increment(product: Product) {
    const current = quantities[product.id] ?? 0;
    if (current === 0) {
      setQuantity(product, product.minQuantity);
      return;
    }
    const next = Math.min(9999, Math.round((current + quantityStep(product.unit)) * 1000) / 1000);
    setQuantity(product, next);
  }

  function decrement(product: Product) {
    const current = quantities[product.id] ?? 0;
    const next = Math.round((current - quantityStep(product.unit)) * 1000) / 1000;
    setQuantity(product, next < product.minQuantity ? 0 : next);
  }

  const cart = (
    <CartSummary
      lines={lines}
      total={total}
      onChange={setQuantity}
      onContinue={() => {
        setCartOpen(false);
        setStep("details");
      }}
    />
  );

  return (
    <div className="min-h-dvh bg-background pb-24 lg:pb-10" style={supplierTheme(catalog.supplier.brandColor)}>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SupplierLogo name={catalog.supplier.name} logoUrl={catalog.supplier.logoUrl} className="size-12" />
            <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Poručivanje</p>
            <h1 className="truncate text-xl font-semibold tracking-tight">{catalog.supplier.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[catalog.supplier.city, catalog.supplier.phone].filter(Boolean).join(" · ")}
            </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {buyer ? (
              <Link href="/kupac" className="text-sm font-medium underline-offset-2 hover:underline">
                Moj nalog
              </Link>
            ) : showAccount ? (
              <Link href={`/s/${catalog.supplier.slug}/nalog`} className="text-sm font-medium underline-offset-2 hover:underline">
                Otvorite nalog
              </Link>
            ) : null}
            <p className="hidden max-w-xs text-right text-sm text-muted-foreground sm:block">
              Pronađite proizvode, unesite količine i pošaljite porudžbinu.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {step === "browse" ? (
          <section>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pretraži proizvode"
                aria-label="Pretraži proizvode"
                className="h-11 pl-9"
              />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Kategorije">
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
              <div className="mt-6 rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                {catalog.products.length === 0
                  ? "Trenutno nema aktivnih proizvoda."
                  : `Nema proizvoda za „${query.trim()}”.`}
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {products.map((product) => (
                  <li key={product.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <ProductImage src={product.imageUrl} />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {unitLabel(product.unit)}
                            {product.sku ? ` · ${product.sku}` : ""}
                            {product.minQuantity > 1 ? ` · min. ${formatQuantity(product.minQuantity)}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <p className="text-sm font-medium tabular-nums">{formatRsd(product.pricePara)}</p>
                      <QuantityControl
                        product={product}
                        quantity={quantities[product.id] ?? 0}
                        onIncrement={() => increment(product)}
                        onDecrement={() => decrement(product)}
                        onCommit={(quantity) => setQuantity(product, quantity)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <Checkout
            slug={catalog.supplier.slug}
            buyer={buyer}
            lines={lines}
            total={total}
            idempotencyStorage={idempotencyStorage}
            onBack={() => setStep("browse")}
            onSuccess={(token) => {
              localStorage.removeItem(storageKey);
              sessionStorage.removeItem(idempotencyStorage);
              window.dispatchEvent(new Event("poruci-cart"));
              router.push(`/s/${catalog.supplier.slug}/potvrda/${token}`);
            }}
          />
        )}
        <aside className="hidden lg:block">{step === "browse" ? cart : null}</aside>
      </div>

      {step === "browse" ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card p-3 lg:hidden">
          <button
            type="button"
            className="flex h-12 w-full cursor-pointer items-center justify-between rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={count === 0}
            onClick={() => setCartOpen(true)}
          >
            <span>{count === 0 ? "Izaberite proizvode" : `Korpa · ${count}`}</span>
            <span className="tabular-nums">{formatRsd(total)}</span>
          </button>
        </div>
      ) : null}

      {cartOpen ? (
        <dialog open className="fixed inset-x-0 bottom-0 m-0 w-full max-w-none rounded-t-xl border border-border bg-card p-4">
          <div className="mx-auto max-w-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Korpa</h2>
              <button type="button" className="h-10 cursor-pointer px-2 text-sm" onClick={() => setCartOpen(false)}>
                Zatvori
              </button>
            </div>
            {cart}
          </div>
        </dialog>
      ) : null}
    </div>
  );
}

function CategoryButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 shrink-0 cursor-pointer rounded-full px-3 text-sm ${active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}
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

function QuantityControl({
  product,
  quantity,
  onIncrement,
  onDecrement,
  onCommit,
}: {
  product: Product;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onCommit: (quantity: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (quantity ? String(quantity).replace(".", ",") : "");

  return (
    <div className="flex items-center">
      <button
        type="button"
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-l-md border border-border bg-card disabled:opacity-40"
        aria-label={`Smanji količinu za ${product.name}`}
        onClick={onDecrement}
        disabled={quantity === 0}
      >
        <Minus className="size-4" />
      </button>
      <input
        inputMode="decimal"
        aria-label={`Količina za ${product.name}`}
        className="h-11 w-14 border-y border-border bg-card text-center text-sm tabular-nums outline-none"
        value={shown}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const parsed = Number(shown.trim().replace(",", "."));
          setDraft(null);
          if (!shown.trim() || !Number.isFinite(parsed) || parsed <= 0) {
            onCommit(0);
            return;
          }
          onCommit(parsed < product.minQuantity ? product.minQuantity : parsed);
        }}
      />
      <button
        type="button"
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-r-md border border-border bg-card"
        aria-label={`Povećaj količinu za ${product.name}`}
        onClick={onIncrement}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function CartSummary({
  lines,
  total,
  onChange,
  onContinue,
}: {
  lines: { product: Product; quantity: number }[];
  total: number;
  onChange: (product: Product, quantity: number) => void;
  onContinue: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Korpa</h2>
      {lines.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Izaberite količine pored proizvoda.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {lines.map((line) => (
            <li key={line.product.id} className="text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{line.product.name}</p>
                <p className="tabular-nums">{formatRsd(lineTotalPara(line.product.pricePara, line.quantity))}</p>
              </div>
              <div className="mt-1 flex items-center justify-between text-muted-foreground">
                <span>
                  {formatQuantity(line.quantity)} {unitLabel(line.product.unit).toLowerCase()} · {formatRsd(line.product.pricePara)}
                </span>
                <button type="button" className="cursor-pointer text-foreground underline-offset-2 hover:underline" onClick={() => onChange(line.product, 0)}>
                  Ukloni
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
        <span>Ukupno</span>
        <span className="font-semibold tabular-nums">{formatRsd(total)}</span>
      </div>
      <Button className="mt-4 w-full" disabled={lines.length === 0} onClick={onContinue}>
        Nastavi na podatke
      </Button>
    </div>
  );
}

function Checkout({
  slug,
  buyer,
  lines,
  total,
  idempotencyStorage,
  onBack,
  onSuccess,
}: {
  slug: string;
  buyer?: BuyerAccount | null;
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
    const idempotencyKey = readIdempotencyKey(idempotencyStorage);
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    const result = await placeOrderAction({
      slug,
      idempotencyKey,
      businessName: form.get("businessName"),
      contactName: form.get("contactName"),
      email: form.get("email"),
      phone: form.get("phone"),
      pib: form.get("pib") ?? "",
      address: form.get("address") ?? "",
      city: form.get("city") ?? "",
      notes: form.get("notes") ?? "",
      honeypot,
      items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
    });
    setPending(false);
    if (!result.ok || !result.token) {
      setMessage(result.message ?? "Porudžbina nije poslata.");
      setErrors(result.fieldErrors ?? {});
      return;
    }
    onSuccess(result.token);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <button type="button" className="cursor-pointer text-sm text-muted-foreground hover:text-foreground" onClick={onBack}>
          Nazad na proizvode
        </button>
        <h2 className="mt-2 text-lg font-semibold">Podaci za porudžbinu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {buyer ? `Prijavljeni ste kao ${buyer.businessName}. ` : null}
          Ukupno {formatRsd(total)}. Cene važe u trenutku slanja.
        </p>
      </div>
      {message ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="businessName" label="Naziv firme" error={errors.businessName} required defaultValue={buyer?.businessName} />
        <Field name="contactName" label="Kontakt osoba" error={errors.contactName} required defaultValue={buyer?.name} />
        <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} required defaultValue={buyer?.email} />
        <Field name="phone" label="Telefon" autoComplete="tel" error={errors.phone} required defaultValue={buyer?.phone} />
        <Field name="pib" label="PIB" error={errors.pib} defaultValue={buyer?.pib} />
        <Field name="city" label="Grad" autoComplete="address-level2" error={errors.city} defaultValue={buyer?.city} />
        <div className="sm:col-span-2">
          <Field name="address" label="Adresa isporuke" autoComplete="street-address" error={errors.address} defaultValue={buyer?.address} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Napomena</Label>
          <Textarea id="notes" name="notes" className="mt-1.5" placeholder="Vreme isporuke, ulaz, posebne napomene" />
        </div>
      </div>
      <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
        </label>
      </div>
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? "Slanje…" : "Potvrdi porudžbinu"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  error,
  required,
  type = "text",
  autoComplete,
  defaultValue,
}: {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input id={name} name={name} type={type} autoComplete={autoComplete} required={required} defaultValue={defaultValue} className="mt-1.5 h-11" aria-invalid={Boolean(error)} />
      <FieldError message={error} />
    </div>
  );
}
