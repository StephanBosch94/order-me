import { z } from "zod";

import { normalizeMb, normalizePostalCode } from "@/lib/buyer";
import { RESERVED_SLUGS } from "@/lib/constants";
import { normalizeQuantity, normalizeStockQuantity } from "@/lib/data/pricing";
import { ORDER_STATUS_VALUES, UNIT_VALUES, type ProductInput } from "@/lib/data/types";
import { parseRsdToPara } from "@/lib/format";

const slugSchema = z
  .string()
  .trim()
  .min(2, "Adresa mora imati bar 2 karaktera.")
  .max(48, "Adresa je predugačka.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Adresa može sadržati mala slova, brojeve i crtice.")
  .refine((value) => !RESERVED_SLUGS.has(value), "Ova adresa je rezervisana.");

export const employeeSchema = z.object({
  name: z.string().trim().min(2, "Unesite ime.").max(80),
  email: z.email("Unesite ispravnu email adresu."),
  password: z.string().min(8, "Lozinka mora imati bar 8 karaktera.").max(72, "Lozinka može imati najviše 72 karaktera."),
  role: z.enum(["admin", "staff"], "Izaberite ulogu."),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Unesite trenutnu lozinku."),
    nextPassword: z
      .string()
      .min(8, "Lozinka mora imati bar 8 karaktera.")
      .max(72, "Lozinka može imati najviše 72 karaktera."),
    confirmPassword: z.string().min(1, "Ponovite novu lozinku."),
  })
  .refine((value) => value.nextPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Nova lozinka i potvrda se ne poklapaju.",
  })
  .refine((value) => value.currentPassword !== value.nextPassword, {
    path: ["nextPassword"],
    message: "Nova lozinka mora biti drugačija od trenutne.",
  });

export const loginSchema = z.object({
  email: z.email("Unesite ispravnu email adresu."),
  password: z.string().min(1, "Unesite lozinku."),
  next: z.string().optional(),
});

const confirmationEmailField = z
  .string()
  .trim()
  .max(160, "Email je predugačak.")
  .transform((value) => value.toLowerCase())
  .refine((value) => value === "" || z.email().safeParse(value).success, "Unesite ispravnu email adresu.");

const signupIdentity = {
  name: z.string().trim().min(2, "Unesite ime i prezime.").max(80),
  email: z.email("Unesite ispravnu email adresu."),
  password: z.string().min(8, "Lozinka mora imati bar 8 karaktera.").max(72),
};

export const signupSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("supplier"),
    ...signupIdentity,
    audience: z.enum(["fizicka", "pravna", "oba"], "Izaberite kome prodajete."),
    organizationName: z.string().trim().min(2, "Unesite naziv firme.").max(120),
    phone: z.string().trim().max(30),
  }),
  z.object({
    kind: z.literal("buyer"),
    ...signupIdentity,
    businessName: z.string().trim().min(2, "Unesite naziv firme.").max(160),
    phone: z.string().trim().min(6, "Unesite broj telefona.").max(30),
    address: z.string().trim().min(3, "Unesite adresu.").max(200),
    city: z.string().trim().min(2, "Unesite grad.").max(80),
    pib: z.string().trim().regex(/^\d{9}$/, "PIB ima 9 cifara."),
    mb: z.string().trim().refine((value) => normalizeMb(value) !== null, "Matični broj ima 8 cifara."),
    postalCode: z.string().trim().refine((value) => normalizePostalCode(value) !== null, "Poštanski broj ima 5 cifara."),
    confirmationEmail: confirmationEmailField,
  }),
]);

const buyerPhone = z.string().trim().min(6, "Unesite broj telefona.").max(30);
const buyerName = z.string().trim().min(2, "Unesite ime i prezime.").max(80);
const buyerAddress = z.string().trim().min(3, "Unesite adresu.").max(200);
const buyerCity = z.string().trim().min(2, "Unesite grad.").max(80);

function rejectShortPhone(
  value: { phone: string },
  ctx: { addIssue: (issue: { code: "custom"; path: (string | number)[]; message: string }) => void },
) {
  const digits = value.phone.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) {
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: "Unesite ispravan broj telefona.",
    });
  }
}

