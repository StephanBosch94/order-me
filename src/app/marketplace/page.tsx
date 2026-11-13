import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { SupplierLogo } from "@/components/brand/supplier-logo";
import { storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import { showMarketplace } from "@/lib/marketing";
import { isTrade, tradeLabel, TRADES } from "@/lib/trades";

export function generateMetadata(): Metadata {
  if (!showMarketplace) return { title: "Stranica nije pronađena" };
  return {
    title: "Marketplace",
    description: "Prodavnice koje su otvorile nalog na Prodori.",
  };
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ delatnost?: string }>;
}) {
  if (!showMarketplace) notFound();
  const { delatnost = "" } = await searchParams;
  const selected = isTrade(delatnost) ? delatnost : "";
  const stores = (await getCommerce().listMarketplaceStores()).filter((store) => !selected || store.trade === selected);

  return (
    <div className="min-h-dvh bg-white text-[#0a2540]">
      <header className="sticky top-0 z-20 border-b border-[#e6ebf1] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Vendro, početna" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#635bff]">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="inline-flex h-10 items-center px-3 text-sm font-medium text-[#0a2540] hover:text-[#635bff]">
              Prijava
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#635bff] px-3.5 text-sm font-medium text-white shadow-[0_4px_12px_rgba(99,91,255,0.28)] hover:bg-[#4f46e5]"
            >
              Otvorite nalog
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-medium text-[#635bff]">Marketplace</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-balance">Prodavnice koje su otvorile nalog</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#425466]">
          Izaberite prodavca i poručite na njegovoj stranici. Ovde su samo prodavnice koje primaju porudžbine.
        </p>
        <nav aria-label="Delatnost" className="mt-8 flex flex-wrap gap-2">
          <FilterChip href="/marketplace" selected={selected === ""}>
            Sve
          </FilterChip>
          {TRADES.map((trade) => (
            <FilterChip key={trade.id} href={`/marketplace?delatnost=${trade.id}`} selected={selected === trade.id}>
              {trade.label}
            </FilterChip>
          ))}
        </nav>
        {stores.length === 0 ? (
          <p className="mt-12 rounded-2xl border border-[#e6ebf1] bg-[#f6f9fc] px-6 py-10 text-sm text-[#425466]">
            {selected ? "Nema prodavnica u ovoj delatnosti." : "Još nijedna javna prodavnica nije otvorena."}
          </p>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <li key={store.id}>
                <Link
                  href={storePath(store.slug)}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e6ebf1] bg-white transition-shadow hover:shadow-[0_18px_40px_rgba(50,50,93,0.12)]"
                >
                  <span className="relative block h-40 overflow-hidden" style={{ background: store.brandColor || "#e6ebf1" }}>
                    {store.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.coverUrl} alt="" className="size-full object-cover" />
                    ) : null}
                  </span>
                  <span className="flex flex-1 gap-3 p-4">
                    <SupplierLogo name={store.name} logoUrl={store.logoUrl} className="size-12" />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold">{store.name}</span>
                      {store.trade ? <span className="mt-0.5 block text-sm font-medium text-[#635bff]">{tradeLabel(store.trade)}</span> : null}
                      {store.city ? <span className="mt-0.5 block text-sm text-[#425466]">{store.city}</span> : null}
                      {store.description ? (
                        <span className="mt-2 line-clamp-3 block text-sm leading-6 text-[#425466]">{store.description}</span>
                      ) : null}
                      <span className="mt-3 block text-sm font-medium text-[#635bff]">{productLabel(store.productCount)}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function FilterChip({ href, selected, children }: { href: string; selected: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={
        selected
          ? "inline-flex h-9 items-center rounded-full bg-[#635bff] px-3.5 text-sm font-medium text-white"
          : "inline-flex h-9 items-center rounded-full border border-[#cdd5e0] bg-white px-3.5 text-sm font-medium text-[#0a2540] hover:bg-[#f6f9fc]"
      }
    >
      {children}
    </Link>
  );
}

function productLabel(count: number) {
  if (count === 1) return "1 proizvod";
  return `${count} proizvoda`;
}
