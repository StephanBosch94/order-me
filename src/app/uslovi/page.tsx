import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { signupMetadata } from "@/lib/seo";

export const metadata: Metadata = signupMetadata(
  "Uslovi korišćenja",
  "Uslovi korišćenja Vendro platforme za prodavce i kupce.",
  "/uslovi",
);

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold tracking-[-0.02em] text-navy">Uslovi korišćenja</h1>
        <p className="text-sm text-muted-foreground">Poslednje ažuriranje: 24. novembar 2026.</p>
        <Section title="Usluga">
          Vendro je softverska platforma preko koje prodavac objavljuje katalog i prima porudžbine, a kupac šalje
          porudžbinu. Ugovor o kupoprodaji robe nastaje između prodavca i kupca, ne između Vendro-a i kupca.
        </Section>
        <Section title="Nalozi">
          Odgovorni ste za tačnost podataka i za čuvanje lozinke. Zabranjeno je zloupotrebljavati platformu, ometati
          rad drugih korisnika ili pokušavati neovlašćen pristup.
        </Section>
        <Section title="Porudžbine i dokumenta">
          Potvrda porudžbine nije fiskalni račun niti zakonska e-faktura. Fiskalizacija, PDV obračun i SEF obaveze
          ostaju na prodavcu. Produkcijsko slanje e-fakture biće uključeno tek kada integracija bude sertifikovana.
        </Section>
        <Section title="Pretplata">
          Prodavac koristi platformu prema dogovorenom paketu. Neplaćanje ili zloupotreba mogu dovesti do
          privremenog ili trajnog isključivanja naloga.
        </Section>
        <Section title="Dostupnost">
          Trudimo se da usluga radi stalno, ali ne garantujemo neprekidan rad. Planirano održavanje i vanredni
          prekidi mogu se desiti.
        </Section>
        <Section title="Odgovornost">
          Vendro nije odgovoran za sadržaj kataloga, cene, kvalitet robe, rokove isporuke ni sporove između
          prodavca i kupca. Odgovornost platforme ograničena je na iznos pretplate plaćene za mesec u kojem je
          nastala šteta, osim kada zakon ne dozvoljava takvo ograničenje.
        </Section>
        <Section title="Kontakt">
          Pitanja o uslovima šaljite na{" "}
          <a className="underline" href="mailto:porudzbine@vendro.rs">
            porudzbine@vendro.rs
          </a>
          .
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
