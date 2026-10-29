import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
});

const gallery = [
  { src: "/products/kk-kafa.jpg", name: "Kafa mlevena", href: "/shop/kafa-kutak" },
  { src: "/products/kk-casa.jpg", name: "Čaša za kafu", href: "/shop/kafa-kutak" },
  { src: "/products/PC-025.jpg", name: "Papirna čaša", href: "/s/gastro-supply" },
  { src: "/products/KB-4030.jpg", name: "Kartonska kutija", href: "/s/gastro-supply" },
  { src: "/products/AF-50.jpg", name: "Folija", href: "/s/gastro-supply" },
  { src: "/products/TS-1L.jpg", name: "Tečnost za sudove", href: "/s/gastro-supply" },
];

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
  "Kupac može da otvori nalog na stranici firme i da vidi svoje kupovine.",
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
    <div className="min-h-dvh bg-[#f3eee6] text-stone-950">
      <header className="sticky top-0 z-10 border-b border-stone-900/10 bg-[#f3eee6]/90 backdrop-blur">
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
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div>
            <p className="text-sm font-medium tracking-wide text-stone-500">Za one koji prodaju u Srbiji</p>
            <h1 className={cn(display.className, "mt-3 max-w-xl text-5xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl")}>
              Prodavnica za kupce. Poručivanje za firme.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-stone-600">
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
          </div>
          <div className="relative">
            <img src="/marketing/pult.jpg" alt="Pult u kafiću" className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-xl sm:aspect-[5/4]" />
            <img
              src="/marketing/kafic.jpg"
              alt=""
              className="absolute -bottom-6 -left-2 hidden w-36 rounded-2xl object-cover shadow-lg ring-4 ring-[#f3eee6] sm:block sm:w-44"
            />
          </div>
        </section>

        <section aria-label="Iz demo kataloga" className="mx-auto max-w-6xl px-4 pt-16 pb-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className={cn(display.className, "text-3xl font-medium tracking-tight")}>Iz demo kataloga</h2>
            <p className="hidden text-sm text-stone-500 sm:block">Prave fotografije, cene u dinarima.</p>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {gallery.map((item) => (
              <li key={item.name}>
                <Link href={item.href} className="group block">
                  <span className="block overflow-hidden rounded-2xl">
                    <img src={item.src} alt="" className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  </span>
                  <span className="mt-2 block text-sm font-medium">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="prodavnica" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
            <img src="/marketing/kafic.jpg" alt="Kafa na stolu" className="aspect-[4/3] w-full rounded-[2rem] object-cover" />
            <div>
              <p className="text-xs font-medium tracking-wide text-stone-500">Internet prodavnica</p>
              <h2 className={cn(display.className, "mt-2 text-4xl font-medium tracking-tight")}>Klasičan shop na vašoj adresi</h2>
              <p className="mt-4 text-base leading-7 text-stone-600">
                Za robu koju kupac uzima kao u prodavnici: kafa, čaša, pakovanje za kuću. Stranica ima
                proizvode, korpu i kasu sa imenom, telefonom i adresom.
              </p>
              <BenefitList items={shopBenefits} />
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/signup/prodavnica" className={buttonVariants()}>
                  Otvorite prodavnicu
                </Link>
                <Link href="/shop/kafa-kutak" className={buttonVariants({ variant: "secondary" })}>
                  Pogledajte Kafa Kutak
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="firme" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2">
            <div className="lg:order-1">
              <p className="text-xs font-medium tracking-wide text-stone-500">Poručivanje za firme</p>
              <h2 className={cn(display.className, "mt-2 text-4xl font-medium tracking-tight")}>Cenovnik koji firme same popune</h2>
              <p className="mt-4 text-base leading-7 text-stone-600">
                Za dobavljače koji snabdevaju restorane, kafiće i prodavnice. Kupac vidi jedinicu, minimalnu
                količinu i cenu, unosi podatke firme i šalje porudžbinu. Vi je potvrđujete.
              </p>
              <BenefitList items={businessBenefits} />
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/signup/firme" className={buttonVariants()}>
                  Otvorite nalog za firme
                </Link>
                <Link href="/s/gastro-supply" className={buttonVariants({ variant: "secondary" })}>
                  Pogledajte Gastro Supply
                </Link>
              </div>
              <p className="mt-4 text-sm text-stone-600">
                Firma koja kod vas redovno poručuje može da{" "}
                <Link href="/signup/kupac" className="font-medium text-stone-950 underline-offset-2 hover:underline">
                  otvori nalog kupca
                </Link>{" "}
                i da vidi svoje porudžbine.
              </p>
            </div>
            <img src="/marketing/kuhinja.jpg" alt="Kuhinja u kojoj se sprema hrana" className="aspect-[4/3] w-full rounded-[2rem] object-cover lg:order-2" />
          </div>
        </section>

        <section id="koristi" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className={cn(display.className, "max-w-2xl text-4xl font-medium tracking-tight")}>Šta dobijate u oba slučaja</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
              Oba načina imaju katalog, status porudžbine, cene u dinarima i potvrdu u PDF-u. Stranice ostaju odvojene.
            </p>
            <dl className="mt-10 grid gap-4 sm:grid-cols-2">
              {sharedBenefits.map((benefit) => (
                <div key={benefit.title} className="rounded-3xl bg-white/70 px-5 py-5">
                  <dt className="text-sm font-semibold">{benefit.title}</dt>
                  <dd className="mt-2 text-sm leading-6 text-stone-600">{benefit.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="kako" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <h2 className={cn(display.className, "text-4xl font-medium tracking-tight")}>Kako krene da radi</h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <p className={cn(display.className, "text-3xl text-stone-400")}>0{index + 1}</p>
                  <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border bg-zinc-950 text-zinc-50">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className={cn(display.className, "max-w-xl text-4xl font-medium tracking-tight")}>Otvorite onaj nalog koji vam treba</h2>
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

      <footer className="border-t border-stone-900/10">
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
    <a href={href} className="rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-white/70">
      {children}
    </a>
  );
}

function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2">
      {items.map((item) => (
        <li key={item} className="text-sm leading-6 text-stone-700">
          {item}
        </li>
      ))}
    </ul>
  );
}
