import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { signupMetadata } from "@/lib/seo";

export const metadata: Metadata = signupMetadata(
  "Politika privatnosti",
  "Kako Vendro obrađuje lične podatke prodavaca, kupaca i posetilaca.",
  "/privatnost",
);

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-mint-soft">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <Link href="/" className="text-sm text-muted-foreground hover:text-navy">
            Početna
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-[-0.02em] text-navy">Politika privatnosti</h1>
        <p className="text-sm text-muted-foreground">Poslednje ažuriranje: 24. novembar 2026.</p>
        <Section title="Rukovalac">
          Vendro obrađuje podatke radi pružanja usluge poručivanja. Kontakt za zahteve o privatnosti:{" "}
          <a className="underline" href="mailto:porudzbine@vendro.rs">
            porudzbine@vendro.rs
          </a>
          .
        </Section>
        <Section title="Koje podatke obrađujemo">
          Obrađujemo ime, email, telefon, adresu, PIB i matični broj kada su potrebni za nalog ili porudžbinu, kao i
          podatke o porudžbinama, statusima, IP adresi radi zaštite od zloupotrebe i tehničke podatke o sesiji.
        </Section>
        <Section title="Svrha i osnov">
          Podaci se koriste za registraciju, prijavu, potvrdu naloga, slanje porudžbina i potvrda, podršku, naplatu
          pretplate i bezbednost sistema. Osnov je izvršenje ugovora, legitimni interes zaštite platforme i, gde je
          potrebno, saglasnost.
        </Section>
        <Section title="Čuvanje">
          Podaci se čuvaju dok je nalog aktivan i dok postoji pravni ili računovodstveni razlog. Porudžbine i
          potvrde mogu se čuvati duže radi evidencije. Po zahtevu brišemo nalog i podatke koji više nisu potrebni,
          osim kada zakon traži drugačije.
        </Section>
        <Section title="Primaoci">
          Podaci se obrađuju kod pouzdanih procesora: hosting, baza, autentifikacija i slanje emaila. Ne prodajemo
          lične podatke.
        </Section>
        <Section title="Prava">
          Imate pravo na uvid, ispravku, brisanje, ograničenje obrade, prenosivost i prigovor. Zahtev pošaljite na
          porudzbine@vendro.rs. Možete podneti pritužbu nadležnom organu za zaštitu podataka.
        </Section>
        <Section title="Kolačići">
          Koristimo neophodne kolačiće za prijavu, bezbednost i rad prodavnice. Analitičke ili marketinške kolačiće ne
          postavljamo dok se posebno ne uvedu i dok se ne zatraži saglasnost.
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      <p className="text-base leading-7 text-navy">{children}</p>
    </section>
  );
}
