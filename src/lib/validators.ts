import { z } from "zod";

import { RESERVED_SLUGS } from "@/lib/constants";
import { normalizeQuantity } from "@/lib/data/pricing";
import { ORDER_STATUS_VALUES, UNIT_VALUES, type ProductInput } from "@/lib/data/types";
import { parseRsdToPara } from "@/lib/format";

const slugSchema = z
  .string()
  .trim()
  .min(2, "Adresa mora imati bar 2 karaktera.")
  .max(48, "Adresa je predugačka.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Adresa može sadržati mala slova, brojeve i crtice.")
  .refine((value) => !RESERVED_SLUGS.has(value), "Ova adresa je rezervisana.");

export const loginSchema = z.object({
  email: z.email("Unesite ispravnu email adresu."),
  password: z.string().min(1, "Unesite lozinku."),
  next: z.string().optional(),
});

const signupIdentity = {
  name: z.string().trim().min(2, "Unesite ime i prezime.").max(80),
  email: z.email("Unesite ispravnu email adresu."),
  password: z.string().min(8, "Lozinka mora imati bar 8 karaktera.").max(72),
};

export const signupSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("supplier"),
    ...signupIdentity,
    channel: z.enum(["b2c", "b2b"]),
    organizationName: z.string().trim().min(2, "Unesite naziv firme.").max(120),
    phone: z.string().trim().max(30),
  }),
  z.object({
    kind: z.literal("buyer"),
    ...signupIdentity,
    businessName: z.string().trim().min(2, "Unesite naziv firme.").max(160),
    phone: z.string().trim().min(6, "Unesite broj telefona.").max(30),
    address: z.string().trim().max(200),
    city: z.string().trim().max(80),
    pib: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{9}$/.test(value), "PIB ima 9 cifara."),
  }),
]);

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Unesite naziv firme.").max(120),
  slug: slugSchema,
  email: z.email("Unesite ispravnu email adresu."),
  notificationEmail: z.email("Unesite ispravnu email adresu za obaveštenja."),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(200),
  city: z.string().trim().max(80),
  pib: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{9}$/.test(value), "PIB ima 9 cifara."),
  mb: z.string().trim().max(20),
  logoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || /^https?:\/\/.+/i.test(value), "Unesite ispravnu adresu logotipa."),
  brandColor: z
    .string()
    .trim()
    .refine((value) => value === "" || /^#[0-9a-fA-F]{6}$/.test(value), "Unesite boju u formatu #RRGGBB."),
});

export const customerSchema = z.object({
  businessName: z.string().trim().min(2, "Unesite naziv firme.").max(160),
  contactName: z.string().trim().min(2, "Unesite ime kontakt osobe.").max(120),
  email: z.email("Unesite ispravnu email adresu."),
  phone: z.string().trim().min(6, "Unesite broj telefona.").max(30),
  pib: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{9}$/.test(value), "PIB ima 9 cifara."),
  address: z.string().trim().max(200),
  city: z.string().trim().max(80),
  notes: z.string().trim().max(1000),
});

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "Unesite naziv proizvoda.").max(160),
    sku: z.string().trim().max(40),
    description: z.string().trim().max(2000),
    categoryId: z.string().trim(),
    newCategory: z.string().trim().max(80),
    unit: z.enum(UNIT_VALUES, "Izaberite jedinicu mere."),
    price: z.string().trim().min(1, "Unesite cenu."),
    salePrice: z.string().trim(),
    minQuantity: z.string().trim().min(1, "Unesite minimalnu količinu."),
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const price = parseRsdToPara(value.price);
    if (price === null || price <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "Unesite ispravnu cenu u dinarima.",
      });
    }
    if (value.salePrice) {
      const sale = parseRsdToPara(value.salePrice);
      if (sale === null || sale <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["salePrice"],
          message: "Unesite ispravnu akcijsku cenu.",
        });
      } else if (price !== null && sale >= price) {
        ctx.addIssue({
          code: "custom",
          path: ["salePrice"],
          message: "Akcijska cena mora biti niža od redovne.",
        });
      }
    }

    const quantity = Number(value.minQuantity.replace(",", "."));
    if (normalizeQuantity(quantity, value.unit) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["minQuantity"],
        message: "Minimalna količina nije ispravna za izabranu jedinicu.",
      });
    }
  });

export const statusSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES, "Izaberite status."),
});

export const publicOrderSchema = z
  .object({
    slug: z.string().trim().min(1),
    idempotencyKey: z.uuid("Neispravan identifikator porudžbine."),
    businessName: z.string().trim().min(2, "Unesite naziv firme.").max(160),
    contactName: z.string().trim().min(2, "Unesite ime kontakt osobe.").max(120),
    email: z.email("Unesite ispravnu email adresu."),
    phone: z.string().trim().min(6, "Unesite broj telefona.").max(30),
    pib: z.string().trim().max(20),
    address: z.string().trim().max(200),
    city: z.string().trim().max(80),
    notes: z.string().trim().max(1000),
    honeypot: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().positive("Količina mora biti veća od nule."),
        }),
      )
      .min(1, "Korpa je prazna.")
      .max(100, "Porudžbina može imati najviše 100 stavki."),
  })
  .superRefine((value, ctx) => {
    const digits = value.phone.replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 15) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Unesite ispravan broj telefona.",
      });
    }
    if (value.pib && !/^\d{9}$/.test(value.pib)) {
      ctx.addIssue({
        code: "custom",
        path: ["pib"],
        message: "PIB ima 9 cifara.",
      });
    }
    if (value.honeypot) {
      ctx.addIssue({
        code: "custom",
        path: ["honeypot"],
        message: "Porudžbina nije prihvaćena.",
      });
    }
  });

export const retailOrderSchema = z
  .object({
    slug: z.string().trim().min(1),
    idempotencyKey: z.uuid("Neispravan identifikator kupovine."),
    customerName: z.string().trim().min(2, "Unesite ime i prezime.").max(120),
    email: z.email("Unesite ispravnu email adresu."),
    phone: z.string().trim().min(6, "Unesite broj telefona.").max(30),
    address: z.string().trim().min(3, "Unesite adresu isporuke.").max(200),
    city: z.string().trim().min(2, "Unesite grad.").max(80),
    notes: z.string().trim().max(1000),
    honeypot: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().positive("Količina mora biti veća od nule."),
        }),
      )
      .min(1, "Korpa je prazna.")
      .max(100, "Korpa može imati najviše 100 stavki."),
  })
  .superRefine((value, ctx) => {
    const digits = value.phone.replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 15) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Unesite ispravan broj telefona." });
    }
    if (value.honeypot) {
      ctx.addIssue({ code: "custom", path: ["honeypot"], message: "Kupovina nije prihvaćena." });
    }
  });

export function fieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function toProductInput(
  value: z.infer<typeof productFormSchema>,
  imageUrl?: string | null,
): ProductInput {
  const pricePara = parseRsdToPara(value.price);
  const salePricePara = value.salePrice ? parseRsdToPara(value.salePrice) : null;
  const minQuantity = normalizeQuantity(Number(value.minQuantity.replace(",", ".")), value.unit);
  if (pricePara === null || pricePara <= 0 || minQuantity === null || (value.salePrice && (salePricePara === null || salePricePara >= pricePara))) {
    throw new Error("Proizvod nije ispravan.");
  }

  return {
    name: value.name,
    sku: value.sku,
    description: value.description,
    categoryId: value.categoryId || null,
    newCategory: value.newCategory,
    unit: value.unit,
    pricePara,
    salePricePara,
    minQuantity,
    active: value.active,
    imageUrl,
  };
}
