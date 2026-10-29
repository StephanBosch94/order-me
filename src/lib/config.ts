export type DataMode = "supabase" | "demo";

export function getDataMode(): DataMode {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const any = Boolean(url || anon || service);
  const all = Boolean(url && anon && service);

  if (any && !all) {
    throw new Error(
      "Supabase konfiguracija je nepotpuna. Postavite NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY i SUPABASE_SERVICE_ROLE_KEY, ili uklonite sve tri da biste koristili lokalni demo režim.",
    );
  }

  return all ? "supabase" : "demo";
}

export function isDemoMode() {
  return getDataMode() === "demo";
}

export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const deployed = process.env.URL?.trim();
  if (deployed) return deployed.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function getLocalDataDir() {
  if (process.env.NETLIFY === "true" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return "/tmp/poruci";
  }
  return `${process.cwd()}/.data`;
}

export function getEmailFrom() {
  return process.env.EMAIL_FROM?.trim() || "Prodora <porudzbine@localhost>";
}
