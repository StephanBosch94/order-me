"use server";

import { redirect } from "next/navigation";

import { buyerDestination, clearDemoSession, landingPath, setDemoSession } from "@/lib/auth";
import { RESERVED_SLUGS } from "@/lib/constants";
import { getDataMode } from "@/lib/config";
import { getCommerce, getDemoIdentity } from "@/lib/data";
import { DataError } from "@/lib/errors";
import { safeNextPath, slugCandidate } from "@/lib/text";
import { normalizeMb, normalizePostalCode } from "@/lib/buyer";
import { signDemoSession } from "@/lib/session-token";
import { fieldErrors, loginSchema, signupSchema } from "@/lib/validators";

export type AuthState = {
  error: string;
  fieldErrors?: Record<string, string>;
};

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: "Proverite email i lozinku.", fieldErrors: fieldErrors(parsed.error) };
  }

  const nextPath = safeNextPath(parsed.data.next);

  if (getDataMode() === "demo") {
    const user = await getDemoIdentity().verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) return { error: "Prijava nije uspela. Proverite email i lozinku." };
    const account = await getDemoIdentity().resolveAccount(user.id);
    if (!account) return { error: "Nalog nije završen. Završite registraciju." };
    await setDemoSession(signDemoSession(user.id));
    redirect(await landingPath(account, nextPath));
  }

  const { createSupabaseServer } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: "Prijava nije uspela. Proverite email i lozinku." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Prijava nije uspela." };
  const account = await getCommerce().resolveAccount(data.user.id);
  if (!account) return { error: "Nalog nije završen. Završite registraciju." };
  redirect(await landingPath(account, nextPath));
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const kind = formData.get("kind") === "buyer" ? "buyer" : "supplier";
  const person = formData.get("profile") === "osoba";
  const rawNext = formData.get("next");
  const requestedNext = safeNextPath(typeof rawNext === "string" ? rawNext : undefined);
  const parsed = signupSchema.safeParse(
    kind === "buyer"
      ? {
          kind,
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          businessName: person ? formData.get("name") : formData.get("businessName"),
          phone: formData.get("phone") ?? "",
          address: formData.get("address") ?? "",
          city: formData.get("city") ?? "",
          pib: formData.get("pib") ?? "",
          mb: formData.get("mb") ?? "",
          postalCode: formData.get("postalCode") ?? "",
          confirmationEmail: formData.get("confirmationEmail") ?? "",
        }
      : {
          kind,
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          audience: formData.get("audience"),
          organizationName: formData.get("organizationName"),
          phone: formData.get("phone") ?? "",
        },
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    const slug = parsed.data.kind === "supplier" ? await freeSlug(parsed.data.organizationName) : "";
    if (getDataMode() === "demo") {
      if (await getDemoIdentity().emailExists(parsed.data.email)) {
        return { error: "Nalog sa ovom email adresom već postoji.", fieldErrors: { email: "Email je zauzet." } };
      }
      const user = await getDemoIdentity().createUser({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        kind: parsed.data.kind,
        businessName: parsed.data.kind === "buyer" ? parsed.data.businessName : "",
        phone: parsed.data.phone,
        address: parsed.data.kind === "buyer" ? parsed.data.address : "",
        city: parsed.data.kind === "buyer" ? parsed.data.city : "",
        pib: parsed.data.kind === "buyer" ? parsed.data.pib : "",
        mb: parsed.data.kind === "buyer" ? normalizeMb(parsed.data.mb) ?? "" : "",
        postalCode: parsed.data.kind === "buyer" ? normalizePostalCode(parsed.data.postalCode) ?? "" : "",
        bankAccount: "",
        confirmationEmail: parsed.data.kind === "buyer" ? parsed.data.confirmationEmail : "",
      });
      if (parsed.data.kind === "supplier") {
        await getCommerce().createOrganization({
          userId: user.id,
          userName: parsed.data.name,
          userEmail: user.email,
          name: parsed.data.organizationName,
          slug,
          phone: parsed.data.phone,
          audience: parsed.data.audience,
        });
      }
      await setDemoSession(signDemoSession(user.id));
      redirect(parsed.data.kind === "buyer" ? await buyerDestination(requestedNext, user.id) : "/dashboard");
    }

    const { createSupabaseServer } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServer();
    const created = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { name: parsed.data.name } },
    });
    if (created.error || !created.data.user) {
      return { error: created.error?.message ?? "Registracija nije uspela." };
    }
    if (parsed.data.kind === "buyer") {
      await getCommerce().createBuyerProfile({
        userId: created.data.user.id,
        name: parsed.data.name,
        email: parsed.data.email,
        businessName: parsed.data.businessName,
        phone: parsed.data.phone,
        address: parsed.data.address,
        city: parsed.data.city,
        pib: parsed.data.pib,
        mb: normalizeMb(parsed.data.mb) ?? "",
        postalCode: normalizePostalCode(parsed.data.postalCode) ?? "",
        bankAccount: "",
        confirmationEmail: parsed.data.confirmationEmail,
      });
    } else {
      await getCommerce().createOrganization({
        userId: created.data.user.id,
        userName: parsed.data.name,
        userEmail: parsed.data.email,
        name: parsed.data.organizationName,
        slug,
        phone: parsed.data.phone,
        audience: parsed.data.audience,
      });
    }
    if (!created.data.session) {
      const signedIn = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signedIn.error) {
        return {
          error: "Nalog je kreiran. Potvrdite email adresu, pa se prijavite.",
        };
      }
    }
    redirect(parsed.data.kind === "buyer" ? await buyerDestination(requestedNext, created.data.user.id) : "/dashboard");
  } catch (error) {
    if (error instanceof DataError) return { error: error.message };
    throw error;
  }
}

async function freeSlug(name: string) {
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = slugCandidate(name, attempt);
    if (RESERVED_SLUGS.has(candidate)) continue;
    if (!(await getCommerce().isSlugTaken(candidate))) return candidate;
  }
  throw new DataError("Ne možemo da napravimo adresu od ovog naziva.", "conflict");
}

export async function logoutAction() {
  if (getDataMode() === "demo") {
    await clearDemoSession();
  } else {
    const { createSupabaseServer } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
