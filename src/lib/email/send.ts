import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getEmailFrom, getLocalDataDir, isEphemeralRuntime } from "@/lib/config";
import type { EmailDelivery } from "@/lib/data/types";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendEmail(message: EmailMessage): Promise<EmailDelivery> {
  return (await deliverEmail(message)).delivery;
}

export async function deliverEmail(message: EmailMessage): Promise<{ delivery: EmailDelivery; reason: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    await writeOutbox(message);
    return { delivery: "outbox", reason: "" };
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
      const reason = providerMessage(body);
      console.error("[email]", response.status, reason);
      await writeOutbox({ ...message, subject: `[neuspelo] ${message.subject}`, text: `${message.text}\n\n${body}` });
      return { delivery: "failed", reason };
    }
    return { delivery: "sent", reason: "" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Email nije poslat.";
    console.error("[email]", reason);
    await writeOutbox({
      ...message,
      subject: `[neuspelo] ${message.subject}`,
      text: `${message.text}\n\n${reason}`,
    });
    return { delivery: "failed", reason };
  }
}

function providerMessage(body: string) {
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    const message = typeof parsed.message === "string" ? parsed.message : "";
    return message.replace(/\s+/g, " ").slice(0, 180);
  } catch {
    return "";
  }
}

async function writeOutbox(message: EmailMessage) {
  if (isEphemeralRuntime()) return;
  const dir = path.join(getLocalDataDir(), "outbox");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  await writeFile(file, JSON.stringify(message, null, 2));
}
