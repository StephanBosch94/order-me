import Link from "next/link";

import { AuthShell } from "@/app/login/page";
import { SignupForm } from "@/components/auth/auth-forms";
import { ProductionAccounts } from "@/components/auth/production-accounts";
import { listProductionLoginChoices } from "@/lib/actions/production-login";
import { storePath } from "@/lib/constants";
import type { PublicCatalog } from "@/lib/data/types";

export async function CustomerSignup({ catalog }: { catalog: PublicCatalog }) {
  const back = storePath(catalog.supplier.slug);
  const accounts = await listProductionLoginChoices();

  return (
    <AuthShell
      title="Otvorite nalog"
      subtitle={`Nalog kupca kod ${catalog.supplier.name}.`}
      store={{
        name: catalog.supplier.name,
        logoUrl: catalog.supplier.logoUrl,
        brandColor: catalog.supplier.brandColor,
        href: back,
      }}
    >
      <ProductionAccounts accounts={accounts} nextPath={back} />
      <div className="mt-6">
        <SignupForm mode="buyer" nextPath={back} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Već imate nalog?{" "}
        <Link href={`/login?next=${encodeURIComponent(back)}`} className="font-medium text-foreground underline-offset-2 hover:underline">
          Prijavite se
        </Link>
      </p>
    </AuthShell>
  );
}
