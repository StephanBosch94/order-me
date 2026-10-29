import Link from "next/link";

import { AuthShell } from "@/app/login/page";
import { SignupForm } from "@/components/auth/auth-forms";
import { businessPath, storePath } from "@/lib/constants";
import type { PublicCatalog } from "@/lib/data/types";

export function CustomerSignup({ catalog, business = false }: { catalog: PublicCatalog; business?: boolean }) {
  const back = business ? businessPath(catalog.supplier.slug) : storePath(catalog.supplier.slug);

  return (
    <AuthShell
      title="Otvorite nalog"
      subtitle={`Nalog kod ${catalog.supplier.name}. Porudžbine ostaju na vašem nalogu.`}
      store={{
        name: catalog.supplier.name,
        logoUrl: catalog.supplier.logoUrl,
        href: back,
        caption: business ? "Pravno lice" : "Fizičko lice",
      }}
    >
      <SignupForm mode={business ? "buyer" : "buyer-shop"} nextPath={back} />
      <p className="mt-6 text-sm text-muted-foreground">
        Već imate nalog?{" "}
        <Link href={`/login?next=${encodeURIComponent(back)}`} className="font-medium text-foreground underline-offset-2 hover:underline">
          Prijavite se
        </Link>
      </p>
    </AuthShell>
  );
}
