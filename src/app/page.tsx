import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { DemoPicker } from "@/components/marketing/demo-picker";
import { distributionDemo, distributionDemoLabel, showMarketplace, showOnlineStore } from "@/lib/marketing";
import { JsonLd } from "@/components/seo/json-ld";
import { getAppUrl } from "@/lib/config";
import { organizationJsonLd, siteDescription, siteTitle } from "@/lib/seo";
import { cn } from "@/lib/utils";

const retailDescription = "Kupac vidi katalog i poručuje. Manje poziva i poruka „imate li ovu?“.";

const homeDescription = showOnlineStore ? retailDescription : siteDescription;

export const metadata: Metadata = {
  title: { absolute: siteTitle },
  description: homeDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "sr_RS",
    siteName: "Vendro",
    title: siteTitle,
    description: homeDescription,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: homeDescription,
  },
};

const messages = [
  {
    title: "Bez poziva",
    body: "Kupci naručuju online, u bilo koje vreme. Porudžbina ne ostaje u propuštenom pozivu.",
  },
  {
    title: "Jedan pregled",
    body: "Svaka porudžbina, od svakog kupca, na jednom mestu. Vidite šta je stiglo i šta je obrađeno.",
  },
  {
    title: "Cenovnik koji sami menjate",
    body: "Naziv, cena, slika i količina. Cenovnik je uvek pred kupcem, bez poruka komad po komad.",
  },
  {
    title: "Nekoliko dana, ne meseci",
    body: "Naziv, telefon i adresa. Dodate proizvode i šaljete link kupcima koje već snabdevate.",
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
  "Kupac vidi sliku, cenu i jedinicu mere.",
  "Ostavlja ime, telefon, email i adresu isporuke.",
  "Sa nalogom vidi svoje porudžbine.",
  "Vi menjate status, a kupac dobija potvrdu.",
  "Link šaljete kupcima koje već snabdevate.",
];

const steps = [
  {
    title: "Otvorite veleprodaju",
    body: "Naziv, telefon i adresa. To kupci vide na stranici.",
  },
  {
    title: "Dodajte proizvode",
    body: "Naziv, cena, slika i jedinica. Cenu uvek računa server.",
  },
  {
    title: "Pošaljite link",
    body: "Isti link šaljete kupcima koje snabdevate.",
  },
  {
    title: "Obradite porudžbinu",
    body: "Stiže u pregled. Kupac može da preuzme potvrdu.",
  },
];

const previewLines = [
  { name: "Brašno T-500", meta: "10 × 89,00 RSD" },
  { name: "Ulje suncokretovo", meta: "6 × 189,00 RSD" },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white text-[#111111]">
      <JsonLd data={organizationJsonLd(getAppUrl())} />
      <header className="sticky top-0 z-20 border-b border-[#E7E5E2] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            aria-label="Vendro"
            className="rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111111]"
          >
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Sadržaj stranice">
            {showOnlineStore ? <Anchor href="#katalog">Katalog</Anchor> : null}
            <Anchor href="#veleprodaja">Veleprodaja</Anchor>
            <Anchor href="#benefiti">Benefiti</Anchor>
            <Anchor href="#kako">Kako radi</Anchor>
          </nav>
          <div className="flex items-center gap-2">
            {showMarketplace ? (
              <Link href="/marketplace" className={textLink}>
                Marketplace
              </Link>
            ) : null}
            <Link href="/login" className={textLink}>
              Prijava
            </Link>
            <Link href="/signup" className={primaryButton}>
              Otvorite nalog
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
            <div>
              <p className="text-sm leading-5 font-medium text-[#6B6B6B]">Za firme koje i dalje primaju porudžbine telefonom</p>
              <h1 className="mt-4 max-w-xl text-[40px] leading-[48px] font-extrabold tracking-[-0.03em] text-balance sm:text-[56px] sm:leading-[64px]">
                {showOnlineStore
                  ? "Manje poziva. Manje poruka „imate li ovu?“."
                  : "Porudžbine, bez poziva."}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-6 text-[#6B6B6B]">
                Kupci naručuju online, u bilo koje vreme. Svaka porudžbina stiže u jedan pregled, umesto u poziv ili poruku.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryButtonLg}>
                  Otvorite veleprodaju
                  <Arrow />
                </Link>
                <DemoPicker className={outlineButtonLg} />
              </div>
              <p className="mt-4 flex items-center gap-2 text-base leading-6 font-semibold text-[#111111]">
                <Gift />
                3 meseca besplatno.
              </p>
            </div>
            <OrderPreview />
          </div>
        </section>

        <section aria-label="Demo" className="border-y border-[#E7E5E2] bg-[#F7F6F4]">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm leading-5 text-[#6B6B6B]">Pre registracije</p>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              {showOnlineStore ? (
                <DemoStoreLink href="/shop/mercis-atelier" className="hover:underline">
                  <span className="block text-sm leading-5 font-medium text-[#EE8139]">Online prodavnica</span>
                  <span className="mt-1 block text-[20px] leading-7 font-bold">Mercis Atelier</span>
                </DemoStoreLink>
              ) : null}
              <DemoStoreLink href={distributionDemo.href} className="text-base leading-6 font-semibold hover:underline">
                {distributionDemoLabel}
              </DemoStoreLink>
            </div>
          </div>
        </section>

        {showOnlineStore ? (
          <section id="katalog" className="scroll-mt-20 border-t border-[#E7E5E2]">
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
              <img src="/products/ma-mindjuse.svg" alt="Minđuše alke" className="aspect-[4/3] w-full rounded-[16px] border border-[#E7E5E2] bg-[#F7F6F4] object-contain p-10" />
              <div>
                <p className="text-sm leading-5 font-medium text-[#6B6B6B]">Katalog</p>
                <h2 className={sectionTitle}>Manje „imate li ovu?“</h2>
                <p className="mt-4 text-base leading-6 text-[#6B6B6B]">
                  Kupac vidi minđuše, ogrlicu ili prsten, cenu i sliku, pa sam stavlja u korpu i ostavlja adresu.
                  Vi ne šaljete cenu komad po komad.
                </p>
                <BenefitList items={shopBenefits} />
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/signup" className={primaryButton}>
                    Otvorite veleprodaju
                  </Link>
                  <DemoStoreLink href="/shop/mercis-atelier" className={outlineButton}>
                    Pogledajte Mercis Atelier
                  </DemoStoreLink>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section id="veleprodaja" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
            <div>
              <p className="text-sm leading-5 font-medium text-[#6B6B6B]">Veleprodaja</p>
              <h2 className={sectionTitle}>Svaka porudžbina, na jednom mestu.</h2>
              <p className="mt-4 text-base leading-6 text-[#6B6B6B]">
                Stranica radi i kad ste na isporuci. Kupac poručuje sam, a poziv koji ipak stigne unesete u istu listu.
              </p>
              <BenefitList items={catalogBenefits} />
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryButton}>
                  Otvorite veleprodaju
                </Link>
                <DemoStoreLink href={distributionDemo.href} className={outlineButton}>
                  {distributionDemoLabel}
                </DemoStoreLink>
              </div>
              <p className="mt-4 text-sm leading-5 text-[#6B6B6B]">
                Kupac može da{" "}
                <Link href="/signup/kupac" className="font-semibold text-[#111111] underline-offset-2 hover:underline">
                  otvori nalog
                </Link>{" "}
                i da vidi svoje porudžbine.
              </p>
            </div>
            <img
              src="/marketing/biznis.jpg"
              alt="Vlasnica radnje radi na laptopu"
              className="aspect-[4/3] w-full rounded-[16px] border border-[#E7E5E2] object-cover object-[center_32%]"
            />
          </div>
        </section>

        <section id="benefiti" className="scroll-mt-20 bg-[#F7F6F4]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <h2 className={sectionTitle}>Prodaja koja ne čeka da se javite</h2>
            <p className="mt-4 max-w-2xl text-base leading-6 text-[#6B6B6B]">
              Manje vremena na telefonu, porudžbine i kad ste zatvoreni, i kupci koji ostaju u vašoj evidenciji.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {messages.map((message) => (
                <li key={message.title} className="rounded-[16px] border border-[#E7E5E2] bg-white p-6">
                  <h3 className="text-[20px] leading-7 font-bold">{message.title}</h3>
                  <p className="mt-2 text-base leading-6 text-[#6B6B6B]">{message.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="kako" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <h2 className={sectionTitle}>Kako krene da radi</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="border-t border-[#E7E5E2] pt-5">
                  <p className="font-mono text-sm leading-5 text-[#111111]">0{index + 1}</p>
                  <h3 className="mt-3 text-[20px] leading-7 font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-5 text-[#6B6B6B]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#FCEDE9]">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className={sectionTitle}>Otvorite veleprodaju</h2>
              <p className="mt-4 max-w-xl text-base leading-6 text-[#111111]">
                3 meseca besplatno. Pogledajte{" "}
                <DemoStoreLink href={distributionDemo.href} className="font-semibold underline-offset-2 hover:underline">
                  {distributionDemoLabel}
                </DemoStoreLink>{" "}
                pre registracije.
              </p>
            </div>
            <Link href="/signup" className={primaryButtonLg}>
              Otvorite veleprodaju
              <Arrow />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E7E5E2] bg-[#F7F6F4]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-5 text-[#6B6B6B]">Porudžbine, bez poziva.</p>
          </div>
          <FooterColumn title="Veleprodaja">
            {showMarketplace ? <FooterLink href="/marketplace">Marketplace</FooterLink> : null}
            <FooterLink href="/signup">Otvorite veleprodaju</FooterLink>
            {showOnlineStore ? <FooterLink href="/shop/mercis-atelier" newTab>Mercis Atelier</FooterLink> : null}
            <FooterLink href={distributionDemo.href} newTab>{distributionDemoLabel}</FooterLink>
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

const sectionTitle = "max-w-2xl text-[28px] leading-9 font-bold tracking-[-0.02em] text-balance text-[#111111]";

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]";

const primaryButton = cn(
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-[#111111] px-4 text-sm leading-5 font-medium text-white transition-colors hover:bg-[#333333]",
  focusRing,
);
const primaryButtonLg = cn(primaryButton, "h-12 px-5 text-base leading-6");
const outlineButton = cn(
  "inline-flex h-10 items-center justify-center rounded-[10px] border border-[#111111] bg-white px-4 text-sm leading-5 font-medium text-[#111111] transition-colors hover:bg-[#F7F6F4]",
  focusRing,
);
const outlineButtonLg = cn(outlineButton, "h-12 px-5 text-base leading-6");
const textLink = cn("inline-flex h-10 items-center px-3 text-sm leading-5 font-semibold text-[#111111] hover:underline", focusRing);

function OrderPreview() {
  return (
    <div className="rounded-[16px] bg-[#FCEDE9] p-4 sm:p-6">
      <div className="rounded-[16px] border border-[#E7E5E2] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-sm leading-5 text-[#111111]">Porudžbina #1042</p>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FCEDE9] px-2.5 py-1 text-sm leading-5 font-medium text-[#111111]">
            <span className="size-2 rounded-full bg-[#EE8139]" aria-hidden="true" />
            Nova
          </span>
        </div>
        <ul className="mt-5 divide-y divide-[#E7E5E2] border-y border-[#E7E5E2]">
          {previewLines.map((line) => (
            <li key={line.name} className="flex items-baseline justify-between gap-4 py-3">
              <span className="text-base leading-6 font-medium">{line.name}</span>
              <span className="shrink-0 text-sm leading-5 text-[#6B6B6B]">{line.meta}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm leading-5 text-[#6B6B6B]">Ukupno</span>
          <span className="text-base leading-6 font-semibold">2.024,00 RSD</span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-5 text-[#6B6B6B]">Poziv postaje potvrđena porudžbina.</p>
    </div>
  );
}

function Gift() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-[#EE8139]" aria-hidden="true" fill="none">
      <rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="rounded-[10px] px-3 py-2 text-sm leading-5 font-semibold text-[#111111] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]">
      {children}
    </a>
  );
}

function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-base leading-6 text-[#111111]">
          <svg viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0" aria-hidden="true" fill="none">
            <path d="M5 12.5 9.5 17 19 7" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm leading-5 font-semibold">{title}</p>
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
    <Link href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noreferrer" : undefined} className="text-sm leading-5 text-[#6B6B6B] hover:text-[#111111] hover:underline">
      {children}
      {newTab ? <span className="sr-only">, otvara se u novom tabu</span> : null}
    </Link>
  );
}
