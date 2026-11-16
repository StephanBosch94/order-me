import "server-only";

import { getAppUrl } from "@/lib/config";
import type { EmailDelivery } from "@/lib/data/types";
import { sendEmail } from "@/lib/email/send";
import { signupConfirmationEmail, vendroLogoUrl } from "@/lib/email/template";

export async function deliverSignupConfirmationEmail(input: {
  to: string;
  name: string;
  confirmUrl: string;
}): Promise<EmailDelivery> {
  const appUrl = getAppUrl();
  const logoUrl = vendroLogoUrl(appUrl);
  if (!logoUrl || !input.confirmUrl.startsWith("http")) return "failed";
  const message = signupConfirmationEmail({
    name: input.name,
    confirmUrl: input.confirmUrl,
    logoUrl,
    appUrl,
  });
  return sendEmail({
    to: input.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
