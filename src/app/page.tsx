import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const gallery = [
  { src: "/products/bv-kaput.jpg", name: "Kaput", href: "/shop/butik-vera" },
  { src: "/products/bv-haljina.jpg", name: "Crvena haljina", href: "/shop/butik-vera" },
  { src: "/products/bv-kosulja.jpg", name: "Bela košulja", href: "/shop/butik-vera" },
  { src: "/products/PC-025.jpg", name: "Papirna čaša", href: "/shop/gastro-supply" },
  { src: "/products/KB-4030.jpg", name: "Kartonska kutija", href: "/shop/gastro-supply" },
  { src: "/products/AF-50.jpg", name: "Folija", href: "/shop/gastro-supply" },
];

export const metadata: Metadata = {
  title: { absolute: "Prodora" },
  description:
    "Manje telefonskih poziva za firme. U prodavnici, manje poruka „imate li ovu?“.",
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
  "Kupac može da otvori nalog i da vidi svoje kupovine.",
];

const businessBenefits = [
  "Cenovnik ima jedinicu mere i minimalnu količinu.",
  "Firma ostavlja naziv, kontakt, telefon i PIB.",
  "Pravno lice vidi statistiku, svoje porudžbine i može da naruči isto kao prošli put.",
  "Vi menjate status, a kupac dobija potvrdu i PDF.",
  "Link šaljete restoranima, kafićima i prodavnicama koje već snabdevate.",
];

const steps = [
  {
    title: "Izaberite kome prodajete",
    body: "Fizičkim licima, pravnim licima, ili i jednim i drugima. To kasnije menjate u podešavanjima.",
  },
  {
    title: "Dodajte katalog",
    body: "Naziv, cena i slika. Za pravna lica tu su i jedinica i minimalna količina. Cenu uvek računa server.",
  },
  {
    title: "Pošaljite link",
    body: "Prodavnica je na /shop/vaš-naziv. Ako prodajete i pravnim licima, na istoj adresi biraju kako kupuju.",
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
            <Anchor href="#fizicka">Fizička lica</Anchor>
            <Anchor href="#pravna">Pravna lica</Anchor>
            <Anchor href="#koristi">Koristi</Anchor>
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
                Manje telefonskih poziva. U prodavnici, manje „imate li ovu?“.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#425466]">
                Firma sama unosi količine, umesto da zove. Kupac u prodavnici vidi sliku i cenu, umesto da pita
                u poruci. Obe porudžbine stižu u vaš pregled.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryButtonLg}>
                  Otvorite prodavnicu
                  <Arrow />
                </Link>
              </div>
            </div>
            <div className="lg:hidden">
              <div className="h-48 overflow-hidden rounded-2xl">
                <GradientField />
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Demo" className="border-y border-[#e6ebf1]">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-[#425466]">Pogledajte demo pre registracije</p>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-lg font-semibold tracking-tight">
              <Link href="/shop/butik-vera" className="hover:text-[#635bff]">
                Butik Vera
              </Link>
              <Link href="/shop/gastro-supply" className="hover:text-[#635bff]">
                Gastro Supply
              </Link>
            </div>
          </div>
        </section>

        <section aria-label="Iz demo kataloga" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="max-w-3xl text-3xl leading-tight font-semibold tracking-[-0.03em] text-[#425466] sm:text-4xl">
            Iz demo kataloga. Prave fotografije, cene u dinarima.
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {gallery.map((item) => (
              <li key={item.name}>
                <Link href={item.href} className="group block">
                  <span className="block overflow-hidden rounded-xl border border-[#e6ebf1]">
                    <img src={item.src} alt="" className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  </span>
                  <span className="mt-2 block text-sm font-medium">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="fizicka" className="scroll-mt-20 border-t border-[#e6ebf1]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
            <img src="/products/bv-haljina.jpg" alt="Crvena haljina" className="aspect-[4/3] w-full rounded-2xl border border-[#e6ebf1] object-cover" />
            <div>
              <p className="text-sm font-medium text-[#635bff]">Fizička lica</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-balance">Manje „imate li ovu?“</h2>
              <p className="mt-4 text-base leading-7 text-[#425466]">
                Kupac vidi haljinu, kaput ili minđuše, cenu i sliku, pa sam stavlja u korpu i ostavlja adresu.
                Vi ne šaljete cenu komad po komad.
              </p>
              <BenefitList items={shopBenefits} />
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryButton}>
                  Otvorite prodavnicu
                </Link>
                <Link href="/shop/butik-vera" className={secondaryButton}>
                  Pogledajte Butik Vera
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="pravna" className="scroll-mt-20 border-t border-[#e6ebf1] bg-[#f6f9fc]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
            <div className="lg:order-1">
              <p className="text-sm font-medium text-[#635bff]">Pravna lica</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-balance">Manje telefonskih poziva</h2>
              <p className="mt-4 text-base leading-7 text-[#425466]">
                Umesto poziva, firma sama unosi količine. Sa nalogom vidi statistiku, svoje porudžbine i može
                da naruči isto kao prošli put.
              </p>
              <BenefitList items={businessBenefits} />
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryButton}>
                  Otvorite prodavnicu
                </Link>
                <Link href="/shop/gastro-supply" className={secondaryButton}>
                  Pogledajte Gastro Supply
                </Link>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#425466]">
                Firma koja kod vas redovno poručuje može da{" "}
                <Link href="/signup/kupac" className="font-medium text-[#635bff] hover:underline">
                  otvori nalog kupca
                </Link>{" "}
                i da vidi svoje porudžbine.
              </p>
            </div>
            <img src="/marketing/kuhinja.jpg" alt="Kuhinja u kojoj se sprema hrana" className="aspect-[4/3] w-full rounded-2xl border border-[#e6ebf1] object-cover lg:order-2" />
          </div>
        </section>

        <section id="koristi" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.03em]">Šta dobijate</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#425466]">
              Katalog, status porudžbine, cene u dinarima i potvrda u PDF-u. Kome prodajete birate vi.
            </p>
            <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#e6ebf1] bg-[#e6ebf1] sm:grid-cols-2">
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
              <h2 className="max-w-xl text-4xl font-semibold tracking-[-0.03em] text-balance">Otvorite prodavnicu</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#425466]">
                Pri otvaranju birate kome prodajete. Demo možete da pogledate pre registracije.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={primaryButtonLg}>
                Otvorite prodavnicu
                <Arrow />
              </Link>
              <Link href="/login" className={secondaryButtonLg}>
                Prijava
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e6ebf1] bg-[#f6f9fc]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <Logo />
          <FooterColumn title="Prodavnica">
            <FooterLink href="/signup">Otvorite prodavnicu</FooterLink>
            <FooterLink href="/shop/butik-vera">Butik Vera</FooterLink>
            <FooterLink href="/shop/gastro-supply">Gastro Supply</FooterLink>
          </FooterColumn>
          <FooterColumn title="Kupci">
            <FooterLink href="/signup/kupac">Nalog pravnog lica</FooterLink>
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
const secondaryButton = primaryButton;
const secondaryButtonLg = primaryButtonLg;

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
    <a href={href} className="rounded-md px-3 py-2 text-sm text-[#425466] hover:text-[#0a2540]">
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

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-[#425466] hover:text-[#635bff]">
      {children}
    </Link>
  );
}
