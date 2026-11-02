export type EfakturaEnvironment = "demo" | "produkcija";

/** Hosts from the Ministry API connection guide. Demo is the default. */
export const SEF_HOSTS: Record<EfakturaEnvironment, string> = {
  demo: "https://demoefaktura.mfin.gov.rs",
  produkcija: "https://efaktura.mfin.gov.rs",
};

export type SefPostResult =
  | { ok: true; invoiceId: string }
  | { ok: false; message: string };

export function salesInvoiceUrl(environment: EfakturaEnvironment, requestId: string) {
  const host = SEF_HOSTS[environment] ?? SEF_HOSTS.demo;
  const url = new URL("/api/publicApi/sales-invoice/ubl", host);
  url.searchParams.set("requestId", requestId);
  url.searchParams.set("sendToCir", "No");
  return url;
}

function readId(record: Record<string, unknown>) {
  const value = record.SalesInvoiceId ?? record.salesInvoiceId ?? record.InvoiceId ?? record.invoiceId;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function failureMessage(status: number, body: string, apiKey: string) {
  const redacted = apiKey ? body.split(apiKey).join("") : body;
  let detail = "";
  try {
    const parsed = JSON.parse(redacted) as Record<string, unknown>;
    const raw = parsed.ErrorCode ?? parsed.errorCode ?? parsed.Message ?? parsed.message ?? parsed.title;
    if (typeof raw === "string") detail = raw.split(apiKey).join("").trim().slice(0, 180);
  } catch {
    const plain = redacted.replace(/\s+/g, " ").trim();
    if (plain && plain.length <= 180 && !plain.startsWith("<")) detail = plain.split(apiKey).join("");
  }
  return detail
    ? `Sistem elektronskih faktura je odbio fakturu (${status}). ${detail}`
    : `Sistem elektronskih faktura je odbio fakturu (${status}).`;
}

export async function postSalesInvoice(input: {
  environment: EfakturaEnvironment;
  apiKey: string;
  xml: string;
  requestId: string;
  fetchImpl?: typeof fetch;
}): Promise<SefPostResult> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    return { ok: false, message: "API ključ za e-fakturu nije unet u Podešavanjima." };
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(salesInvoiceUrl(input.environment, input.requestId), {
      method: "POST",
      headers: {
        ApiKey: apiKey,
        "Content-Type": "application/xml",
        Accept: "application/json, text/plain",
      },
      body: input.xml,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, message: "Sistem elektronskih faktura trenutno nije dostupan. Pokušajte ponovo." };
  }

  const body = await response.text();
  if (!response.ok) return { ok: false, message: failureMessage(response.status, body, apiKey) };

  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const invoiceId = readId(parsed);
    if (!invoiceId) {
      return { ok: false, message: "Sistem elektronskih faktura nije vratio identifikator fakture." };
    }
    return { ok: true, invoiceId };
  } catch {
    return { ok: false, message: "Sistem elektronskih faktura nije vratio identifikator fakture." };
  }
}
