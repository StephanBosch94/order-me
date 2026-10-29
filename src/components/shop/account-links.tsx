import Link from "next/link";

import { businessPath, DEMO_SLUGS, storePath } from "@/lib/constants";
import type { BuyerAccount } from "@/lib/data/types";

export function StoreAccountLinks({
  slug,
  buyer,
  showAccount = true,
  business = false,
}: {
  slug: string;
  buyer?: BuyerAccount | null;
  showAccount?: boolean;
  business?: boolean;
}) {
  if (buyer) {
    return (
      <Link href="/kupac" className="text-sm font-medium underline-offset-2 hover:underline">
        Moj nalog
      </Link>
    );
  }
  if (!showAccount) return null;

  const back = business ? businessPath(slug) : storePath(slug);
  const register = business ? `/shop/${slug}/nalog?za=firme` : `/shop/${slug}/nalog`;
  if (!DEMO_SLUGS.has(slug)) {
    return (
      <Link href={register} className="text-sm font-medium underline-offset-2 hover:underline">
        Otvorite nalog
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-3 text-sm font-medium">
      <Link href={`/login?next=${encodeURIComponent(back)}`} className="underline-offset-2 hover:underline">
        Prijava
      </Link>
      <Link href={register} className="underline-offset-2 hover:underline">
        Registracija
      </Link>
    </span>
  );
}
