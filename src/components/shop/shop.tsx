"use client";

import { ChevronLeft, ChevronRight, Minus, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { StoreAccountLinks } from "@/components/shop/account-links";
import { BuyerMenu } from "@/components/shop/buyer-menu";
import { CartButton } from "@/components/shop/cart-button";
import { StoreHeader } from "@/components/shop/store-header";
import {
  BuyerKindChoice,
  PaymentMethodChoice,
  checkoutParty,
  showsGuestPartySwitch,
  type BuyerKind,
} from "@/components/shop/checkout-kind";
import { updateBuyerAccountAction, type BuyerAccountState } from "@/lib/actions/account";
import { PasswordForm } from "@/components/auth/password-form";
import { placeShopOrderAction } from "@/lib/actions/orders";
import { isCompanyBuyer } from "@/lib/buyer";
import type { DemoRole } from "@/lib/demo-shops";
import { supplierTheme } from "@/lib/color";
import {
  addCartQuantity,
  confirmationPath,
  normalizeCartQuantity,
  ordersPath,
  productPath,
  storePath,
  subtractCartQuantity,
  unitLabel,
} from "@/lib/constants";
import { effectivePricePara, lineTotalPara, salePricePara } from "@/lib/data/pricing";
import type { Audience, BuyerAccount, BuyerOrder, OrderedQuantity, Product, PublicCatalog } from "@/lib/data/types";
import { belgradeMonthKey, currentBelgradeMonthKey, formatDateTime, formatQuantity, formatRsd, monthLabel } from "@/lib/format";
import { purchaseMonths, purchasesForMonth } from "@/lib/purchases";
import { fold } from "@/lib/text";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { useUnchangedForm } from "@/components/ui/use-unchanged-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldError, Input, Label, Textarea } from "@/components/ui/fields";

type Step = "browse" | "cart" | "checkout";

export function Shop({
  catalog,
  buyer: buyerFromServer,
  showAccount = true,
  orders = [],
  repeatOrderId,
  openAccount = false,
  demoRole = null,
}: {
  catalog: PublicCatalog;
  buyer?: BuyerAccount | null;
  showAccount?: boolean;
  orders?: BuyerOrder[];
  repeatOrderId?: string;
  openAccount?: boolean;
  demoRole?: DemoRole | null;
}) {
  const router = useRouter();
  const [savedBuyer, setSavedBuyer] = useState<BuyerAccount | null>(null);
  const buyer =
    buyerFromServer &&
    savedBuyer &&
    savedBuyer.userId === buyerFromServer.userId &&
    !sameBuyerProfile(buyerFromServer, savedBuyer)
      ? savedBuyer
      : buyerFromServer;
  const storageKey = `poruci-shop:${catalog.supplier.slug}`;
  const idempotencyStorage = `poruci-shop-idem:${catalog.supplier.slug}`;
  const [step, setStep] = useState<Step>("browse");
  const [pane, setPane] = useState<"catalog" | "account">(openAccount ? "account" : "catalog");
  const [categoryId, setCategoryId] = useState("all");
  const [query, setQuery] = useState("");
  const storedCart = useSyncExternalStore(subscribeCart, () => readCartRaw(storageKey), () => "{}");
  const quantities = useMemo(() => parseCart(storedCart), [storedCart]);

  const hasSales = catalog.products.some((product) => salePricePara(product));
  const needle = fold(query.trim());
  const products = catalog.products.filter((product) => {
    if (categoryId === "sale" && !salePricePara(product)) return false;
    if (categoryId !== "all" && categoryId !== "sale" && product.categoryId !== categoryId) return false;
    if (!needle) return true;
    return fold(product.name).includes(needle);
  });
  const lines = catalog.products
    .map((product) => ({
      product,
      quantity: normalizeCartQuantity(product.unit, quantities[product.id] ?? 0, product.minQuantity),
    }))
    .filter((line) => line.quantity > 0);
  const total = lines.reduce((sum, line) => sum + lineTotalPara(effectivePricePara(line.product), line.quantity), 0);
  const count = lines.length;
  const companyBuyer = buyer && isCompanyBuyer(buyer) ? buyer : null;
  const catalogHref = storePath(catalog.supplier.slug);

  function openCatalog(event: { preventDefault: () => void }) {
    if (!buyer) return;
    event.preventDefault();
    setStep("browse");
    setPane("catalog");
    setCategoryId("all");
    if (window.location.pathname === catalogHref && window.location.search) {
      router.replace(catalogHref);
    }
  }

  function setQuantity(product: Product, quantity: number) {
    const next = { ...quantities };
    const stored = quantity <= 0 ? 0 : normalizeCartQuantity(product.unit, quantity, product.minQuantity);
    if (stored <= 0) delete next[product.id];
    else next[product.id] = stored;
    localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event("poruci-cart"));
  }

  function add(product: Product) {
    const current = quantities[product.id] ?? 0;
    setQuantity(product, addCartQuantity(product.unit, current, product.minQuantity));
  }

  function writeCart(next: Record<string, number>) {
    localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event("poruci-cart"));
    setStep("cart");
  }

  function repeatOrder(items: BuyerOrder["items"]) {
    const next: Record<string, number> = {};
    for (const item of items) {
      if (!item.productId) continue;
      const product = catalog.products.find((entry) => entry.id === item.productId);
      if (!product) continue;
      next[product.id] = normalizeCartQuantity(
        product.unit,
        Math.max(product.minQuantity, item.quantity),
        product.minQuantity,
      );
    }
    writeCart(next);
  }

  function addOrderToCart(items: BuyerOrder["items"]) {
    const next = { ...quantities };
    for (const item of items) {
      if (!item.productId) continue;
      const product = catalog.products.find((entry) => entry.id === item.productId);
      if (!product) continue;
      const current = normalizeCartQuantity(product.unit, next[product.id] ?? 0, product.minQuantity);
      const quantity = normalizeCartQuantity(
        product.unit,
        Math.max(product.minQuantity, item.quantity),
        product.minQuantity,
      );
      next[product.id] =
        current === 0 ? quantity : Math.min(9999, Math.round((current + quantity) * 1000) / 1000);
    }
    writeCart(next);
  }

  useEffect(() => {
    if (!repeatOrderId) return;
    const order = orders.find((entry) => entry.id === repeatOrderId);
    if (!order) return;
    const key = `poruci-repeat:${repeatOrderId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    repeatOrder(order.items);
    // The repeat link should fill the cart once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeatOrderId]);

  return (
    <div className="min-h-dvh bg-background pb-24" style={supplierTheme(catalog.supplier.brandColor)}>
      <StoreHeader
        href={catalogHref}
        name={catalog.supplier.name}
        logoUrl={catalog.supplier.logoUrl}
        heading
        onNavigate={openCatalog}
        role={demoRole ? { slug: catalog.supplier.slug, active: demoRole } : null}
      >
        <StoreAccountLinks slug={catalog.supplier.slug} buyer={buyer} showAccount={showAccount} />
        <CartButton count={count} onClick={() => setStep(step === "browse" ? "cart" : "browse")} />
        {buyer ? (
          <BuyerMenu
            buyer={buyer}
            shopPath={catalogHref}
            ordersHref={ordersPath(catalog.supplier.slug)}
            onAccount={() => {
              setPane("account");
              setStep("browse");
            }}
          />
        ) : null}
      </StoreHeader>
      <ShopCover imageUrl={catalog.supplier.coverUrl} text={catalog.supplier.description} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {step === "browse" && pane === "account" && buyer ? (
          <div className="mb-6">
            <button
              type="button"
              className="mb-3 inline-flex min-h-11 cursor-pointer items-center py-2 text-base font-medium text-foreground underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground"
              onClick={() => setPane("catalog")}
            >
              Nazad na proizvode
            </button>
            <AccountPanel
              buyer={buyer}
              slug={catalog.supplier.slug}
              onSaved={setSavedBuyer}
            />
          </div>
        ) : null}
        {step === "browse" && pane === "catalog" ? (
          <>
            {companyBuyer ? <LastOrder order={latestOrder(orders)} onRepeat={addOrderToCart} /> : null}
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Kategorije">
                <CategoryButton active={categoryId === "all"} onClick={() => setCategoryId("all")}>
                  Sve
                </CategoryButton>
                {hasSales ? (
                  <CategoryButton active={categoryId === "sale"} onClick={() => setCategoryId("sale")}>
                    Akcija
                  </CategoryButton>
                ) : null}
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
              <div className="relative w-44 shrink-0 sm:w-56">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pretraži"
                  aria-label="Pretraži proizvode"
                  className="h-9 pl-9"
                />
              </div>
            </div>
            {products.length === 0 ? (
              <p className="mt-6 rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                {needle ? `Nema proizvoda za „${query.trim()}”.` : "Trenutno nema proizvoda."}
              </p>
            ) : (
              <section className="mt-4">
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} href={productPath(catalog.supplier.slug, product.id)} onAdd={() => add(product)} />
                  ))}
                </ul>
              </section>
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
            audience={catalog.supplier.audience}
            buyer={buyer}
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

function ShopCover({ imageUrl, text }: { imageUrl: string | null; text: string }) {
  if (!imageUrl && !text) return null;
  const contained = imageUrl?.endsWith(".svg") ?? false;
  return (
    <div className={`relative h-56 overflow-hidden sm:h-72 ${contained ? "bg-[#1c1917]" : "bg-zinc-900"}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className={contained ? "size-full object-contain p-8" : "size-full object-cover"}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/75 via-zinc-950/15 to-transparent" />
      {text ? (
        <p className="absolute bottom-5 left-0 right-0 mx-auto max-w-6xl px-4 text-sm text-white sm:px-6">{text}</p>
      ) : null}
    </div>
  );
}

