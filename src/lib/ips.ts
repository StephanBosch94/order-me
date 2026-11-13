/** Narodna banka Srbije IPS QR payload. Account check is ISO 7064 mod 97-10. */

const ACCOUNT_DIGITS = 18;

export function parseIpsAccount(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const tagged = /(?:^|\|)R:(\d{18})(?:\||$)/.exec(trimmed)?.[1];
  const digits = (tagged ?? trimmed).replace(/\D/g, "");
  if (!/^\d{18}$/.test(digits) || mod97(digits) !== 1) return null;
  return digits;
}

export function formatIpsAccount(account: string) {
  const digits = account.replace(/\D/g, "");
  if (digits.length !== ACCOUNT_DIGITS) return account.trim();
  return `${digits.slice(0, 3)}-${digits.slice(3, 16)}-${digits.slice(16)}`;
}

export function ipsPurpose(orderNumber: string) {
  return clip(`Porudžbina ${orderNumber}`, 35);
}

export function ipsPayload(input: { account: string; recipient: string; amountPara: number; orderNumber: string }) {
  const account = parseIpsAccount(input.account);
  if (!account) return null;
  const amount = ipsAmount(input.amountPara);
  if (!amount) return null;
  const recipient = clip(input.recipient, 70) || "Prodavac";
  const purpose = ipsPurpose(input.orderNumber);
  const reference = input.orderNumber.replace(/\D/g, "").slice(0, 23);
  const parts = ["K:PR", "V:01", "C:1", `R:${account}`, `N:${recipient}`, `I:${amount}`, "SF:221", `S:${purpose}`];
  if (reference) parts.push(`RO:00${reference}`);
  return parts.join("|");
}

function ipsAmount(para: number) {
  if (!Number.isInteger(para) || para < 0 || para > 9_999_999_999_999) return null;
  const dinars = Math.floor(para / 100);
  const cents = String(para % 100).padStart(2, "0");
  return `RSD${dinars},${cents}`;
}

function clip(value: string, max: number) {
  return value.replace(/[|\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function mod97(digits: string) {
  let remainder = 0;
  for (const char of digits) remainder = (remainder * 10 + Number(char)) % 97;
  return remainder;
}
