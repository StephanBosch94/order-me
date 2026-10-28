import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "Poruci" },
  description:
    "Internet prodavnica za kupce i odvojeno poručivanje za firme. Korpa, cenovnik, statusi i potvrda porudžbine u dinarima.",
};

const sharedBenefits = [
  {
    title: "Vaša adresa, vaši kupci",
    body: "Svaka firma dobija sopstvenu stranicu. Kupci dolaze kod vas, a porudžbine ostaju u vašem nalogu.",
  },
  {
    title: "Sve porudžbine na jednom mestu",
    body: "Nova, potvrđena, u pripremi, isporučena ili otkazana. Svaka porudžbina ostaje u pregledu, sa statusom koji sami menjate.",
  },
  {
    title: "Dinari i srpski jezik",
    body: "Cene su u dinarima, datumi po beogradskom vremenu, a tekst na stranici je na srpskoj latinici.",
  },
  {
    title: "Potvrda porudžbine",
    body: "Kupac dobija potvrdu i PDF sa stavkama, količinama i ukupnim iznosom. Dokument se zove potvrda porudžbine.",
  },
];

const shopBenefits = [
  "Proizvodi stoje kao u prodavnici: slika, naziv i cena.",
  "Kupac dodaje u korpu i ide na kasu.",
  "Na kasi ostavlja ime, telefon, email i adresu isporuke.",
  "Boja i znak prodavnice vide se na stranici.",
  "Kupovina se završava na kasi, bez otvaranja naloga.",
];

const businessBenefits = [
  "Cenovnik ima jedinicu mere i minimalnu količinu.",
  "Firma ostavlja naziv, kontakt, telefon i PIB.",
  "Kupac može da ima nalog i da vidi svoje porudžbine.",
  "Vi menjate status, a kupac dobija potvrdu i PDF.",
  "Link šaljete restoranima, kafićima i prodavnicama koje već snabdevate.",
];

const steps = [
  {
    title: "Izaberite kako prodajete",
    body: "Internet prodavnica ako kupci kupuju kao u shopu. Poručivanje za firme ako vam firme šalju količine sa cenovnika.",
  },
  {
    title: "Dodajte katalog",
    body: "Naziv, cena, slika i, za firme, jedinica i minimalna količina. Cenu uvek računa server, kupac je ne unosi.",
  },
  {
    title: "Pošaljite link",
    body: "Prodavnica je na /shop/vaš-naziv. Poručivanje za firme je na /s/vaš-naziv. To su dve različite stranice.",
  },
  {
    title: "Obradite porudžbinu",
    body: "Stiže u pregled. Promenite status, a kupac može da preuzme potvrdu porudžbine.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Sadržaj stranice">
            <Anchor href="#prodavnica">Prodavnica</Anchor>
            <Anchor href="#firme">Firme</Anchor>
            <Anchor href="#koristi">Koristi</Anchor>
            <Anchor href="#kako">Kako radi</Anchor>
          </nav>
          <div className="flex gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Prijava
            </Link>
            <Link href="/signup" className={buttonVariants()}>
              Otvorite nalog
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-medium text-indigo-700">Za one koji prodaju u Srbiji</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Prodavnica za kupce. Poručivanje za firme.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Poruci drži ta dva posla odvojeno. Kupac u prodavnici bira robu i ide na kasu. Firma na drugoj
            stranici poručuje količine sa cenovnika. Svaka ima svoju adresu, a porudžbine stižu u njen pregled.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup/prodavnica" className={buttonVariants({ size: "lg" })}>
              Otvorite prodavnicu
            </Link>
            <Link href="/signup/firme" className={buttonVariants({ size: "lg", variant: "secondary" })}>
              Otvorite nalog za firme
            </Link>
          </div>
        </section>

        <section id="prodavnica" className="scroll-mt-20 border-t border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-xs font-medium text-indigo-700">Internet prodavnica</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Klasičan shop na vašoj adresi</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Za robu koju kupac uzima kao u prodavnici: kafa, čaša, pakovanje za kuću. Stranica ima
                proizvode, korpu i kasu sa imenom, telefonom i adresom.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/signup/prodavnica" className={buttonVariants()}>
                  Otvorite prodavnicu
                </Link>
                <Link href="/shop/kafa-kutak" className={buttonVariants({ variant: "secondary" })}>
                  Pogledajte Kafa Kutak
                </Link>
              </div>
            </div>
            <BenefitList items={shopBenefits} />
          </div>
        </section>

        <section id="firme" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-xs font-medium text-indigo-700">Poručivanje za firme</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Cenovnik koji firme same popune</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Za dobavljače koji snabdevaju restorane, kafiće i prodavnice. Kupac vidi jedinicu, minimalnu
                količinu i cenu, unosi podatke firme i šalje porudžbinu. Vi je potvrđujete.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/signup/firme" className={buttonVariants()}>
                  Otvorite nalog za firme
                </Link>
                <Link href="/s/gastro-supply" className={buttonVariants({ variant: "secondary" })}>
                  Pogledajte Gastro Supply
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Firma koja kod vas redovno poručuje može da{" "}
                <Link href="/signup/kupac" className="font-medium text-foreground underline-offset-2 hover:underline">
                  otvori nalog kupca
                </Link>{" "}
                i da vidi svoje porudžbine.
              </p>
            </div>
            <BenefitList items={businessBenefits} />
          </div>
        </section>

        <section id="koristi" className="scroll-mt-20 border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">Šta dobijate u oba slučaja</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Oba načina imaju katalog, status porudžbine, cene u dinarima i potvrdu u PDF-u. Stranice ostaju odvojene.
            </p>
            <dl className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
              {sharedBenefits.map((benefit) => (
                <div key={benefit.title} className="bg-card px-5 py-5">
                  <dt className="text-sm font-semibold">{benefit.title}</dt>
                  <dd className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="kako" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">Kako krene da radi</h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm font-medium text-indigo-700">0{index + 1}</p>
                  <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border bg-zinc-950 text-zinc-50">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="max-w-xl text-3xl font-semibold tracking-tight">Otvorite onaj nalog koji vam treba</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">
                Prodavnica i poručivanje za firme ostaju odvojeni. Demo možete da pogledate pre registracije.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "bg-white text-zinc-950 hover:bg-zinc-200")}>
                Izaberite nalog
              </Link>
              <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "border-zinc-700 bg-transparent text-white hover:bg-zinc-900")}>
                Prijava
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/shop/kafa-kutak" className="hover:text-foreground">
              Demo prodavnica
            </Link>
            <Link href="/s/gastro-supply" className="hover:text-foreground">
              Demo za firme
            </Link>
            <Link href="/signup/kupac" className="hover:text-foreground">
              Nalog kupca
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
      {children}
    </a>
  );
}

function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
      {items.map((item) => (
        <li key={item} className="px-4 py-3 text-sm leading-6">
          {item}
        </li>
      ))}
    </ul>
  );
}
