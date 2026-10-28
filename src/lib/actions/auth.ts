"use server";

import { redirect } from "next/navigation";

import { clearDemoSession, landingPath, setDemoSession } from "@/lib/auth";
import { getDataMode } from "@/lib/config";
import { getCommerce, getDemoIdentity } from "@/lib/data";
import { DataError } from "@/lib/errors";
import { safeNextPath } from "@/lib/text";
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
    const token = await getDemoIdentity().createSession(user.id);
    await setDemoSession(token);
    redirect(landingPath(account, nextPath));
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
  redirect(landingPath(account, nextPath));
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const kind = formData.get("kind") === "buyer" ? "buyer" : "supplier";
  const parsed = signupSchema.safeParse(
    kind === "buyer"
      ? {
          kind,
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          businessName: formData.get("businessName"),
          phone: formData.get("phone") ?? "",
          address: formData.get("address") ?? "",
          city: formData.get("city") ?? "",
          pib: formData.get("pib") ?? "",
        }
      : {
          kind,
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          organizationName: formData.get("organizationName"),
          slug: formData.get("slug"),
          phone: formData.get("phone") ?? "",
        },
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  if (parsed.data.kind === "supplier" && (await getCommerce().isSlugTaken(parsed.data.slug))) {
    return { error: "Ova adresa je već zauzeta.", fieldErrors: { slug: "Ova adresa je već zauzeta." } };
  }

  try {
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
      });
      if (parsed.data.kind === "supplier") {
        await getCommerce().createOrganization({
          userId: user.id,
          userName: parsed.data.name,
          userEmail: user.email,
          name: parsed.data.organizationName,
          slug: parsed.data.slug,
          phone: parsed.data.phone,
        });
      }
      const token = await getDemoIdentity().createSession(user.id);
      await setDemoSession(token);
      redirect(parsed.data.kind === "buyer" ? "/kupac" : "/dashboard");
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
      });
    } else {
      await getCommerce().createOrganization({
        userId: created.data.user.id,
        userName: parsed.data.name,
        userEmail: parsed.data.email,
        name: parsed.data.organizationName,
        slug: parsed.data.slug,
        phone: parsed.data.phone,
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
    redirect(parsed.data.kind === "buyer" ? "/kupac" : "/dashboard");
  } catch (error) {
    if (error instanceof DataError) return { error: error.message };
    throw error;
  }
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