export const personBuyerProfileSchema = z
  .object({
    name: buyerName,
    phone: buyerPhone,
    address: buyerAddress,
    city: buyerCity,
    postalCode: z.string().trim(),
    confirmationEmail: confirmationEmailField,
  })
  .superRefine((value, ctx) => {
    rejectShortPhone(value, ctx);
    if (!normalizePostalCode(value.postalCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: value.postalCode ? "Poštanski broj ima 5 cifara." : "Unesite poštanski broj.",
      });
    }
  });

export const companyBuyerProfileSchema = z
  .object({
    name: buyerName,
    businessName: z.string().trim().min(2, "Unesite naziv firme.").max(160),
    phone: buyerPhone,
    address: buyerAddress,
    city: buyerCity,
    pib: z.string().trim(),
    mb: z.string().trim(),
    postalCode: z.string().trim(),
    confirmationEmail: confirmationEmailField,
  })
  .superRefine((value, ctx) => {
    rejectShortPhone(value, ctx);
    if (!normalizeMb(value.mb)) {
      ctx.addIssue({
        code: "custom",
        path: ["mb"],
        message: value.mb ? "Matični broj ima 8 cifara." : "Unesite matični broj.",
      });
    }
    if (!normalizePostalCode(value.postalCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: value.postalCode ? "Poštanski broj ima 5 cifara." : "Unesite poštanski broj.",
      });
    }
    if (!/^\d{9}$/.test(value.pib)) {
      ctx.addIssue({
        code: "custom",
        path: ["pib"],
        message: value.pib ? "PIB ima 9 cifara." : "Unesite PIB.",
      });
    }
  });

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
  description: z.string().trim().max(240, "Opis može imati najviše 240 karaktera."),
  audience: z.enum(["fizicka", "pravna", "oba"], "Izaberite kome prodajete."),
});

export const customerSchema = z
  .object({
    businessName: z.string().trim().min(2, "Unesite naziv.").max(160),
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
    party: z.enum(["fizicka", "pravna"], "Izaberite da li je kupac fizičko ili pravno lice."),
    paymentTermDays: z.string().trim(),
    code: z
      .string()
      .trim()
      .max(20, "Šifra može imati najviše 20 karaktera.")
      .transform((value) => value.toUpperCase())
      .refine(
        (value) => value === "" || /^[A-Z0-9][A-Z0-9-]*$/.test(value),
        "Šifra može da sadrži slova, brojeve i crtu.",
      ),
  })
  .superRefine((value, ctx) => {
    if (value.party !== "pravna") return;
    if (!/^\d+$/.test(value.paymentTermDays) || Number(value.paymentTermDays) > 365) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentTermDays"],
        message: "Odloženo plaćanje unesite kao broj dana od 0 do 365.",
      });
    }
  })
  .transform((value) => ({
    businessName: value.businessName,
    contactName: value.contactName,
    email: value.email,
    phone: value.phone,
    pib: value.pib,
    address: value.address,
    city: value.city,
    notes: value.notes,
    party: value.party,
    paymentTermDays: value.party === "pravna" ? Number(value.paymentTermDays) : 0,
    code: value.code,
  }));

export const newCustomerSchema = z
  .object({
    businessName: z.string().trim().min(2, "Unesite naziv.").max(160),
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
    party: z.enum(["fizicka", "pravna"], "Izaberite da li je kupac fizičko ili pravno lice."),
    paymentTermDays: z.string().trim(),
    code: z
      .string()
      .trim()
      .max(20, "Šifra može imati najviše 20 karaktera.")
      .transform((value) => value.toUpperCase())
      .refine(
        (value) => value === "" || /^[A-Z0-9][A-Z0-9-]*$/.test(value),
        "Šifra može da sadrži slova, brojeve i crtu.",
      ),
  })
  .superRefine((value, ctx) => {
    if (value.party !== "pravna") return;
    if (!/^\d+$/.test(value.paymentTermDays) || Number(value.paymentTermDays) > 365) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentTermDays"],
        message: "Odloženo plaćanje unesite kao broj dana od 0 do 365.",
      });
    }
  })
  .transform((value) => ({
    businessName: value.businessName,
    contactName: value.contactName,
    email: value.email,
    phone: value.phone,
    pib: value.pib,
    address: value.address,
    city: value.city,
    notes: value.notes,
    party: value.party,
    paymentTermDays: value.party === "pravna" ? Number(value.paymentTermDays) : 0,
    code: value.code,
  }));

