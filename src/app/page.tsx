import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex gap-2">
          <Link href="/login" className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium hover:bg-zinc-100">
            Prijava
          </Link>
          <Link href="/signup" className="inline-flex h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
            Otvorite nalog
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-sm font-medium text-indigo-700">Za dobavljače i distributere</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Vaši kupci poručuju online.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Vi prestajete da primate porudžbine telefonom. Svaka firma dobija svoju stranicu, katalog i pregled porudžbina.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup">
            <Button size="lg">Otvorite nalog</Button>
          </Link>
          <Link href="/s/gastro-supply">
            <Button size="lg" variant="secondary">
              Pogledajte demo poručivanje
            </Button>
          </Link>
        </div>
        <dl className="mt-16 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          {[
            ["Stranica firme", "Jedinstvena adresa koju šaljete postojećim kupcima."],
            ["Katalog", "Cene i količine. Kupac može da ima nalog ili da poruči bez njega."],
            ["Porudžbine", "Status, potvrda i PDF umesto poruka i beležnica."],
          ].map(([title, body]) => (
            <div key={title} className="bg-card px-5 py-5">
              <dt className="text-sm font-semibold">{title}</dt>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">{body}</dd>
            </div>
          ))}
        </dl>
      </main>
    </div>
  );
}
