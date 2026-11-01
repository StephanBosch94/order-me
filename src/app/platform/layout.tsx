import { PlatformShell } from "@/components/platform/shell";
import { requirePlatformSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformSession();
  return (
    <PlatformShell session={session} demo={isDemoMode()}>
      {children}
    </PlatformShell>
  );
}
