import type { Metadata } from "next";

import { EmployeeAdd } from "@/components/admin/employee-form";
import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import { isShopManager, memberRoleLabel } from "@/lib/members";

export const metadata: Metadata = { title: "Zaposleni" };

export default async function EmployeesPage() {
  const session = await requireSession();
  const members = await getCommerce().listMembers(session.organization.id);

  return (
    <div>
      <EmployeeAdd canAdd={isShopManager(session.role)} />
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Ime</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Uloga</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{member.name}</td>
                <td className="px-4 py-3">{member.email}</td>
                <td className="px-4 py-3">{memberRoleLabel(member.role)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
