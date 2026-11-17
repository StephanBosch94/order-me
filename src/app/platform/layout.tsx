import type { Metadata } from "next";

import { PlatformShell } from "@/components/platform/shell";
import { currentSupportShop, requirePlatformSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformSession();
  const supportShop = await currentSupportShop();
  return (
    <PlatformShell session={session} supportShop={supportShop}>
      {children}
    </PlatformShell>
  );
}