function latestOrder(orders: BuyerOrder[]) {
  return orders.find((order) => order.status !== "otkazana") ?? orders[0] ?? null;
}

function orderLines(orders: BuyerOrder[]): OrderedQuantity[] {
  return orders.flatMap((order) =>
    order.items.map((item) => ({
      createdAt: order.createdAt,
      status: order.status,
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      imageUrl: item.imageUrl,
    })),
  );
}

export function CompanyOrders({
  orders,
  onRepeat,
  repeatBase,
}: {
  orders: BuyerOrder[];
  onRepeat?: (items: BuyerOrder["items"]) => void;
  repeatBase?: string;
}) {
  const active = orders.filter((order) => order.status !== "otkazana");
  const spent = active.reduce((sum, order) => sum + order.totalPara, 0);
  const month = currentBelgradeMonthKey();
  const thisMonth = active.filter((order) => belgradeMonthKey(order.createdAt) === month);
  const monthSpent = thisMonth.reduce((sum, order) => sum + order.totalPara, 0);
  const lines = orderLines(orders);
  const months = purchaseMonths(lines);
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? month);
  const bought = purchasesForMonth(lines, selectedMonth);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Porudžbine" value={String(active.length)} />
        <Stat label="Ukupno" value={formatRsd(spent)} />
        <Stat label="Ovog meseca" value={formatRsd(monthSpent)} hint={`${thisMonth.length} ${orderWord(thisMonth.length)}`} />
      </div>
      <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="mesec-naslov">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mesec-naslov" className="text-sm font-semibold">
            Naručeno po proizvodu
          </h2>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Mesec
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            >
              {months.map((key) => (
                <option key={key} value={key}>
                  {monthLabel(key)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {bought.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">U ovom mesecu nema porudžbina.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {bought.map((line) => (
              <li key={line.key} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <ProductImage src={line.imageUrl} alt="" className="size-14" />
                <p className="min-w-0 text-sm font-medium">
                  <span className="tabular-nums">{formatQuantity(line.quantity)}</span> {line.name}
                  {line.unit === "komad" ? null : (
                    <span className="font-normal text-muted-foreground"> · {unitLabel(line.unit)}</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <OrderList orders={orders} onRepeat={onRepeat} repeatBase={repeatBase} />
    </div>
  );
}

function orderWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "porudžbina";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "porudžbine";
  return "porudžbina";
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function LastOrder({
  order,
  onRepeat,
}: {
  order: BuyerOrder | null;
  onRepeat: (items: BuyerOrder["items"]) => void;
}) {
  if (!order) return null;
  const href = confirmationPath(order.supplierSlug, order.confirmationToken);
  const summary = (
    <>
      <h2 id="poslednja-naslov" className="text-base font-semibold">
        Poslednja porudžbina
        <span className="ml-3 inline-flex flex-wrap items-center gap-2 align-middle font-normal">
          <span className="font-medium text-foreground underline-offset-2 group-hover:underline">{order.number}</span>
          <StatusBadge status={order.status} />
          <span className="text-muted-foreground">· {formatRsd(order.totalPara)}</span>
        </span>
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {order.items.map((item) => `${formatQuantity(item.quantity)} ${item.name}`).join(" · ")}
      </p>
    </>
  );
  return (
    <section className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-border bg-card px-5 py-5" aria-labelledby="poslednja-naslov">
      {href ? (
        <Link href={href} className="group min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {summary}
        </Link>
      ) : (
        <div className="min-w-0 flex-1">{summary}</div>
      )}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => onRepeat(order.items)}>
          Naruči opet
        </Button>
        <Link href={ordersPath(order.supplierSlug)}>
          <Button type="button" size="sm" variant="secondary">
            Vidi sve porudžbine
          </Button>
        </Link>
      </div>
    </section>
  );
}

export function OrderList({
  orders,
  onRepeat,
  repeatBase,
}: {
  orders: BuyerOrder[];
  onRepeat?: (items: BuyerOrder["items"]) => void;
  repeatBase?: string;
}) {
  return (
    <section aria-labelledby="porudzbine-naslov">
      <h2 id="porudzbine-naslov" className="text-lg font-semibold">
        Porudžbine
      </h2>
      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Još nema porudžbina kod ove prodavnice.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
          {orders.map((order) => {
            const href = confirmationPath(order.supplierSlug, order.confirmationToken);
            const summary = (
              <>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="underline-offset-2 group-hover:underline">{order.number}</span>
                    <StatusBadge status={order.status} />
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                </div>
                <span className="text-sm font-medium tabular-nums">{formatRsd(order.totalPara)}</span>
              </>
            );
            return (
              <li key={order.id} className="flex flex-col sm:flex-row sm:items-stretch">
                {href ? (
                  <Link
                    href={href}
                    className="group flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                  >
                    {summary}
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    {summary}
                  </div>
                )}
                <div className="flex items-center px-4 pb-3 sm:py-3 sm:pl-0">
                  {repeatBase ? (
                    <Link href={`${repeatBase}?ponovi=${order.id}`} className="text-sm font-medium text-primary hover:underline">
                      Naruči isto
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="cursor-pointer text-sm font-medium text-primary hover:underline"
                      onClick={() => onRepeat?.(order.items)}
                    >
                      Naruči isto
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function sameBuyerProfile(left: BuyerAccount, right: BuyerAccount) {
  return (
    left.name === right.name &&
    left.businessName === right.businessName &&
    left.phone === right.phone &&
    left.address === right.address &&
    left.city === right.city &&
    left.pib === right.pib &&
    left.mb === right.mb &&
    left.postalCode === right.postalCode &&
    left.bankAccount === right.bankAccount &&
    left.confirmationEmail === right.confirmationEmail
  );
}

function AccountPanel({
  buyer,
  slug,
  onSaved,
}: {
  buyer: BuyerAccount;
  slug: string;
  onSaved: (buyer: BuyerAccount) => void;
}) {
  const router = useRouter();
  const company = isCompanyBuyer(buyer);
  const [notice, setNotice] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(updateBuyerAccountAction, {} as BuyerAccountState);
  const shown = state.buyer ?? buyer;
  const changes = useUnchangedForm();

  useEffect(() => {
    if (!state.ok || !state.buyer) return;
    onSaved(state.buyer);
    setNotice("Podaci su sačuvani.");
    setFormKey((key) => key + 1);
    router.refresh();
  }, [state.ok, state.buyer, onSaved, router]);

  return (
    <section aria-labelledby="moj-nalog-naslov">
      <h2 id="moj-nalog-naslov" className="text-lg font-semibold">
        Moj nalog
      </h2>
      {notice ? <p className="mt-3 text-sm text-emerald-700">{notice}</p> : null}
      <form
        key={formKey}
        ref={changes.ref}
        action={action}
        onInput={changes.onInput}
        onChange={changes.onChange}
        className="mt-4 max-w-xl space-y-4"
      >
        <input type="hidden" name="slug" value={slug} />
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {company ? (
          <Field
            name="businessName"
            label="Naziv firme"
            autoComplete="organization"
            defaultValue={shown.businessName}
            error={state.fieldErrors?.businessName}
            required={false}
          />
        ) : null}
        <Field
          name="name"
          label="Ime i prezime"
          autoComplete="name"
          defaultValue={shown.name}
          error={state.fieldErrors?.name}
          required={false}
        />
        <div>
          <p className="text-sm font-medium">Email</p>
          <p className="mt-1.5 text-sm">{shown.email}</p>
        </div>
        <Field
          name="confirmationEmail"
          label="Email za potvrde"
          type="email"
          autoComplete="email"
          defaultValue={shown.confirmationEmail}
          error={state.fieldErrors?.confirmationEmail}
          required={false}
          hint="Potvrde porudžbine stižu na ovu adresu. Može biti drugačija od emaila za prijavu. Ako je prazno, stižu na email za prijavu."
        />
        {company ? <Field name="mb" label="Matični broj" defaultValue={shown.mb} error={state.fieldErrors?.mb} required={false} /> : null}
        {company ? <Field name="pib" label="PIB" defaultValue={shown.pib} error={state.fieldErrors?.pib} required={false} /> : null}
        <Field
          name="phone"
          label="Telefon"
          autoComplete="tel"
          defaultValue={shown.phone}
          error={state.fieldErrors?.phone}
          required={false}
        />
        <Field
          name="address"
          label="Adresa"
          autoComplete="street-address"
          defaultValue={shown.address}
          error={state.fieldErrors?.address}
          required={false}
        />
        <Field
          name="city"
          label="Grad"
          autoComplete="address-level2"
          defaultValue={shown.city}
          error={state.fieldErrors?.city}
          required={false}
        />
        <Field
          name="postalCode"
          label="Poštanski broj"
          autoComplete="postal-code"
          defaultValue={shown.postalCode}
          error={state.fieldErrors?.postalCode}
          required={false}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={pending || changes.unchanged}>
            {pending ? "Čuvanje…" : "Sačuvaj"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setNotice("");
              setFormKey((key) => key + 1);
            }}
          >
            Otkaži
          </Button>
        </div>
      </form>
      <div className="mt-10 border-t border-border pt-8">
        <PasswordForm />
      </div>
    </section>
  );
}

export function Cart({
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
      <button type="button" className="inline-flex min-h-11 cursor-pointer items-center py-2 text-base font-medium text-foreground underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground" onClick={onBack}>
        Nazad na proizvode
      </button>
      <h2 className="mt-2 text-lg font-semibold">Korpa</h2>
      {lines.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Korpa je prazna.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
          {lines.map((line) => (
            <li key={line.product.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <ProductImage src={line.product.imageUrl} alt={line.product.name} className="size-12" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{line.product.name}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{formatRsd(effectivePricePara(line.product))}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-md border border-border"
                  aria-label={`Smanji ${line.product.name}`}
                  onClick={() =>
                    onChange(
                      line.product,
                      subtractCartQuantity(line.product.unit, line.quantity, line.product.minQuantity),
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
                    onChange(line.product, addCartQuantity(line.product.unit, line.quantity, line.product.minQuantity))
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

export function Checkout({
  slug,
  audience,
  buyer,
  lines,
  total,
  idempotencyStorage,
  onBack,
  onSuccess,
}: {
  slug: string;
  audience: Audience;
  buyer?: BuyerAccount | null;
  lines: { product: Product; quantity: number }[];
  total: number;
  idempotencyStorage: string;
  onBack: () => void;
  onSuccess: (token: string) => void;
}) {
  const detailsRef = useRef<HTMLFormElement>(null);
  const accountParty: BuyerKind | null = buyer ? (isCompanyBuyer(buyer) ? "pravna" : "fizicka") : null;
  const guestSwitch = showsGuestPartySwitch(audience, buyer);
  const [guestParty, setGuestParty] = useState<BuyerKind>("fizicka");
  const party = checkoutParty(audience, accountParty, guestParty);
  const [phase, setPhase] = useState<"details" | "payment">("details");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [notes, setNotes] = useState("");
  const [companyExtra, setCompanyExtra] = useState({ mb: "", postalCode: "" });
  const [paymentMethod, setPaymentMethod] = useState<"" | "pouzecem" | "ips">("");
  const [retail, setRetail] = useState({
    customerName: buyer?.name ?? "",
    email: buyer?.email ?? "",
    phone: buyer?.phone ?? "",
    address: buyer?.address ?? "",
    postalCode: buyer?.postalCode ?? "",
    city: buyer?.city ?? "",
  });
  const company = buyer && party === "pravna" && isCompanyBuyer(buyer) ? buyer : null;
  const [companyFields, setCompanyFields] = useState({
    businessName: company?.businessName ?? buyer?.businessName ?? "",
    pib: company?.pib ?? buyer?.pib ?? "",
    mb: company?.mb ?? buyer?.mb ?? "",
  });

  function chooseGuestParty(next: BuyerKind) {
    const form = detailsRef.current;
    if (form && guestParty === "pravna") {
      const data = new FormData(form);
      setCompanyFields({
        businessName: String(data.get("businessName") ?? ""),
        pib: String(data.get("pib") ?? ""),
        mb: String(data.get("mb") ?? ""),
      });
    }
    setGuestParty(next);
    setErrors({});
    setMessage("");
  }

  async function place(
    paymentMethod?: string,
    companyDraft?: { notes: string; mb: string; postalCode: string },
    retailDraft?: {
      customerName: string;
      email: string;
      phone: string;
      address: string;
      postalCode: string;
      city: string;
      notes: string;
      company: boolean;
      businessName: string;
      pib: string;
      mb: string;
    },
  ) {
    if (pending) return;
    setPending(true);
    setMessage("");
    const items = lines.map((line) => ({ productId: line.product.id, quantity: line.quantity }));
    const retailPayload = retailDraft ?? {
      customerName: retail.customerName,
      email: retail.email,
      phone: retail.phone,
      address: retail.address,
      postalCode: retail.postalCode,
      city: retail.city,
      notes,
      company: false,
      businessName: "",
      pib: "",
      mb: "",
    };
    const result = company
      ? await placeShopOrderAction({
          slug,
          idempotencyKey: readIdempotencyKey(idempotencyStorage),
          notes: companyDraft?.notes ?? notes,
          mb: company.mb || companyDraft?.mb || companyExtra.mb,
          postalCode: company.postalCode || companyDraft?.postalCode || companyExtra.postalCode,
          honeypot,
          items,
        })
      : await placeShopOrderAction({
          slug,
          idempotencyKey: readIdempotencyKey(idempotencyStorage),
          customerName: retailPayload.customerName,
          email: retailPayload.email,
          phone: retailPayload.phone,
          address: retailPayload.address,
          postalCode: retailPayload.postalCode,
          city: retailPayload.city,
          notes: retailPayload.notes,
          paymentMethod,
          company: retailPayload.company,
          businessName: retailPayload.company ? retailPayload.businessName : "",
          pib: retailPayload.company ? retailPayload.pib : "",
          mb: retailPayload.company ? retailPayload.mb : "",
          honeypot,
          items,
        });
    setPending(false);
    if (!result.ok || !result.token) {
      setMessage(result.message ?? "Kupovina nije poslata.");
      setErrors(result.fieldErrors ?? {});
      if (result.fieldErrors && !result.fieldErrors.paymentMethod) setPhase("details");
      return;
    }
    onSuccess(result.token);
  }

  if (audience === "pravna" && !company) {
    const back = storePath(slug);
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={onBack}>
          Nazad na korpu
        </button>
        <h2 className="text-lg font-semibold">Kasa</h2>
        <p className="text-sm text-muted-foreground">Firma mora da otvori nalog.</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/shop/${slug}/nalog`} className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
            Otvorite nalog
          </Link>
          <Link href={`/login?next=${encodeURIComponent(back)}`} className="inline-flex h-11 items-center rounded-md border border-border bg-card px-4 text-sm font-medium">
            Prijavite se
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "payment" && party === "fizicka") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!paymentMethod) {
            setErrors({ paymentMethod: "Izaberite način plaćanja." });
            return;
          }
          void place(paymentMethod);
        }}
        className="mx-auto max-w-xl space-y-4"
        noValidate
      >
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setPhase("details")}>
          Nazad na kasu
        </button>
        <h2 className="text-lg font-semibold">Način plaćanja</h2>
        <p className="text-sm text-muted-foreground">Ukupno {formatRsd(total)}.</p>
        {message ? <Alert message={message} /> : null}
        <PaymentMethodChoice value={paymentMethod} error={errors.paymentMethod} onChange={setPaymentMethod} />
        <Honeypot value={honeypot} onChange={setHoneypot} />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Slanje…" : "Potvrdi kupovinu"}
        </Button>
      </form>
    );
  }

  if (company) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const draft = {
            notes: String(form.get("notes") ?? ""),
            mb: String(form.get("mb") ?? ""),
            postalCode: String(form.get("postalCode") ?? ""),
          };
          setNotes(draft.notes);
          setCompanyExtra({ mb: draft.mb, postalCode: draft.postalCode });
          void place(undefined, draft);
        }}
        className="mx-auto max-w-xl space-y-4"
      >
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={onBack}>
          Nazad na korpu
        </button>
        <h2 className="text-lg font-semibold">Kasa</h2>
        <p className="text-sm text-muted-foreground">Ukupno {formatRsd(total)}.</p>
        {message ? <Alert message={message} /> : null}
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-medium">{company.businessName}</p>
          <p className="mt-1 text-muted-foreground">{company.name}</p>
          <p className="text-muted-foreground">{company.email}</p>
          {company.confirmationEmail.trim() ? (
            <p className="text-muted-foreground">Potvrda stiže na {company.confirmationEmail.trim()}</p>
          ) : null}
          <p className="text-muted-foreground">{company.phone}</p>
          {company.mb ? <p className="mt-2 text-muted-foreground">Matični broj {company.mb}</p> : null}
          <p className="text-muted-foreground">PIB {company.pib}</p>
          {company.address ? <p className="text-muted-foreground">{company.address}</p> : null}
          {company.city ? <p className="text-muted-foreground">{company.city}</p> : null}
          {company.postalCode ? <p className="text-muted-foreground">{company.postalCode}</p> : null}
        </div>
        {company.mb ? null : <Field name="mb" label="Matični broj" error={errors.mb} />}
        {company.postalCode ? null : (
          <Field name="postalCode" label="Poštanski broj" autoComplete="postal-code" error={errors.postalCode} />
        )}
        <div>
          <Label htmlFor="notes">Napomena</Label>
          <Textarea id="notes" name="notes" defaultValue={notes} className="mt-1.5" />
        </div>
        <Honeypot value={honeypot} onChange={setHoneypot} />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Slanje…" : "Potvrdi porudžbinu"}
        </Button>
      </form>
    );
  }

  const guestCompany = party === "pravna";

  return (
    <form
      ref={detailsRef}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const postalCode = String(form.get("postalCode") ?? "").trim();
        const nextErrors: Record<string, string> = {};
        if (!/^\d{5}$/.test(postalCode)) {
          nextErrors.postalCode = postalCode ? "Poštanski broj ima 5 cifara." : "Unesite poštanski broj.";
        }
        const businessName = String(form.get("businessName") ?? "").trim();
        const pib = String(form.get("pib") ?? "").replace(/\D/g, "");
        const mb = String(form.get("mb") ?? "").replace(/\D/g, "");
        if (guestCompany) {
          if (businessName.length < 2) nextErrors.businessName = "Unesite naziv firme.";
          if (!/^\d{9}$/.test(pib)) nextErrors.pib = pib ? "PIB ima 9 cifara." : "Unesite PIB.";
          if (!/^\d{8}$/.test(mb)) nextErrors.mb = mb ? "Matični broj ima 8 cifara." : "Unesite matični broj.";
        }
        if (Object.keys(nextErrors).length > 0) {
          setErrors(nextErrors);
          return;
        }
        setErrors({});
        const draft = {
          customerName: String(form.get("customerName") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          address: String(form.get("address") ?? ""),
          postalCode,
          city: String(form.get("city") ?? ""),
          notes: String(form.get("notes") ?? ""),
          company: guestCompany,
          businessName,
          pib,
          mb,
        };
        setRetail({
          customerName: draft.customerName,
          email: draft.email,
          phone: draft.phone,
          address: draft.address,
          postalCode: draft.postalCode,
          city: draft.city,
        });
        setNotes(draft.notes);
        if (guestCompany) {
          setCompanyFields({ businessName, pib, mb });
          void place("racun", undefined, draft);
          return;
        }
        setPhase("payment");
      }}
      className="mx-auto max-w-xl space-y-4"
    >
      <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={onBack}>
        Nazad na korpu
      </button>
      <h2 className="text-lg font-semibold">Kasa</h2>
      {message ? <Alert message={message} /> : null}
      {guestSwitch ? <BuyerKindChoice value={guestParty} error={errors.kind} onChange={chooseGuestParty} /> : null}
      {guestSwitch && guestCompany ? (
        <p className="text-sm text-muted-foreground">Račun ide na firmu. Potrebni su naziv, PIB i matični broj.</p>
      ) : null}
      {guestCompany ? (
        <>
          <Field name="businessName" label="Naziv firme" autoComplete="organization" error={errors.businessName} defaultValue={companyFields.businessName} />
          <Field name="pib" label="PIB" inputMode="numeric" error={errors.pib} defaultValue={companyFields.pib} hint="9 cifara." />
          <Field name="mb" label="Matični broj" inputMode="numeric" error={errors.mb} defaultValue={companyFields.mb} hint="8 cifara." />
        </>
      ) : null}
      <Field name="customerName" label="Ime i prezime" autoComplete="name" error={errors.customerName} defaultValue={retail.customerName} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} defaultValue={retail.email} />
      <Field name="phone" label="Telefon" autoComplete="tel" error={errors.phone} defaultValue={retail.phone} />
      <Field name="address" label="Adresa" autoComplete="street-address" error={errors.address} defaultValue={retail.address} />
      <Field name="city" label="Grad" autoComplete="address-level2" error={errors.city} defaultValue={retail.city} />
      <Field name="postalCode" label="Poštanski broj" autoComplete="postal-code" error={errors.postalCode} defaultValue={retail.postalCode} />
      <div>
        <Label htmlFor="notes">Napomena</Label>
        <Textarea id="notes" name="notes" defaultValue={notes} className="mt-1.5" />
      </div>
      <Honeypot value={honeypot} onChange={setHoneypot} />
      <Button type="submit" className="w-full" disabled={pending}>
        {guestCompany ? (pending ? "Slanje…" : "Potvrdi porudžbinu") : "Način plaćanja"}
      </Button>
    </form>
  );
}

function Alert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}

function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
      <label>
        Website
        <input tabIndex={-1} autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    </div>
  );
}

function Field({
  name,
  label,
  error,
  type = "text",
  autoComplete,
  defaultValue,
  required = true,
  hint,
  inputMode,
}: {
  name: string;
  label: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} inputMode={inputMode} autoComplete={autoComplete} defaultValue={defaultValue} required={required} className="mt-1.5 h-11" aria-invalid={Boolean(error)} />
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError message={error} />
    </div>
  );
}

function ProductCard({ product, href, onAdd }: { product: Product; href: string; onAdd: () => void }) {
  const sale = salePricePara(product);
  const photos = product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
      <div className="relative">
        <ProductPhotos photos={photos} name={product.name} href={href} />
        {sale ? (
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
            Akcija
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
      <h3 className="text-sm font-semibold">
        <Link href={href} className="hover:underline">{product.name}</Link>
      </h3>
      {product.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p> : null}
      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div>
          {sale ? <p className="text-xs text-muted-foreground line-through tabular-nums">{formatRsd(product.pricePara)}</p> : null}
          <p className="text-sm font-semibold tabular-nums">{formatRsd(sale ?? product.pricePara)}</p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="size-4" aria-hidden="true" />
          Dodaj
        </Button>
      </div>
      </div>
    </li>
  );
}

function ProductPhotos({ photos, name, href }: { photos: string[]; name: string; href: string }) {
  const [index, setIndex] = useState(0);
  const current = photos[index] ?? null;
  const many = photos.length > 1;
  function move(step: number) {
    setIndex((value) => (value + step + photos.length) % photos.length);
  }
  return (
    <div className="relative">
      <Link href={href} className="block">
        <ProductImage src={current} alt={name} className="aspect-[3/2] h-auto w-full rounded-none border-0" />
      </Link>
      {many ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm"
            aria-label="Prethodna slika"
            onClick={() => move(-1)}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm"
            aria-label="Sledeća slika"
            onClick={() => move(1)}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {photos.map((photo, photoIndex) => (
              <button
                key={photo}
                type="button"
                aria-label={`Slika ${photoIndex + 1}`}
                className={photoIndex === index ? "size-1.5 rounded-full bg-white" : "size-1.5 rounded-full bg-white/50"}
                onClick={() => setIndex(photoIndex)}
              />
            ))}
          </div>
        </>
      ) : null}
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
      className={`h-9 shrink-0 rounded-full px-3 text-sm ${active ? "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]" : "bg-card text-foreground ring-1 ring-border"}`}
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
