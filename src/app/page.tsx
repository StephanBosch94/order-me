import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { DemoPicker } from "@/components/marketing/demo-picker";
import { distributionDemo, distributionDemoLabel, showOnlineStore } from "@/lib/marketing";
import { cn } from "@/lib/utils";

const retailDescription = "Kupac vidi katalog i poručuje. Manje poziva i poruka „imate li ovu?“.";
const distributionDescription = "Manje telefonskih poziva i poruka, više vremena za Vas.";

export const metadata: Metadata = {
  title: { absolute: "Prodora" },
  description: showOnlineStore ? retailDescription : distributionDescription,
};

const sharedBenefits = [
  {
    title: "Ušteda vremena",
    body: "Kupac sam bira proizvod, količinu i adresu. Vi ne ponavljate cenovnik u svakom pozivu i poruci.",
  },
  {
    title: "Automatizacija",
    body: "Porudžbina stiže u pregled, a kupac dobija potvrdu i PDF. Status menjate na jednom mestu.",
  },
  {
    title: "Povećanje prodaje",
    body: "Cenovnik je uvek pred kupcem. Naručuje i kad ste na isporuci, pa prodaja ne čeka da se javite.",
  },
  {
    title: "Dostupnost 24/7",
    body: "Stranica prima porudžbine noću, vikendom i dok ste u magacinu. Ujutru su već na listi.",
  },
  {
    title: "Baza kupaca",
    body: "Firma, telefon, adresa i istorija porudžbina ostaju kod vas. Sledeći put ne kucate iste podatke.",
  },
  {
    title: "Unos porudžbine",
    body: "Kad kupac ipak pozove, porudžbinu unesete vi. Isti kupac, ista lista, ista potvrda.",
  },
];

const shopBenefits = [
  "Proizvodi stoje kao u prodavnici: slika, naziv i cena.",
  "Kupac dodaje u korpu i ide na kasu.",
  "Na kasi ostavlja ime, telefon, email i adresu isporuke.",
  "Boja i znak prodavnice vide se na stranici.",
  "Kupac može da otvori nalog i da vidi svoje kupovine.",
];

const catalogBenefits = [
  "Cenovnik ima jedinicu mere i minimalnu količinu.",
  "Kupac ostavlja ime, telefon, email i adresu isporuke.",
  "Sa nalogom vidi svoje porudžbine.",
  "Vi menjate status, a kupac dobija potvrdu i PDF.",
  "Link šaljete kupcima koje već snabdevate.",
];

