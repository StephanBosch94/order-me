import "server-only";

import { getAppUrl } from "@/lib/config";
import type { EmailDelivery } from "@/lib/data/types";
import { accountMailRecipient } from "@/lib/demo-shops";
import { sendEmail } from "@/lib/email/send";
import { staffInviteEmail, vendroLogoUrl } from "@/lib/email/template";

export async function deliverStaffInvite(input: {
  to: string;
  name: string;
  shopName: string;
  roleLabel: string;
  inviteUrl: string;
}): Promise<EmailDelivery> {
  const appUrl = getAppUrl();
  const logoUrl = vendroLogoUrl(appUrl);
  if (!logoUrl || !input.inviteUrl.startsWith("http")) return "failed";
  const message = staffInviteEmail({
    name: input.name.trim(),
    shopName: input.shopName,
    roleLabel: input.roleLabel,
    inviteUrl: input.inviteUrl,
    logoUrl,
    appUrl,
  });
  return sendEmail({
    to: accountMailRecipient(input.to),
    subject: message.subject,
    text: message.text,
    html: message.html,
  }).catch(() => "failed" as const);
}