export const staffOrderSchema = z.object({
  customerId: z.string().trim().min(1, "Izaberite kupca."),
  notes: z.string().trim().max(1000),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1, "Izaberite proizvod."),
        quantity: z.number(),
      }),
    )
    .min(1, "Dodajte bar jednu stavku.")
    .max(100, "Porudžbina može imati najviše 100 stavki."),
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
    stockQuantity: z.string().trim().min(1, "Unesite stanje u magacinu."),
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
    const stock = Number(value.stockQuantity.replace(",", "."));
    if (normalizeStockQuantity(stock, value.unit) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["stockQuantity"],
        message: "Stanje u magacinu nije ispravno za izabranu jedinicu.",
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
    if (!/^\d{9}$/.test(value.pib)) {
      ctx.addIssue({
        code: "custom",
        path: ["pib"],
        message: value.pib ? "PIB ima 9 cifara." : "Unesite PIB.",
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

export const businessOrderSchema = z
  .object({
    slug: z.string().trim().min(1),
    idempotencyKey: z.uuid("Neispravan identifikator kupovine."),
    notes: z.string().trim().max(1000),
    mb: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),
    bankAccount: z.string().trim().optional(),
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
    if (value.honeypot) {
      ctx.addIssue({ code: "custom", path: ["honeypot"], message: "Kupovina nije prihvaćena." });
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
    postalCode: z.string().trim(),
    city: z.string().trim().min(2, "Unesite grad.").max(80),
    notes: z.string().trim().max(1000),
    paymentMethod: z.enum(["pouzecem", "ips", "racun"], "Izaberite način plaćanja."),
    company: z.boolean().optional(),
    businessName: z.string().trim().max(160).optional(),
    pib: z.string().trim().max(20).optional(),
    mb: z.string().trim().max(20).optional(),
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
    if (!normalizePostalCode(value.postalCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: value.postalCode ? "Poštanski broj ima 5 cifara." : "Unesite poštanski broj.",
      });
    }
    if (value.company) {
      if (value.paymentMethod !== "racun") {
        ctx.addIssue({ code: "custom", path: ["paymentMethod"], message: "Pravno lice plaća na račun." });
      }
      const businessName = value.businessName?.trim() ?? "";
      const pib = (value.pib ?? "").replace(/\D/g, "");
      if (businessName.length < 2) {
        ctx.addIssue({ code: "custom", path: ["businessName"], message: "Unesite naziv firme." });
      }
      if (!/^\d{9}$/.test(pib)) {
        ctx.addIssue({ code: "custom", path: ["pib"], message: pib ? "PIB ima 9 cifara." : "Unesite PIB." });
      }
      if (!normalizeMb(value.mb ?? "")) {
        ctx.addIssue({
          code: "custom",
          path: ["mb"],
          message: value.mb?.trim() ? "Matični broj ima 8 cifara." : "Unesite matični broj.",
        });
      }
    } else if (value.paymentMethod === "racun") {
      ctx.addIssue({ code: "custom", path: ["paymentMethod"], message: "Izaberite način plaćanja." });
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
  const stockQuantity = normalizeStockQuantity(Number(value.stockQuantity.replace(",", ".")), value.unit);
  if (
    pricePara === null ||
    pricePara <= 0 ||
    minQuantity === null ||
    stockQuantity === null ||
    (value.salePrice && (salePricePara === null || salePricePara >= pricePara))
  ) {
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
    stockQuantity,
    active: value.active,
    imageUrl,
  };
}
