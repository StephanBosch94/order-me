import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getEmailFrom } from "@/lib/config";
import type { EmailDelivery } from "@/lib/data/types";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendEmail(message: EmailMessage): Promise<EmailDelivery> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    await writeOutbox(message);
    return "outbox";
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFrom(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      await writeOutbox({ ...message, subject: `[neuspelo] ${message.subject}`, text: `${message.text}\n\n${body}` });
      return "failed";
    }
    return "sent";
  } catch (error) {
    await writeOutbox({
      ...message,
      subject: `[neuspelo] ${message.subject}`,
      text: `${message.text}\n\n${error instanceof Error ? error.message : "Email nije poslat."}`,
    });
    return "failed";
  }
}

async function writeOutbox(message: EmailMessage) {
  const dir = path.join(process.cwd(), ".data", "outbox");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  await writeFile(file, JSON.stringify(message, null, 2));
}
