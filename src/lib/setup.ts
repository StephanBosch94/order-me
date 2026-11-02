import { normalizeMb } from "@/lib/buyer";
import type { Organization } from "@/lib/data/types";

export type SetupStep = {
  id: "name" | "phone" | "address" | "product";
  title: string;
  detail: string;
  href: string;
  done: boolean;
};

type SetupOrganization = Pick<Organization, "name" | "audience" | "phone" | "address" | "city" | "pib" | "mb">;

export function storeSetup(organization: SetupOrganization, activeProducts: number): SetupStep[] {
  const phone = organization.phone.trim();
  const address = organization.address.trim();
  const city = organization.city.trim();
  const place = [address, city].filter(Boolean).join(", ");
  const pib = organization.pib.trim();
  const mb = normalizeMb(organization.mb) ?? "";
  const identityDone = address.length >= 3 && city.length >= 2 && /^\d{9}$/.test(pib) && mb.length === 8;
  const steps: SetupStep[] = [
    {
      id: "name",
      title: "Naziv prodavnice",
      detail: organization.name.trim() || "Unesite naziv koji kupci vide.",
      href: "/settings",
      done: organization.name.trim().length >= 2,
    },
    {
      id: "phone",
      title: "Telefon",
      detail: phone || "Unesite broj koji kupci vide na prodavnici.",
      href: "/settings",
      done: phone.replace(/\D/g, "").length >= 6,
    },
    {
      id: "address",
      title: "Adresa, PIB i matični broj",
      detail: identityDone ? `${place} · PIB ${pib} · MB ${mb}` : "Unesite ulicu, grad, PIB i matični broj u podešavanjima.",
      href: "/settings",
      done: identityDone,
    },
  ];

  steps.push({
    id: "product",
    title: "Prvi proizvod",
    detail: activeProducts > 0 ? productPhrase(activeProducts) : "Dodajte bar jedan aktivan proizvod.",
    href: activeProducts > 0 ? "/products" : "/products/new",
    done: activeProducts > 0,
  });

  return steps;
}

export function setupReady(steps: SetupStep[]) {
  return steps.every((step) => step.done);
}

function productPhrase(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} aktivan proizvod`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} aktivna proizvoda`;
  return `${count} aktivnih proizvoda`;
}
