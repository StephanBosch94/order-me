import { cookies } from "next/headers";

import { AdminShell } from "@/components/admin/shell";
import { requireSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { getCommerce } from "@/lib/data";
import { demoShopRole } from "@/lib/demo-shops";
import { isSetupGuideClosed, SETUP_GUIDE_COOKIE, storeSetup } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const products = await getCommerce().listProducts(session.organization.id);
  const setup = storeSetup(
    session.organization,
    products.filter((product) => product.active).length,
  );
  const closed = isSetupGuideClosed((await cookies()).get(SETUP_GUIDE_COOKIE)?.value, session.organization.id);
  return (
    <AdminShell
      session={{ ...session, organization: { ...session.organization, efakturaApiKey: "" } }}
      demoShop={isDemoMode() && demoShopRole(session.organization.slug) ? session.organization.slug : null}
      setup={setup}
      guideClosed={closed}
    >
      {children}
    </AdminShell>
  );
}