const steps = [
  {
    title: "Otvorite veleprodaju",
    body: "Naziv, telefon i adresa. To kupci vide na stranici.",
  },
  {
    title: "Dodajte proizvode",
    body: "Naziv, cena, slika, jedinica i količina. Cenu uvek računa server.",
  },
  {
    title: "Pošaljite link",
    body: "Link je na /shop/vaš-naziv. Isti link šaljete kupcima koje snabdevate.",
  },
  {
    title: "Obradite porudžbinu",
    body: "Stiže u pregled. Promenite status, a kupac može da preuzme potvrdu porudžbine.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white text-[#0a2540]">
      <header className="sticky top-0 z-20 border-b border-[#e6ebf1] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Sadržaj stranice">
            {showOnlineStore ? <Anchor href="#katalog">Katalog</Anchor> : null}
            <Anchor href="#veleprodaja">Veleprodaja</Anchor>
            <Anchor href="#benefiti">Benefiti</Anchor>
            <Anchor href="#kako">Kako radi</Anchor>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="inline-flex h-10 items-center px-3 text-sm font-medium text-[#0a2540] hover:text-[#635bff]">
              Prijava
            </Link>
            <Link href="/signup" className={primaryButton}>
              Otvorite nalog
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block" aria-hidden="true">
            <GradientField />
          </div>
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.8fr)] lg:items-center">
            <div>
              <p className="text-sm font-medium text-[#425466]">Za one koji prodaju u Srbiji</p>
              <h1 className="mt-4 max-w-xl text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-[4.25rem]">
                {showOnlineStore
                  ? "Manje telefonskih poziva. U prodavnici, manje „imate li ovu?“."
                  : "Manje telefonskih poziva i poruka, više vremena za Vas."}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#425466]">
                Kupac vidi sliku, cenu i količinu, pa sam poručuje. Porudžbina stiže u vaš pregled, umesto
                poziva ili poruke.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryButtonLg}>
                  Otvorite veleprodaju
                  <Arrow />
                </Link>
                <DemoPicker className={outlineButtonLg} />
              </div>
            </div>
            <DemoStoreLink href={distributionDemo.href} className="block">
              <ShopPreview />
            </DemoStoreLink>
          </div>
        </section>

        <section aria-label="Demo" className="border-y border-[#e6ebf1]">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-[#425466]">Pre registracije</p>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              {showOnlineStore ? (
                <DemoStoreLink href="/shop/mercis-atelier" className="hover:text-[#635bff]">
                  <span className="block text-xs font-medium text-[#635bff]">Online prodavnica</span>
                  <span className="mt-1 block text-lg font-semibold tracking-tight">Mercis Atelier</span>
                </DemoStoreLink>
              ) : null}
              <DemoStoreLink href="/shop/mesara-pajic" className="hover:text-[#635bff]">
                <span className="block text-lg font-semibold tracking-tight">{distributionDemoLabel}</span>
              </DemoStoreLink>
            </div>
          </div>
        </section>

        {showOnlineStore ? <section id="katalog" className="scroll-mt-20 border-t border-[#e6ebf1]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
            <img src="/products/ma-mindjuse.svg" alt="Minđuše alke" className="aspect-[4/3] w-full rounded-2xl border border-[#e6ebf1] bg-[#f6f1ea] object-contain p-10" />
            <div>
              <p className="text-sm font-medium text-[#635bff]">Katalog</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-balance">Manje „imate li ovu?“</h2>
              <p className="mt-4 text-base leading-7 text-[#425466]">
                Kupac vidi minđuše, ogrlicu ili prsten, cenu i sliku, pa sam stavlja u korpu i ostavlja adresu.
                Vi ne šaljete cenu komad po komad.
              </p>
              <BenefitList items={shopBenefits} />
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryButton}>
                  Otvorite veleprodaju
                </Link>
                <DemoStoreLink href="/shop/mercis-atelier" className={secondaryButton}>
                  Pogledajte Mercis Atelier
                </DemoStoreLink>
              </div>
            </div>
          </div>
        </section> : null}

        <section id="veleprodaja" className="scroll-mt-20 border-t border-[#e6ebf1] bg-[#f6f9fc]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
            <div className="lg:order-1">
              <p className="text-sm font-medium text-[#635bff]">Veleprodaja</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-balance">Manje telefonskih poziva i poruka, više vremena za Vas.</h2>
              <p className="mt-4 text-base leading-7 text-[#425466]">
                Stranica radi i kad ste na isporuci. Kupac poručuje sam, a poziv koji ipak stigne unesete u istu listu.
              </p>
              <BenefitList items={catalogBenefits} />
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryButton}>
                  Otvorite veleprodaju
                </Link>
                <DemoStoreLink href="/shop/mesara-pajic" className={secondaryButton}>
                  {distributionDemoLabel}
                </DemoStoreLink>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#425466]">
                Kupac može da{" "}
                <Link href="/signup/kupac" className="font-medium text-[#635bff] hover:underline">
                  otvori nalog
                </Link>{" "}
                i da vidi svoje porudžbine.
              </p>
            </div>
            <img src="/marketing/biznis.jpg" alt="Vlasnica radnje radi na laptopu" className="aspect-[4/3] w-full rounded-2xl border border-[#e6ebf1] object-cover object-[center_32%] lg:order-2" />
          </div>
        </section>

        <section id="benefiti" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.03em]">Prodaja koja ne čeka da se javite</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#425466]">
              Manje vremena na telefonu, porudžbine i kad ste zatvoreni, i kupci koji ostaju u vašoj evidenciji.
            </p>
            <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#e6ebf1] bg-[#e6ebf1] sm:grid-cols-2 lg:grid-cols-3">
              {sharedBenefits.map((benefit) => (
                <div key={benefit.title} className="bg-white px-6 py-6">
                  <dt className="text-base font-semibold">{benefit.title}</dt>
                  <dd className="mt-2 text-sm leading-6 text-[#425466]">{benefit.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="kako" className="scroll-mt-20 border-t border-[#e6ebf1]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <h2 className="text-4xl font-semibold tracking-[-0.03em]">Kako krene da radi</h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="border-t border-[#e6ebf1] pt-5">
                  <p className="text-sm font-medium text-[#635bff]">0{index + 1}</p>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#425466]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-[#e6ebf1]">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="max-w-xl text-4xl font-semibold tracking-[-0.03em] text-balance">Otvorite veleprodaju</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#425466]">
                <DemoStoreLink href="/shop/mesara-pajic" className="font-medium text-[#635bff] hover:underline">
                  {distributionDemoLabel}
                </DemoStoreLink>{" "}
                pre registracije.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={primaryButtonLg}>
                Otvorite veleprodaju
                <Arrow />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e6ebf1] bg-[#f6f9fc]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <Logo />
          <FooterColumn title="Veleprodaja">
            <FooterLink href="/signup">Otvorite veleprodaju</FooterLink>
            {showOnlineStore ? <FooterLink href="/shop/mercis-atelier" newTab>Mercis Atelier</FooterLink> : null}
            <FooterLink href="/shop/mesara-pajic" newTab>{distributionDemoLabel}</FooterLink>
          </FooterColumn>
          <FooterColumn title="Kupci">
            <FooterLink href="/signup/kupac">Nalog kupca</FooterLink>
          </FooterColumn>
          <FooterColumn title="Nalog">
            <FooterLink href="/login">Prijava</FooterLink>
            <FooterLink href="/signup">Otvorite nalog</FooterLink>
            <FooterLink href="/signup/kupac">Nalog kupca</FooterLink>
          </FooterColumn>
        </div>
      </footer>
    </div>
  );
}

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[#635bff] px-3.5 text-sm font-medium text-white shadow-[0_4px_12px_rgba(99,91,255,0.28)] transition-colors hover:bg-[#4f46e5]";
const primaryButtonLg = cn(primaryButton, "h-12 px-5 text-[15px]");
const outlineButton =
  "inline-flex h-10 items-center justify-center rounded-md border border-[#cdd5e0] bg-white px-3.5 text-sm font-medium text-[#0a2540] transition-colors hover:bg-[#f6f9fc]";
const outlineButtonLg = cn(outlineButton, "h-12 px-5 text-[15px]");
const secondaryButton = outlineButton;

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShopPreview() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_70px_rgba(50,50,93,0.16)] ring-1 ring-[#e6ebf1]">
      <div className="flex items-center gap-3 border-b border-[#e6ebf1] bg-white px-4 py-3">
        <img
          src={distributionDemo.logoUrl}
          alt=""
          className="size-12 shrink-0 rounded-md border border-[#e6ebf1] bg-white object-contain"
        />
        <span className="min-w-0 truncate text-xl font-semibold tracking-tight">{distributionDemo.name}</span>
      </div>
      <div className="relative h-72 overflow-hidden bg-zinc-900 sm:h-80">
        <img src={distributionDemo.coverUrl} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/75 via-zinc-950/15 to-transparent" />
        <p className="absolute right-4 bottom-5 left-4 text-sm text-white">{distributionDemo.description}</p>
      </div>
    </div>
  );
}

function GradientField() {
  return (
    <div className="relative h-full min-h-48 w-full overflow-hidden bg-[#f6f9fc]">
      <div className="absolute -top-1/4 -left-1/4 h-[90%] w-[90%] rounded-full bg-[#ff80c8] opacity-80 blur-3xl" />
      <div className="absolute top-[5%] right-[-20%] h-[85%] w-[80%] rounded-full bg-[#635bff] opacity-80 blur-3xl" />
      <div className="absolute bottom-[-25%] left-[10%] h-[70%] w-[75%] rounded-full bg-[#ffb020] opacity-75 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(100deg,white,transparent_42%)]" />
    </div>
  );
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="rounded-md px-3 py-2 text-sm font-semibold text-[#0a2540] hover:text-[#635bff]">
      {children}
    </a>
  );
}

function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-2">
      {items.map((item) => (
        <li key={item} className="text-sm leading-6 text-[#425466]">
          {item}
        </li>
      ))}
    </ul>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function DemoStoreLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
      <span className="sr-only">, otvara se u novom tabu</span>
    </Link>
  );
}

function FooterLink({ href, children, newTab = false }: { href: string; children: React.ReactNode; newTab?: boolean }) {
  return (
    <Link href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noreferrer" : undefined} className="text-sm text-[#425466] hover:text-[#635bff]">
      {children}
      {newTab ? <span className="sr-only">, otvara se u novom tabu</span> : null}
    </Link>
  );
}
