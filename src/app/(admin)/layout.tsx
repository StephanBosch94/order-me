import { AdminShell } from "@/components/admin/shell";
import { requireSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <AdminShell session={session} demo={isDemoMode()}>
      {children}
    </AdminShell>
  );
}
