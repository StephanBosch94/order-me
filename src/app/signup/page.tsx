import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Registracija" };

export default async function SignupPage() {
  const session = await getSession();
  if (session?.kind === "buyer") redirect("/kupac");
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-12">
      <Link href="/" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Početna
      </Link>
      <Link href="/" aria-label="Poruci, početna" className="mt-6 w-fit">
        <Logo />
      </Link>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Šta otvarate?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Internet prodavnica i poručivanje za firme su odvojeni.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/signup/prodavnica" className="rounded-lg border border-border bg-card p-5 hover:bg-zinc-50">
          <p className="text-xs font-medium text-indigo-700">Za kupce</p>
          <p className="mt-2 text-base font-semibold">Internet prodavnica</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Klasičan shop. Kupac bira proizvod, stavlja ga u korpu i ostavlja adresu.
          </p>
        </Link>
        <Link href="/signup/firme" className="rounded-lg border border-border bg-card p-5 hover:bg-zinc-50">
          <p className="text-xs font-medium text-indigo-700">Za firme</p>
          <p className="mt-2 text-base font-semibold">Poručivanje za firme</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Cenovnik za restorane, kafiće i prodavnice. Količine, jedinice i podaci firme.
          </p>
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Već imate nalog?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-2 hover:underline">
          Prijavite se
        </Link>
      </p>
    </main>
  );
}
