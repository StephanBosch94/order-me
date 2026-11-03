import Link from "next/link";

import { storePath } from "@/lib/constants";
import type { BuyerAccount } from "@/lib/data/types";

export function StoreAccountLinks({
  slug,
  buyer,
  showAccount = true,
}: {
  slug: string;
  buyer?: BuyerAccount | null;
  showAccount?: boolean;
}) {
  if (buyer || !showAccount) return null;

  const back = storePath(slug);
  return (
    <span className="flex items-center gap-3 text-sm font-medium">
      <Link href={`/login?next=${encodeURIComponent(back)}`} className="underline-offset-2 hover:underline">
        Prijava
      </Link>
      <Link href={`/shop/${slug}/nalog`} className="underline-offset-2 hover:underline">
        Registracija
      </Link>
    </span>
  );
}
