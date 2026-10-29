import Link from "next/link";

import { AuthShell } from "@/app/login/page";
import { SignupForm } from "@/components/auth/auth-forms";
import { storePath } from "@/lib/constants";
import type { PublicCatalog } from "@/lib/data/types";

export function CustomerSignup({ catalog }: { catalog: PublicCatalog }) {
  const back = storePath(catalog.supplier.slug);

  return (
    <AuthShell
      title="Otvorite nalog"
      subtitle={`Nalog firme kod ${catalog.supplier.name}. Ovde ostaju porudžbine, statistika i ponovna porudžbina.`}
      store={{
        name: catalog.supplier.name,
        logoUrl: catalog.supplier.logoUrl,
        href: back,
      }}
    >
      <SignupForm mode="buyer" nextPath={back} />
      <p className="mt-6 text-sm text-muted-foreground">
        Već imate nalog?{" "}
        <Link href={`/login?next=${encodeURIComponent(back)}`} className="font-medium text-foreground underline-offset-2 hover:underline">
          Prijavite se
        </Link>
      </p>
    </AuthShell>
  );
}
