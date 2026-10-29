import Link from "next/link";

import { SignupForm } from "@/components/auth/auth-forms";
import { SupplierLogo } from "@/components/brand/supplier-logo";
import { businessPath, storePath } from "@/lib/constants";
import type { PublicCatalog } from "@/lib/data/types";

export function CustomerSignup({ catalog, business = false }: { catalog: PublicCatalog; business?: boolean }) {
  const back = business ? businessPath(catalog.supplier.slug) : storePath(catalog.supplier.slug);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-12">
      <Link href={back} className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Nazad u prodavnicu
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <SupplierLogo name={catalog.supplier.name} logoUrl={catalog.supplier.logoUrl} />
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{business ? "Pravno lice" : "Fizičko lice"}</p>
          <p className="truncate text-base font-semibold">{catalog.supplier.name}</p>
        </div>
      </div>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Otvorite nalog</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Nalog kod {catalog.supplier.name}. Porudžbine ostaju na vašem nalogu.
      </p>
      <div className="mt-6">
        <SignupForm mode={business ? "buyer" : "buyer-shop"} nextPath={back} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Već imate nalog?{" "}
        <Link href={`/login?next=${encodeURIComponent(back)}`} className="font-medium text-foreground underline-offset-2 hover:underline">
          Prijavite se
        </Link>
      </p>
    </main>
  );
}
