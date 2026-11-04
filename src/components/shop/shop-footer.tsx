import Link from "next/link";

import { SupplierLogo } from "@/components/brand/supplier-logo";
import { ordersPath, storePath } from "@/lib/constants";
import { salePricePara } from "@/lib/data/pricing";
import type { PublicCatalog } from "@/lib/data/types";

const linkClass = "underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-current";

export function ShopFooter({
  catalog,
  kind,
}: {
  catalog: PublicCatalog;
  kind: "guest" | "buyer" | "staff";
}) {
  const supplier = catalog.supplier;
  const shop = storePath(supplier.slug);
  const orders = ordersPath(supplier.slug);
  const sales = catalog.products.some((product) => salePricePara(product));
  const categories = [...catalog.categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "sr"));
  const phone = supplier.phone.trim();
  const email = supplier.email.trim();
  const address = [supplier.address.trim(), supplier.city.trim()].filter(Boolean).join(", ");
  const pib = supplier.pib.replace(/\D/g, "");
  const mb = supplier.mb.replace(/\D/g, "");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-white text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Link href={shop} className="flex w-fit items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-current">
              <SupplierLogo name={supplier.name} logoUrl={supplier.logoUrl} className="size-12 border-0" />
              <p className="text-lg font-semibold">{supplier.name}</p>
            </Link>
            <address className="mt-4 space-y-2 text-sm not-italic leading-6">
              {address ? <p>{address}</p> : null}
              {phone ? (
                <p>
                  <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={linkClass}>
                    {phone}
                  </a>
                </p>
              ) : null}
              {email ? (
                <p>
                  <a href={`mailto:${email}`} className={linkClass}>
                    {email}
                  </a>
                </p>
              ) : null}
              {pib ? <p>PIB {pib}</p> : null}
              {mb ? <p>Matični broj {mb}</p> : null}
            </address>
          </div>
          <nav aria-label="Prodavnica">
            <p className="text-sm font-semibold">Prodavnica</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href={shop} className={linkClass}>
                  Svi proizvodi
                </Link>
              </li>
              {sales ? (
                <li>
                  <Link href={`${shop}?kategorija=akcija`} className={linkClass}>
                    Akcija
                  </Link>
                </li>
              ) : null}
              {categories.map((category) => (
                <li key={category.id}>
                  <Link href={`${shop}?kategorija=${encodeURIComponent(category.id)}`} className={linkClass}>
                    {category.name}
                  </Link>
                </li>
              ))}
              {kind === "buyer" ? (
                <>
                  <li>
                    <Link href={orders} className={linkClass}>
                      Porudžbine
                    </Link>
                  </li>
                  <li>
                    <Link href={`${shop}?nalog=1`} className={linkClass}>
                      Moj nalog
                    </Link>
                  </li>
                </>
              ) : null}
              {kind === "guest" ? (
                <>
                  <li>
                    <Link href={`/login?next=${encodeURIComponent(orders)}`} className={linkClass}>
                      Porudžbine
                    </Link>
                  </li>
                  <li>
                    <Link href={`/login?next=${encodeURIComponent(shop)}`} className={linkClass}>
                      Prijava
                    </Link>
                  </li>
                  <li>
                    <Link href={`${shop}/nalog`} className={linkClass}>
                      Registracija
                    </Link>
                  </li>
                </>
              ) : null}
              {kind === "staff" ? (
                <li>
                  <Link href="/orders" className={linkClass}>
                    Porudžbine
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
        <p className="mt-20 text-center text-sm text-muted-foreground">© {year} {supplier.name}</p>
      </div>
    </footer>
  );
}
