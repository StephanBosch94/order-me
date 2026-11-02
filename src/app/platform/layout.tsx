import { PlatformShell } from "@/components/platform/shell";
import { requirePlatformSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformSession();
  return (
    <PlatformShell session={session}>
      {children}
    </PlatformShell>
  );
}
