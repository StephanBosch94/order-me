import { createHash } from "node:crypto";

import { nextCustomerCode } from "@/lib/customers";
import { DEMO_INBOX } from "@/lib/demo-shops";
import { effectivePricePara } from "@/lib/data/pricing";
import { belgradeYear, currentBelgradeMonthKey } from "@/lib/format";
import { hashPassword } from "@/lib/password";
import { PRODUCTION_LOGINS } from "@/lib/production-logins";
import type {
  Category,
  Customer,
  InvoiceStatus,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  Organization,
  PlatformInvoice,
  Product,
  Subscription,
  SubscriptionPlan,
  SupplierNote,
  Unit,
} from "@/lib/data/types";

export type DemoUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  kind: "supplier" | "buyer" | "platform";
  businessName: string;
  phone: string;
  address: string;
  city: string;
  pib: string;
  mb?: string;
  postalCode?: string;
  bankAccount: string;
  confirmationEmail?: string;
  createdAt: string;
};

export type DemoSession = {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
};

export type DemoMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: "owner" | "admin" | "staff";
  createdAt: string;
};

/** Bump when demo IDs change so serverless copies of the seed are rebuilt. */
export const SEED_GENERATION = 2;

export function seedId(key: string) {
  const hash = createHash("sha1").update(`prodora-seed:${key}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type DemoDatabase = {
  version: 1;
  seedGeneration?: number;
  users: DemoUser[];
  sessions: DemoSession[];
  organizations: Organization[];
  members: DemoMembership[];
  categories: Category[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  orderItems: OrderItem[];
  statusHistory: OrderStatusEvent[];
  rateLimits: { key: string; hits: number[] }[];
  plans: SubscriptionPlan[];
  subscriptions: Subscription[];
  invoices: PlatformInvoice[];
  supplierNotes: SupplierNote[];
};

export const DEMO_EMAIL = "ana@mesarapajic.rs";
export const RETAIL_DEMO_EMAIL = "vera@mercisatelier.rs";
export const BUSINESS_BUYER_EMAIL = "marko@restorandunav.rs";
export const RETAIL_BUYER_EMAIL = "jovana@mercisatelier.rs";
export const PLATFORM_ADMIN_EMAIL = "admin@prodora.rs";
export const DEMO_PASSWORD = "poruci-demo";
const BUSINESS_BUYER_ACCOUNT = "160-0000000011111-45";

export function emptyDatabase(): DemoDatabase {
  return {
    version: 1,
    seedGeneration: SEED_GENERATION,
    users: [],
    sessions: [],
    organizations: [],
    members: [],
    categories: [],
    products: [],
    customers: [],
    orders: [],
    orderItems: [],
    statusHistory: [],
    rateLimits: [],
    plans: [],
    subscriptions: [],
    invoices: [],
    supplierNotes: [],
  };
}

function ago(days: number, hours = 0) {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000).toISOString();
}

export async function createSeedDatabase(): Promise<DemoDatabase> {
  const now = new Date().toISOString();
  const year = belgradeYear(now);
  const userId = seedId("user:ana@gastrosupply.rs");
  const orgId = seedId("org:gastro-supply");
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const organization: Organization = {
    id: orgId,
    name: MEAT_SHOP_NAME,
    slug: "mesara-pajic",
    email: "porudzbine@mesarapajic.rs",
    notificationEmail: DEMO_INBOX,
    phone: "+381 21 555 0142",
    address: "Jarmočna 20",
    city: "Bački Petrovac",
    pib: "109876543",
    mb: "21456789",
    logoUrl: "/suppliers/mesara-pajic-logo.jpg",
    brandColor: MEAT_BRAND_COLOR,
    coverUrl: "/products/mesara-pajic-cover.jpg",
    description: MEAT_DESCRIPTION,
    trade: "mesara",
    channel: "b2c",
    audience: "oba",
    orderPrefix: "PU",
    nextOrderNumber: 1001,
    active: true,
    publicStore: true,
    trackStock: false,
    efakturaApiKey: "",
    efakturaEnabled: false,
    efakturaEnvironment: "demo",
    createdAt: ago(120),
    updatedAt: now,
  };

  const { categories, products } = gastroCatalog(orgId, ago(80));

  const bySku = (sku: string) => products.find((product) => product.sku === sku)!;

  const customerDefs = [
    {
      businessName: "Restoran Dunav",
      contactName: "Marko Jović",
      email: "marko@restorandunav.rs",
      phone: "+381 63 111 2200",
      pib: "108765432",
      address: "Bulevar kralja Aleksandra 142",
      city: "Beograd",
    },
    {
      businessName: "Kafić Luna",
      contactName: "Jelena Ilić",
      email: "jelena@kaficluna.rs",
      phone: "+381 64 222 3311",
      pib: "107654321",
      address: "Zmaj Jovina 12",
      city: "Novi Sad",
    },
    {
      businessName: "Pekara Zrno",
      contactName: "Stefan Nikolić",
      email: "stefan@pekarazrno.rs",
      phone: "+381 65 333 4400",
      pib: "106543210",
      address: "Obrenovićeva 8",
      city: "Niš",
    },
    {
      businessName: "Market 22",
      contactName: "Ivana Stojanović",
      email: "ivana@market22.rs",
      phone: "+381 60 444 5500",
      pib: "105432109",
      address: "Kralja Petra 22",
      city: "Kragujevac",
    },
  ];

  const customers: Customer[] = customerDefs.map((customer, index) => ({
    id: seedId(`customer:gastro-supply:${customer.email}`),
    organizationId: orgId,
    ...customer,
    code: `K-${String(index + 1).padStart(4, "0")}`,
    party: "pravna",
    paymentTermDays: 15,
    sefRegistered: false,
    notes: "",
    createdAt: ago(60),
    updatedAt: ago(2),
  }));

  customers.push(
    {
      id: seedId("customer:gastro-supply:milica.radic@example.com"),
      organizationId: orgId,
      businessName: "Milica Radić",
      contactName: "Milica Radić",
      email: "milica.radic@example.com",
      phone: "+381 69 441 2280",
      pib: "",
      address: "Apatinski put 14",
      city: "Sombor",
      notes: "",
      code: "K-0005",
      party: "fizicka",
      paymentTermDays: 0,
      sefRegistered: false,
      createdAt: ago(40),
      updatedAt: ago(2),
    },
    {
      id: seedId("customer:gastro-supply:nikola.jovanovic@example.com"),
      organizationId: orgId,
      businessName: "Nikola Jovanović",
      contactName: "Nikola Jovanović",
      email: "nikola.jovanovic@example.com",
      phone: "+381 64 220 1188",
      pib: "",
      address: "Cara Dušana 9",
      city: "Novi Sad",
      notes: "",
      code: "K-0006",
      party: "fizicka",
      paymentTermDays: 0,
      sefRegistered: false,
      createdAt: ago(25),
      updatedAt: ago(2),
    },
  );

  const orders: Order[] = [];
  const orderItems: OrderItem[] = [];
  const statusHistory: OrderStatusEvent[] = [];

  const addOrder = (input: {
    customer: string;
    lines: Array<[string, number]>;
    status: OrderStatus;
    createdAt: string;
    notes: string;
    confirmed?: boolean;
    payment?: Order["paymentMethod"];
  }) => {
    const customer = customers.find((item) => item.businessName === input.customer)!;
    const number = `${organization.orderPrefix}-${year}-${String(organization.nextOrderNumber).padStart(4, "0")}`;
    organization.nextOrderNumber += 1;
    const items = input.lines.map(([sku, quantity]) => {
      const product = bySku(sku);
      const lineTotalPara = Math.round(product.pricePara * quantity);
      return {
        id: seedId(`item:${number}:${sku}`),
        orderId: "",
        organizationId: orgId,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity,
        unitPricePara: product.pricePara,
        lineTotalPara,
      } satisfies OrderItem;
    });
    const totalPara = items.reduce((sum, item) => sum + item.lineTotalPara, 0);
    const orderId = seedId(`order:${number}`);
    for (const item of items) item.orderId = orderId;
    const order: Order = {
      id: orderId,
      organizationId: orgId,
      customerId: customer.id,
      buyerUserId: null,
      number,
      status: input.status,
      notes: input.notes,
      subtotalPara: totalPara,
      totalPara,
      idempotencyKey: seedId(`idem:${number}`),
      confirmationToken: seedId(`confirm:${number}`),
      paymentMethod: input.payment ?? null,
      customerSnapshot: {
        code: customer.code,
        businessName: customer.businessName,
        contactName: customer.contactName,
        email: customer.email,
        phone: customer.phone,
        pib: customer.pib,
        mb: "",
        address: customer.address,
        postalCode: "",
        city: customer.city,
        bankAccount: "",
      },
      customerEmailStatus: "skipped",
      supplierEmailStatus: "skipped",
      sefInvoiceId: null,
      sefStatus: null,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    orders.push(order);
    orderItems.push(...items);
    statusHistory.push({
      id: seedId(`status:${number}:nova`),
      orderId,
      organizationId: orgId,
      fromStatus: null,
      toStatus: "nova",
      actorName: "Sistem",
      createdAt: input.createdAt,
    });
    if (input.status !== "nova") {
      statusHistory.push({
        id: seedId(`status:${number}:${input.status}`),
        orderId,
        organizationId: orgId,
        fromStatus: "nova",
        toStatus: input.status,
        actorName: "Ana Petrović",
        createdAt: new Date(new Date(input.createdAt).getTime() + 45 * 60 * 1000).toISOString(),
      });
    }
  };

  for (const spec of GASTRO_DEMO_ORDERS) {
    addOrder({
      customer: spec.customer,
      lines: spec.lines,
      status: spec.status,
      createdAt: ago(spec.days, spec.hours),
      notes: spec.notes,
      payment: spec.payment,
    });
  }

  const database: DemoDatabase = {
    version: 1,
    seedGeneration: SEED_GENERATION,
    users: [
      {
        id: userId,
        email: DEMO_EMAIL,
        name: "Ana Petrović",
        passwordHash,
        kind: "supplier",
        businessName: "",
        phone: "",
        address: "",
        city: "",
        pib: "",
        bankAccount: "",
        createdAt: ago(120),
      },
    ],
    sessions: [],
    organizations: [organization],
    members: [
      {
        id: seedId("member:gastro-supply:ana"),
        organizationId: orgId,
        userId,
        role: "owner",
        createdAt: ago(120),
      },
    ],
    categories,
    products,
    customers,
    orders,
    orderItems,
    statusHistory,
    rateLimits: [],
    plans: [],
    subscriptions: [],
    invoices: [],
    supplierNotes: [],
  };
  await ensureRetailDemo(database);
  return database;
}

const BOUTIQUE_SLUG = "mercis-atelier";
const LEGACY_BOUTIQUE_SLUG = "butik-vera";
const MEAT_SLUG = "mesara-pajic";
const LEGACY_MEAT_SLUG = "gastro-supply";
const CLOTHING_SKUS = new Set(["BV-KAPUT", "BV-HALJ", "BV-KOS", "BV-MAJ", "BV-JAK", "BV-MIN"]);

const DEMO_SALE_PRICES: Record<string, number> = {
  "MA-BIS": 890_000,
};

const DEMO_PRODUCT_PHOTOS: Record<string, string> = {
  "MP-BUT": "/products/mp-sveze.jpg",
  "MP-VRT": "/products/mp-sveze.jpg",
  "MP-PLC": "/products/mp-sveze.jpg",
  "MP-SSL": "/products/mp-sveze.jpg",
  "MP-PKO": "/products/mp-kobasica.jpg",
  "MP-SKOB": "/products/mp-kobasica.jpg",
  "MP-KUL": "/products/mp-suvo.jpg",
  "MP-PEC": "/products/mp-suvo.jpg",
  "MP-SVR": "/products/mp-suvo.jpg",
  "MP-DSL": "/products/mp-suvo.jpg",
  "MP-CVA": "/products/mp-cvarci.jpg",
};

const DEMO_GALLERIES: Record<string, string[]> = {
  "MP-BUT": ["/products/mp-sveze.jpg"],
  "MP-VRT": ["/products/mp-sveze.jpg"],
  "MP-PLC": ["/products/mp-sveze.jpg"],
  "MP-SSL": ["/products/mp-sveze.jpg"],
  "MP-PKO": ["/products/mp-kobasica.jpg"],
  "MP-SKOB": ["/products/mp-kobasica.jpg"],
  "MP-KUL": ["/products/mp-suvo.jpg"],
  "MP-PEC": ["/products/mp-suvo.jpg"],
  "MP-SVR": ["/products/mp-suvo.jpg"],
  "MP-DSL": ["/products/mp-suvo.jpg"],
  "MP-CVA": ["/products/mp-cvarci.jpg"],
};

function galleryFor(sku: string, fallback: string) {
  return DEMO_GALLERIES[sku] ?? [fallback];
}

export function applyDemoGalleries(db: DemoDatabase) {
  let changed = false;
  for (const product of db.products) {
    const gallery = DEMO_GALLERIES[product.sku];
    if (!gallery) continue;
    const current = product.imageUrls ?? [];
    const same =
      product.imageUrl === gallery[0] &&
      current.length === gallery.length &&
      gallery.every((url, index) => current[index] === url);
    if (same) continue;
    product.imageUrl = gallery[0];
    product.imageUrls = [...gallery];
    changed = true;
  }
  return changed;
}

export function applyDemoPhotos(db: DemoDatabase) {
  let changed = false;
  for (const product of db.products) {
    const photo = DEMO_PRODUCT_PHOTOS[product.sku];
    if (!photo || !product.imageUrl?.endsWith(".svg")) continue;
    product.imageUrl = photo;
    changed = true;
  }
  return changed;
}

function backfillBoutiqueSales(db: DemoDatabase, organizationId: string) {
  let changed = false;
  for (const product of db.products) {
    if (product.organizationId !== organizationId) continue;
    const demoSale = DEMO_SALE_PRICES[product.sku];
    if (demoSale !== undefined && product.salePricePara == null && demoSale < product.pricePara) {
      product.salePricePara = demoSale;
      changed = true;
      continue;
    }
    if (product.salePricePara === undefined) {
      product.salePricePara = null;
      changed = true;
    }
  }
  return changed;
}

function fillBoutique(organization: Organization, now: string) {
  organization.name = "Mercis Atelier";
  organization.slug = BOUTIQUE_SLUG;
  organization.email = "porudzbine@mercisatelier.rs";
  organization.notificationEmail = DEMO_INBOX;
  organization.phone = "+381 11 555 0190";
  organization.address = "Kursulina 39";
  organization.city = "Beograd";
  organization.brandColor = "#1c1917";
  organization.logoUrl = "/suppliers/mercis-atelier.svg";
  organization.audience = "fizicka";
  organization.channel = "b2c";
  organization.orderPrefix = "BV";
  organization.updatedAt = now;
}

function boutiqueCatalog(organizationId: string, now: string) {
  const earrings: Category = {
    id: seedId("category:butik-vera:mindjuse"),
    organizationId,
    name: "Minđuše",
    sortOrder: 1,
    createdAt: now,
  };
  const necklaces: Category = {
    id: seedId("category:butik-vera:ogrlice"),
    organizationId,
    name: "Ogrlice",
    sortOrder: 2,
    createdAt: now,
  };
  const rings: Category = {
    id: seedId("category:butik-vera:prstenje"),
    organizationId,
    name: "Prstenje",
    sortOrder: 3,
    createdAt: now,
  };
  const piece = (
    categoryId: string,
    name: string,
    sku: string,
    description: string,
    pricePara: number,
    salePricePara: number | null,
    imageUrl: string,
  ): Product => ({
    id: seedId(`product:butik-vera:${sku}`),
    organizationId,
    categoryId,
    name,
    sku,
    description,
    unit: "komad",
    pricePara,
    salePricePara,
    imageUrl,
    imageUrls: galleryFor(sku, imageUrl),
    active: true,
    minQuantity: 1,
    stockQuantity: demoStock(sku),
    createdAt: now,
    updatedAt: now,
  });
  const items: Product[] = [
    piece(earrings.id, "Minđuše alke", "MA-ALK", "Ručno rađene alke od fine žice, mogu da nose ime ili inicijal.", 1_112_000, null, "/products/ma-mindjuse.svg"),
    piece(earrings.id, "Minđuše sa biserom", "MA-BIS", "Male alke sa rečnim biserom, rad ateljea.", 980_000, 890_000, "/products/ma-mindjuse.svg"),
    piece(necklaces.id, "Ogrlica Love", "MA-LOVE", "Lanac sa rečju Love, ručno oblikovan.", 712_000, null, "/products/ma-ogrlica.svg"),
    piece(necklaces.id, "Ogrlica sa imenom", "MA-IME", "Ime ili nadimak na lancu, radi se u ateljeu.", 1_112_000, null, "/products/ma-ogrlica.svg"),
    piece(rings.id, "Prsten sa inicijalom", "MA-PRS", "Prsten od fine žice sa jednim slovom.", 890_000, null, "/products/ma-prsten.svg"),
    piece(rings.id, "Prsten timeless", "MA-TIM", "Tanka alka, nosi se sama ili u paru.", 760_000, null, "/products/ma-prsten.svg"),
    piece(rings.id, "Narukvica od žice", "MA-NAR", "Otvorena narukvica, ručni rad.", 640_000, null, "/products/ma-narukvica.svg"),
    piece(rings.id, "Dečija narukvica", "MA-DEC", "Meka narukvica koja se produžava, za poklon.", 540_000, null, "/products/ma-narukvica.svg"),
  ];
  return { categories: [earrings, necklaces, rings], items };
}

/** Plausible on-hand amounts for the demo catalog. Applied only when a product has no stock yet. */
const DEMO_STOCK: Record<string, number> = {
  "MP-BUT": 48,
  "MP-VRT": 36,
  "MP-PLC": 42,
  "MP-SSL": 28,
  "MP-PKO": 22,
  "MP-SKOB": 18,
  "MP-KUL": 14,
  "MP-PEC": 9,
  "MP-SVR": 11,
  "MP-DSL": 16,
  "MP-CVA": 8,
  "MA-ALK": 12,
  "MA-BIS": 6,
  "MA-LOVE": 9,
  "MA-IME": 4,
  "MA-PRS": 15,
  "MA-TIM": 20,
  "MA-NAR": 11,
  "MA-DEC": 7,
};

function demoStock(sku: string) {
  return DEMO_STOCK[sku] ?? 0;
}

export function applyDemoStock(db: DemoDatabase) {
  let changed = false;
  for (const product of db.products) {
    if (typeof product.stockQuantity === "number" && Number.isFinite(product.stockQuantity) && product.stockQuantity >= 0) {
      continue;
    }
    product.stockQuantity = demoStock(product.sku);
    changed = true;
  }
  return changed;
}

const MEAT_SHOP_NAME = "Mesara Pajić";
const MEAT_BRAND_COLOR = "#0c1f2e";
const MEAT_DESCRIPTION = "Sveže meso, petrovački kulen i kobasice iz Bačkog Petrovca.";
const PREVIOUS_MEAT_LOGOS = new Set(["/suppliers/gastro-supply.svg", "/suppliers/mesara-pajic.svg"]);
const PREVIOUS_MEAT_COVERS = new Set(["/products/mp-suvo.jpg"]);
const PREVIOUS_MEAT_DESCRIPTIONS = new Set(["Petrovački kulen, kobasice i suvo meso iz Bačkog Petrovca."]);
const PACKAGING_SKUS = new Set([
  "KB-4030",
  "PC-025",
  "PC-040",
  "PK-CAP",
  "SV-3333",
  "UB-2SL",
  "KS-RUC",
  "AF-50",
  "PF-300",
  "OD-5L",
  "TS-1L",
  "RK-NIT",
  "SC-1KG",
  "KF-1KG",
]);

const MEAT_PRODUCTS: Array<{
  sku: string;
  name: string;
  category: "Sveže meso" | "Kobasice" | "Suhomesnato";
  unit: Unit;
  pricePara: number;
  minQuantity: number;
  description: string;
}> = [
  {
    sku: "MP-BUT",
    name: "Svinjski but",
    category: "Sveže meso",
    unit: "kilogram",
    pricePara: 78_000,
    minQuantity: 0.5,
    description: "Svež svinjski but za pečenje i kuvanje.",
  },
  {
    sku: "MP-VRT",
    name: "Svinjski vrat",
    category: "Sveže meso",
    unit: "kilogram",
    pricePara: 92_000,
    minQuantity: 0.5,
    description: "Svež vrat, za roštilj i dugo pečenje.",
  },
  {
    sku: "MP-PLC",
    name: "Svinjska plećka",
    category: "Sveže meso",
    unit: "kilogram",
    pricePara: 69_000,
    minQuantity: 0.5,
    description: "Sveža plećka od svinja iz sopstvenog uzgoja.",
  },
  {
    sku: "MP-SSL",
    name: "Sveža slanina",
    category: "Sveže meso",
    unit: "kilogram",
    pricePara: 64_000,
    minQuantity: 0.5,
    description: "Sveža leđna slanina, meri se po kilogramu.",
  },
  {
    sku: "MP-PKO",
    name: "Petrovačka kobasica",
    category: "Kobasice",
    unit: "kilogram",
    pricePara: 145_000,
    minQuantity: 0.5,
    description: "Kobasica sa začinskom paprikom, kimom i belim lukom, bez aditiva.",
  },
  {
    sku: "MP-SKOB",
    name: "Suva kobasica",
    category: "Kobasice",
    unit: "komad",
    pricePara: 89_000,
    minQuantity: 1,
    description: "Suva kobasica, jedan komad vezan kanapom.",
  },
  {
    sku: "MP-KUL",
    name: "Petrovački kulen",
    category: "Suhomesnato",
    unit: "kilogram",
    pricePara: 185_000,
    minQuantity: 0.5,
    description: "Kulen u prirodnom crevu, paprika iz Bačkog Petrovca, bez aditiva.",
  },
  {
    sku: "MP-PEC",
    name: "Suva pečenica",
    category: "Suhomesnato",
    unit: "kilogram",
    pricePara: 210_000,
    minQuantity: 0.5,
    description: "Sušena pečenica, samo so i dim.",
  },
  {
    sku: "MP-SVR",
    name: "Suvi vrat",
    category: "Suhomesnato",
    unit: "kilogram",
    pricePara: 195_000,
    minQuantity: 0.5,
    description: "Sušeni vrat, seče se po želji kupca.",
  },
  {
    sku: "MP-DSL",
    name: "Domaća slanina",
    category: "Suhomesnato",
    unit: "kilogram",
    pricePara: 125_000,
    minQuantity: 0.5,
    description: "Dimljena i sušena slanina.",
  },
  {
    sku: "MP-CVA",
    name: "Čvarci",
    category: "Suhomesnato",
    unit: "kilogram",
    pricePara: 135_000,
    minQuantity: 0.5,
    description: "Domaći čvarci, hrskavi, po kilogramu.",
  },
];

const GASTRO_DEMO_ORDERS: Array<{
  suffix: string;
  customer: string;
  lines: Array<[string, number]>;
  status: OrderStatus;
  days: number;
  hours: number;
    notes: string;
    payment?: Order["paymentMethod"];
  }> = [
  {
    suffix: "1001",
    customer: "Restoran Dunav",
    lines: [
      ["MP-BUT", 8],
      ["MP-KUL", 1.5],
      ["MP-SKOB", 4],
    ],
    status: "nova",
    days: 0,
    hours: 2,
    notes: "Molimo isporuku pre 11 časova.",
  },
  {
    suffix: "1002",
    customer: "Kafić Luna",
    lines: [
      ["MP-CVA", 2],
      ["MP-PKO", 1],
      ["MP-SVR", 1],
    ],
    status: "nova",
    days: 16,
    hours: 3,
    notes: "",
  },
  {
    suffix: "1003",
    customer: "Market 22",
    lines: [
      ["MP-VRT", 15],
      ["MP-PLC", 10],
    ],
    status: "potvrdjena",
    days: 3,
    hours: 5,
    notes: "Dostava na magacin, ulaz iz dvorišta.",
  },
  {
    suffix: "1004",
    customer: "Pekara Zrno",
    lines: [
      ["MP-SSL", 6],
      ["MP-CVA", 3],
      ["MP-SKOB", 4],
    ],
    status: "potvrdjena",
    days: 18,
    hours: 4,
    notes: "",
  },
  {
    suffix: "1005",
    customer: "Market 22",
    lines: [
      ["MP-SVR", 4],
      ["MP-DSL", 5],
      ["MP-KUL", 2],
    ],
    status: "u_pripremi",
    days: 5,
    hours: 2,
    notes: "Cela komada, bez sečenja.",
  },
  {
    suffix: "1006",
    customer: "Restoran Dunav",
    lines: [
      ["MP-BUT", 12],
      ["MP-PEC", 2],
      ["MP-DSL", 3],
    ],
    status: "isporucena",
    days: 10,
    hours: 6,
    notes: "",
  },
  {
    suffix: "1007",
    customer: "Kafić Luna",
    lines: [
      ["MP-CVA", 1.5],
      ["MP-KUL", 0.5],
      ["MP-SKOB", 2],
    ],
    status: "isporucena",
    days: 31,
    hours: 1,
    notes: "",
  },
  {
    suffix: "1008",
    customer: "Pekara Zrno",
    lines: [["MP-VRT", 4]],
    status: "otkazana",
    days: 20,
    hours: 4,
    notes: "Kupac je otkazao jer je stigla druga isporuka.",
  },
  {
    suffix: "1009",
    customer: "Milica Radić",
    lines: [
      ["MP-KUL", 0.5],
      ["MP-PKO", 1],
    ],
    status: "isporucena",
    days: 1,
    hours: 3,
    notes: "",
    payment: "pouzecem",
  },
  {
    suffix: "1010",
    customer: "Nikola Jovanović",
    lines: [["MP-CVA", 0.5]],
    status: "potvrdjena",
    days: 4,
    hours: 2,
    notes: "",
    payment: "ips",
  },
];

function gastroCatalog(organizationId: string, createdAt: string) {
  const names = ["Sveže meso", "Kobasice", "Suhomesnato"] as const;
  const categories: Category[] = names.map((name, index) => ({
    id: seedId(`category:gastro-supply:${name}`),
    organizationId,
    name,
    sortOrder: index + 1,
    createdAt,
  }));
  const categoryId = (name: string) => categories.find((category) => category.name === name)!.id;
  const products: Product[] = MEAT_PRODUCTS.map((product) => {
    const gallery = galleryFor(product.sku, DEMO_PRODUCT_PHOTOS[product.sku] ?? "/products/mp-sveze.jpg");
    return {
      id: seedId(`product:gastro-supply:${product.sku}`),
      organizationId,
      categoryId: categoryId(product.category),
      name: product.name,
      sku: product.sku,
      description: product.description,
      unit: product.unit,
      pricePara: product.pricePara,
      salePricePara: null,
      imageUrl: gallery[0] ?? null,
      imageUrls: gallery,
      active: true,
      minQuantity: product.minQuantity,
      stockQuantity: demoStock(product.sku),
      createdAt,
      updatedAt: createdAt,
    };
  });
  return { categories, products };
}

function ensureMeatShop(db: DemoDatabase) {
  const organization = db.organizations.find((item) => item.slug === MEAT_SLUG || item.slug === LEGACY_MEAT_SLUG);
  if (!organization) return false;
  let changed = false;
  const now = new Date().toISOString();
  if (organization.slug !== MEAT_SLUG) {
    organization.slug = MEAT_SLUG;
    changed = true;
  }
  if (organization.email !== "porudzbine@mesarapajic.rs") {
    organization.email = "porudzbine@mesarapajic.rs";
    changed = true;
  }
  if (organization.notificationEmail !== DEMO_INBOX) {
    organization.notificationEmail = DEMO_INBOX;
    changed = true;
  }
  const legacyName = organization.name === "Pult" || organization.name === "Gastro Supply";
  if (legacyName || organization.name === "Mala mesara Pajić") {
    organization.name = MEAT_SHOP_NAME;
    changed = true;
  }
  if (organization.city === "Novi Sad" && organization.address === "Bulevar oslobođenja 88") {
    organization.city = "Bački Petrovac";
    organization.address = "Jarmočna 20";
    changed = true;
  }
  if (organization.brandColor === "#14532d" || organization.brandColor === "#7a1f2b") {
    organization.brandColor = MEAT_BRAND_COLOR;
    changed = true;
  }
  if (!organization.logoUrl || PREVIOUS_MEAT_LOGOS.has(organization.logoUrl)) {
    organization.logoUrl = "/suppliers/mesara-pajic-logo.jpg";
    changed = true;
  }
  if (organization.coverUrl === undefined || (organization.coverUrl !== null && PREVIOUS_MEAT_COVERS.has(organization.coverUrl))) {
    organization.coverUrl = "/products/mesara-pajic-cover.jpg";
    changed = true;
  }
  if (organization.description === undefined || PREVIOUS_MEAT_DESCRIPTIONS.has(organization.description)) {
    organization.description = MEAT_DESCRIPTION;
    changed = true;
  }
  if (changed) organization.updatedAt = now;

  const orgProducts = db.products.filter((product) => product.organizationId === organization.id);
  const hasPackaging = orgProducts.some((product) => PACKAGING_SKUS.has(product.sku));
  const missingMeat = MEAT_PRODUCTS.some((product) => !orgProducts.some((item) => item.sku === product.sku && item.active));
  if (hasPackaging || (legacyName && missingMeat)) {
    const catalog = gastroCatalog(organization.id, organization.createdAt);
    db.categories = [
      ...db.categories.filter((category) => category.organizationId !== organization.id),
      ...catalog.categories,
    ];
    db.products = [
      ...db.products.filter((product) => product.organizationId !== organization.id),
      ...catalog.products,
    ];
    changed = true;
  }

  const bySku = new Map(
    db.products.filter((product) => product.organizationId === organization.id).map((product) => [product.sku, product]),
  );
  for (const order of db.orders) {
    if (order.organizationId !== organization.id) continue;
    if (order.notes === "Rukavice u veličini M.") {
      order.notes = "Cela komada, bez sečenja.";
      changed = true;
    }
    const items = db.orderItems.filter((item) => item.orderId === order.id);
    if (!items.some((item) => PACKAGING_SKUS.has(item.sku))) continue;
    const suffix = order.number.match(/(\d{4})$/)?.[1] ?? "";
    const spec = GASTRO_DEMO_ORDERS.find((item) => item.suffix === suffix);
    const lines = spec?.lines ?? [["MP-BUT", 2]];
    const nextItems: OrderItem[] = [];
    for (const [sku, quantity] of lines) {
      const product = bySku.get(sku);
      if (!product) continue;
      const lineTotalPara = Math.round(product.pricePara * quantity);
      nextItems.push({
        id: seedId(`item:${order.number}:${sku}`),
        orderId: order.id,
        organizationId: organization.id,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity,
        unitPricePara: product.pricePara,
        lineTotalPara,
      });
    }
    if (nextItems.length === 0) continue;
    db.orderItems = db.orderItems.filter((item) => item.orderId !== order.id);
    db.orderItems.push(...nextItems);
    const totalPara = nextItems.reduce((sum, item) => sum + item.lineTotalPara, 0);
    order.subtotalPara = totalPara;
    order.totalPara = totalPara;
    changed = true;
  }
  return changed;
}

function renameUserEmail(db: DemoDatabase, from: string, to: string) {
  const user = db.users.find((item) => item.email === from);
  if (!user || db.users.some((item) => item.email === to)) return false;
  user.email = to;
  for (const customer of db.customers) {
    if (customer.email === from) customer.email = to;
  }
  for (const order of db.orders) {
    if (order.customerSnapshot.email === from) order.customerSnapshot.email = to;
  }
  return true;
}

function ensureJewelryShop(db: DemoDatabase) {
  let changed = false;
  let organization =
    db.organizations.find((item) => item.slug === BOUTIQUE_SLUG || item.slug === LEGACY_BOUTIQUE_SLUG) ??
    db.organizations.find((item) => item.slug === "kafa-kutak");
  const now = new Date().toISOString();
  if (!organization) {
    organization = {
      id: seedId("org:butik-vera"),
      name: "Mercis Atelier",
      slug: BOUTIQUE_SLUG,
      email: "",
      notificationEmail: "",
      phone: "",
      address: "",
      city: "",
      pib: "",
      mb: "",
      logoUrl: null,
      brandColor: null,
      coverUrl: "/products/ma-ogrlica.svg",
      description: "Ručno rađen nakit iz ateljea u Beogradu.",
      trade: "nakit",
      channel: "b2c",
      audience: "fizicka",
      orderPrefix: "BV",
      nextOrderNumber: 1001,
      active: true,
      publicStore: true,
      trackStock: false,
      efakturaApiKey: "",
      efakturaEnabled: false,
      efakturaEnvironment: "demo",
      createdAt: now,
      updatedAt: now,
    };
    db.organizations.push(organization);
    changed = true;
  }
  const identity = `${organization.name}|${organization.slug}|${organization.email}|${organization.city}|${organization.logoUrl}|${organization.notificationEmail}`;
  fillBoutique(organization, now);
  if (identity !== `${organization.name}|${organization.slug}|${organization.email}|${organization.city}|${organization.logoUrl}|${organization.notificationEmail}`) {
    changed = true;
  }
  if (organization.coverUrl === undefined) {
    organization.coverUrl = "/products/ma-ogrlica.svg";
    changed = true;
  }
  if (organization.description === undefined) {
    organization.description = "Ručno rađen nakit iz ateljea u Beogradu.";
    changed = true;
  }
  const owned = db.products.filter((product) => product.organizationId === organization.id);
  const needsCatalog = owned.some((product) => CLOTHING_SKUS.has(product.sku)) || !owned.some((product) => product.sku === "MA-ALK" && product.active);
  if (needsCatalog) {
    const catalog = boutiqueCatalog(organization.id, now);
    db.categories = [
      ...db.categories.filter((category) => category.organizationId !== organization.id),
      ...catalog.categories,
    ];
    db.products = [
      ...db.products.filter((product) => product.organizationId !== organization.id),
      ...catalog.items,
    ];
    const bySku = new Map(catalog.items.map((product) => [product.sku, product]));
    for (const order of db.orders.filter((item) => item.organizationId === organization.id)) {
      const items = db.orderItems.filter((item) => item.orderId === order.id);
      if (!items.some((item) => CLOTHING_SKUS.has(item.sku))) continue;
      const sku = order.number.endsWith("0902") ? "MA-BIS" : "MA-ALK";
      const product = bySku.get(sku);
      if (!product) continue;
      db.orderItems = db.orderItems.filter((item) => item.orderId !== order.id);
      const unitPricePara = effectivePricePara(product);
      db.orderItems.push({
        id: seedId(`item:${order.number}:${sku}`),
        orderId: order.id,
        organizationId: organization.id,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: 1,
        unitPricePara,
        lineTotalPara: unitPricePara,
      });
      order.subtotalPara = unitPricePara;
      order.totalPara = unitPricePara;
    }
    changed = true;
  }
  return backfillBoutiqueSales(db, organization.id) || changed;
}

const PHYSICAL_DEMO_CUSTOMERS: Array<{
  email: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  code: string;
  daysOld: number;
}> = [
  {
    email: "milica.radic@example.com",
    name: "Milica Radić",
    phone: "+381 69 441 2280",
    address: "Apatinski put 14",
    city: "Sombor",
    code: "K-0005",
    daysOld: 40,
  },
  {
    email: "nikola.jovanovic@example.com",
    name: "Nikola Jovanović",
    phone: "+381 64 220 1188",
    address: "Cara Dušana 9",
    city: "Novi Sad",
    code: "K-0006",
    daysOld: 25,
  },
];

function ensureMeatPhysicalBuyers(db: DemoDatabase) {
  const organization = db.organizations.find((item) => item.slug === MEAT_SLUG || item.slug === LEGACY_MEAT_SLUG);
  if (!organization) return false;
  let changed = false;
  const now = new Date().toISOString();
  for (const spec of PHYSICAL_DEMO_CUSTOMERS) {
    const existing = db.customers.find(
      (item) => item.organizationId === organization.id && item.email.toLowerCase() === spec.email,
    );
    if (existing) continue;
    const codes = db.customers.filter((item) => item.organizationId === organization.id).map((item) => item.code);
    db.customers.push({
      id: seedId(`customer:gastro-supply:${spec.email}`),
      organizationId: organization.id,
      businessName: spec.name,
      contactName: spec.name,
      email: spec.email,
      phone: spec.phone,
      pib: "",
      address: spec.address,
      city: spec.city,
      notes: "",
      code: codes.includes(spec.code) ? nextCustomerCode(codes) : spec.code,
      party: "fizicka",
      paymentTermDays: 0,
      sefRegistered: false,
      createdAt: ago(spec.daysOld),
      updatedAt: now,
    });
    changed = true;
  }

  const orders: Array<{
    key: string;
    email: string;
    lines: Array<[string, number]>;
    status: OrderStatus;
    payment: NonNullable<Order["paymentMethod"]>;
    days: number;
  }> = [
    {
      key: "milica",
      email: "milica.radic@example.com",
      lines: [
        ["MP-KUL", 0.5],
        ["MP-PKO", 1],
      ],
      status: "isporucena",
      payment: "pouzecem",
      days: 1,
    },
    {
      key: "nikola",
      email: "nikola.jovanovic@example.com",
      lines: [["MP-CVA", 0.5]],
      status: "potvrdjena",
      payment: "ips",
      days: 4,
    },
  ];
  const year = belgradeYear(now);
  for (const spec of orders) {
    const customer = db.customers.find(
      (item) => item.organizationId === organization.id && item.email.toLowerCase() === spec.email,
    );
    if (!customer) continue;
    const orderId = seedId(`order:physical:mesara:${spec.key}`);
    if (db.orders.some((order) => order.id === orderId || order.customerId === customer.id)) continue;
    const lines = spec.lines.flatMap(([sku, quantity]) => {
      const product = db.products.find(
        (item) => item.organizationId === organization.id && item.sku === sku && item.active,
      );
      if (!product) return [];
      const lineTotalPara = Math.round(product.pricePara * quantity);
      return [
        {
          id: seedId(`item:physical:mesara:${spec.key}:${sku}`),
          orderId,
          organizationId: organization.id,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          quantity,
          unitPricePara: product.pricePara,
          lineTotalPara,
        } satisfies OrderItem,
      ];
    });
    if (lines.length === 0) continue;
    let number = "";
    do {
      number = `${organization.orderPrefix}-${year}-${String(organization.nextOrderNumber).padStart(4, "0")}`;
      organization.nextOrderNumber += 1;
    } while (db.orders.some((order) => order.organizationId === organization.id && order.number === number));
    const totalPara = lines.reduce((sum, item) => sum + item.lineTotalPara, 0);
    const createdAt = ago(spec.days, 3);
    db.orders.push({
      id: orderId,
      organizationId: organization.id,
      customerId: customer.id,
      buyerUserId: null,
      number,
      status: spec.status,
      notes: "",
      subtotalPara: totalPara,
      totalPara,
      idempotencyKey: seedId(`idem:physical:mesara:${spec.key}`),
      confirmationToken: seedId(`confirm:physical:mesara:${spec.key}`),
      paymentMethod: spec.payment,
      customerSnapshot: {
        code: customer.code,
        businessName: customer.businessName,
        contactName: customer.contactName,
        email: customer.email,
        phone: customer.phone,
        pib: "",
        mb: "",
        address: customer.address,
        postalCode: "",
        city: customer.city,
        bankAccount: "",
      },
      customerEmailStatus: "skipped",
      supplierEmailStatus: "skipped",
      sefInvoiceId: null,
      sefStatus: null,
      createdAt,
      updatedAt: createdAt,
    });
    db.orderItems.push(...lines);
    db.statusHistory.push({
      id: seedId(`status:physical:mesara:${spec.key}:nova`),
      orderId,
      organizationId: organization.id,
      fromStatus: null,
      toStatus: "nova",
      actorName: "Sistem",
      createdAt,
    });
    if (spec.status !== "nova") {
      db.statusHistory.push({
        id: seedId(`status:physical:mesara:${spec.key}:${spec.status}`),
        orderId,
        organizationId: organization.id,
        fromStatus: "nova",
        toStatus: spec.status,
        actorName: "Ana Petrović",
        createdAt: new Date(new Date(createdAt).getTime() + 45 * 60 * 1000).toISOString(),
      });
    }
    changed = true;
  }

  if (changed && organization.audience === "pravna") {
    organization.audience = "oba";
    organization.updatedAt = now;
  }
  return changed;
}

const SAVA_PRODUCTS: Array<{
  sku: string;
  name: string;
  unit: Unit;
  pricePara: number;
  minQuantity: number;
  description: string;
}> = [
  { sku: "ST-MAJ", name: "Majonez", unit: "kilogram", pricePara: 28900, minQuantity: 4, description: "Majonez za kuhinju, doza od 1 kg." },
  { sku: "ST-KAF", name: "Kafa mlevena", unit: "kilogram", pricePara: 148000, minQuantity: 1, description: "Mlevena kafa, mešavina za espreso, pakovanje 1 kg." },
  { sku: "ST-VOD", name: "Mineralna voda 1,5 l", unit: "komad", pricePara: 5800, minQuantity: 12, description: "Negazirana mineralna voda, flaša 1,5 l." },
  { sku: "ST-UBR", name: "Ubrus beli", unit: "paket", pricePara: 17500, minQuantity: 5, description: "Beli ubrus 100/1, jednoslojni." },
  { sku: "ST-DET", name: "Deterdžent za sudove", unit: "komad", pricePara: 92000, minQuantity: 1, description: "Tečni deterdžent za mašinsko pranje sudova, kanister 5 l." },
  { sku: "ST-TES", name: "Testenina špagete", unit: "kutija", pricePara: 9800, minQuantity: 12, description: "Špagete 500 g, kutija." },
  { sku: "ST-ULJ", name: "Ulje suncokretovo", unit: "litar", pricePara: 18900, minQuantity: 6, description: "Rafinisano suncokretovo ulje, flaša od 1 l." },
  { sku: "ST-PEL", name: "Paradajz pelat", unit: "kutija", pricePara: 34500, minQuantity: 4, description: "Pelat od paradajza, limenka 2,5 kg." },
  { sku: "ST-SOK", name: "Sok od jabuke", unit: "litar", pricePara: 14900, minQuantity: 6, description: "Bistri sok od jabuke, tetrapak 1 l." },
  { sku: "ST-BR400", name: "Brašno T-400", unit: "kilogram", pricePara: 9600, minQuantity: 10, description: "Brašno tip 400, mekše, za kolače i lisnato testo." },
  { sku: "ST-SEC", name: "Šećer kristal", unit: "kilogram", pricePara: 12400, minQuantity: 10, description: "Beli kristal šećer, džak od 25 kg." },
  { sku: "ST-BR500", name: "Brašno T-500", unit: "kilogram", pricePara: 8900, minQuantity: 10, description: "Pšenično brašno tip 500, džak od 25 kg. Za hleb, peciva i testeninu." },
  { sku: "ST-PIR", name: "Pirinač dugi", unit: "kilogram", pricePara: 17800, minQuantity: 5, description: "Dugi pirinač, kesa od 5 kg." },
  { sku: "ST-SO", name: "So kuhinjska", unit: "kilogram", pricePara: 4800, minQuantity: 5, description: "Sitna kuhinjska so, kesa od 1 kg." },
  { sku: "ST-SIR", name: "Sirće alkoholno", unit: "litar", pricePara: 9900, minQuantity: 6, description: "Alkoholno sirće 9%, flaša od 1 l." },
  { sku: "ST-KEC", name: "Kečap blagi", unit: "kilogram", pricePara: 21500, minQuantity: 4, description: "Blagi kečap, doza od 1 kg." },
];

/** Sava Trade is the production shop. It is created only when missing, so an existing shop is left as it is. */
async function ensureProductionShop(db: DemoDatabase) {
  if (db.organizations.some((item) => item.slug === "sava-trade")) return false;
  const now = "2026-04-18T07:20:00.000Z";
  const password = PRODUCTION_LOGINS.find((account) => account.email === "milan.kostic@savatrade.rs")?.password ?? "";
  const passwordHash = await hashPassword(password);
  const organization: Organization = {
    id: seedId("org:sava-trade"),
    name: "Sava Trade",
    slug: "sava-trade",
    email: "porudzbine@savatrade.rs",
    notificationEmail: DEMO_INBOX,
    phone: "+381 11 412 8800",
    address: "Autoput za Zagreb 18",
    city: "Beograd",
    pib: "101998877",
    mb: "20887766",
    logoUrl: null,
    brandColor: "#1e3a2f",
    coverUrl: null,
    description: "Namirnice za restorane, hotele i markete. Isporuka radnim danima po Beogradu i okolini.",
    trade: "namirnice",
    channel: "b2c",
    audience: "oba",
    orderPrefix: "ST",
    nextOrderNumber: 1001,
    active: true,
    publicStore: true,
    trackStock: false,
    efakturaApiKey: "",
    efakturaEnabled: false,
    efakturaEnvironment: "demo",
    createdAt: now,
    updatedAt: now,
  };
  db.organizations.push(organization);

  let milan = db.users.find((item) => item.email === "milan.kostic@savatrade.rs");
  if (!milan) {
    milan = {
      id: seedId("user:milan.kostic@savatrade.rs"),
      email: "milan.kostic@savatrade.rs",
      name: "Milan Kostić",
      passwordHash,
      kind: "supplier",
      businessName: "Sava Trade d.o.o.",
      phone: "+381 11 412 8800",
      address: "Autoput za Zagreb 18",
      city: "Beograd",
      pib: "101998877",
      mb: "20887766",
      postalCode: "11080",
      bankAccount: "",
      confirmationEmail: "",
      createdAt: now,
    };
    db.users.push(milan);
  }
  if (!db.members.some((item) => item.organizationId === organization.id && item.userId === milan.id)) {
    db.members.push({
      id: seedId("member:sava-trade:milan"),
      organizationId: organization.id,
      userId: milan.id,
      role: "owner",
      createdAt: now,
    });
  }

  let petar = db.users.find((item) => item.email === "petar@restoranmorava.rs");
  if (!petar) {
    petar = {
      id: seedId("user:petar@restoranmorava.rs"),
      email: "petar@restoranmorava.rs",
      name: "Petar Marković",
      passwordHash,
      kind: "buyer",
      businessName: "Restoran Morava",
      phone: "+381 63 555 0190",
      address: "Knez Mihailova 28",
      city: "Beograd",
      pib: "104455667",
      mb: "21334455",
      postalCode: "11000",
      bankAccount: "",
      confirmationEmail: DEMO_INBOX,
      createdAt: "2026-05-18T12:20:00.000Z",
    };
    db.users.push(petar);
  }

  for (const item of SAVA_PRODUCTS) {
    if (db.products.some((product) => product.organizationId === organization.id && product.sku === item.sku)) continue;
    db.products.push({
      id: seedId(`product:sava-trade:${item.sku}`),
      organizationId: organization.id,
      categoryId: null,
      name: item.name,
      sku: item.sku,
      description: item.description,
      unit: item.unit,
      pricePara: item.pricePara,
      salePricePara: null,
      imageUrl: null,
      imageUrls: [],
      active: true,
      minQuantity: item.minQuantity,
      stockQuantity: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  return true;
}

const SAVA_CUSTOMERS: Array<{
  key: string;
  email: string;
  businessName: string;
  contactName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  pib: string;
  mb: string;
  party: Customer["party"];
  paymentTermDays: number;
}> = [
  {
    key: "morava",
    email: "petar@restoranmorava.rs",
    businessName: "Restoran Morava",
    contactName: "Petar Marković",
    phone: "+381 63 555 0190",
    address: "Knez Mihailova 28",
    city: "Beograd",
    postalCode: "11000",
    pib: "104455667",
    mb: "21334455",
    party: "pravna",
    paymentTermDays: 15,
  },
  {
    key: "jelena",
    email: "jelena.stankovic@example.com",
    businessName: "Jelena Stanković",
    contactName: "Jelena Stanković",
    phone: "+381 64 330 2211",
    address: "Cara Dušana 42",
    city: "Zemun",
    postalCode: "11080",
    pib: "",
    mb: "",
    party: "fizicka",
    paymentTermDays: 0,
  },
];

const SAVA_ORDERS: Array<{
  key: string;
  customer: string;
  lines: Array<[string, number]>;
  status: OrderStatus;
  payment: NonNullable<Order["paymentMethod"]>;
  days: number;
  hours: number;
  notes: string;
}> = [
  {
    key: "morava-brasno",
    customer: "morava",
    lines: [
      ["ST-BR500", 25],
      ["ST-ULJ", 12],
      ["ST-KAF", 2],
    ],
    status: "nova",
    payment: "racun",
    days: 0,
    hours: 3,
    notes: "Isporuka na šank, pre podne.",
  },
  {
    key: "morava-namirnice",
    customer: "morava",
    lines: [
      ["ST-SEC", 10],
      ["ST-PIR", 10],
      ["ST-SO", 10],
    ],
    status: "potvrdjena",
    payment: "racun",
    days: 2,
    hours: 4,
    notes: "",
  },
  {
    key: "morava-kuhinja",
    customer: "morava",
    lines: [
      ["ST-TES", 24],
      ["ST-KEC", 4],
      ["ST-MAJ", 4],
    ],
    status: "u_pripremi",
    payment: "racun",
    days: 4,
    hours: 2,
    notes: "",
  },
  {
    key: "morava-pelat",
    customer: "morava",
    lines: [
      ["ST-PEL", 8],
      ["ST-SIR", 6],
    ],
    status: "isporucena",
    payment: "racun",
    days: 11,
    hours: 5,
    notes: "",
  },
  {
    key: "jelena-voda",
    customer: "jelena",
    lines: [
      ["ST-VOD", 24],
      ["ST-SOK", 12],
    ],
    status: "isporucena",
    payment: "pouzecem",
    days: 6,
    hours: 1,
    notes: "",
  },
  {
    key: "jelena-higijena",
    customer: "jelena",
    lines: [
      ["ST-DET", 1],
      ["ST-UBR", 5],
    ],
    status: "nova",
    payment: "ips",
    days: 1,
    hours: 6,
    notes: "",
  },
];

function ensureSavaOrders(db: DemoDatabase) {
  const organization = db.organizations.find((item) => item.slug === "sava-trade");
  if (!organization) return false;
  let changed = false;
  const now = new Date().toISOString();
  const customers = new Map<string, Customer>();

  for (const spec of SAVA_CUSTOMERS) {
    let customer = db.customers.find(
      (item) => item.organizationId === organization.id && item.email.toLowerCase() === spec.email,
    );
    if (!customer) {
      const codes = db.customers.filter((item) => item.organizationId === organization.id).map((item) => item.code);
      const preferred = spec.key === "morava" ? "K-0001" : "K-0002";
      customer = {
        id: seedId(`customer:sava-trade:${spec.email}`),
        organizationId: organization.id,
        businessName: spec.businessName,
        contactName: spec.contactName,
        email: spec.email,
        phone: spec.phone,
        pib: spec.pib,
        address: spec.address,
        city: spec.city,
        notes: "",
        code: codes.includes(preferred) ? nextCustomerCode(codes) : preferred,
        party: spec.party,
        paymentTermDays: spec.paymentTermDays,
        sefRegistered: false,
        createdAt: "2026-05-18T12:20:00.000Z",
        updatedAt: now,
      };
      db.customers.push(customer);
      changed = true;
    }
    customers.set(spec.key, customer);
  }

  const buyer = db.users.find((item) => item.email === "petar@restoranmorava.rs");
  const year = belgradeYear(now);
  for (const spec of SAVA_ORDERS) {
    const orderId = seedId(`order:sava-trade:${spec.key}`);
    const idempotencyKey = seedId(`idem:sava-trade:${spec.key}`);
    if (db.orders.some((order) => order.id === orderId || order.idempotencyKey === idempotencyKey)) continue;
    const customer = customers.get(spec.customer);
    if (!customer) continue;
    const lines = spec.lines.flatMap(([sku, quantity]) => {
      const product = db.products.find(
        (item) => item.organizationId === organization.id && item.sku === sku && item.active,
      );
      if (!product) return [];
      const ordered = Math.max(quantity, product.minQuantity);
      const unitPricePara = effectivePricePara(product);
      const lineTotalPara = Math.round(unitPricePara * ordered);
      return [
        {
          id: seedId(`item:sava-trade:${spec.key}:${sku}`),
          orderId,
          organizationId: organization.id,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          quantity: ordered,
          unitPricePara,
          lineTotalPara,
        } satisfies OrderItem,
      ];
    });
    if (lines.length === 0) continue;
    let number = "";
    do {
      number = `${organization.orderPrefix}-${year}-${String(organization.nextOrderNumber).padStart(4, "0")}`;
      organization.nextOrderNumber += 1;
    } while (db.orders.some((order) => order.organizationId === organization.id && order.number === number));
    const totalPara = lines.reduce((sum, item) => sum + item.lineTotalPara, 0);
    const createdAt = ago(spec.days, spec.hours);
    db.orders.push({
      id: orderId,
      organizationId: organization.id,
      customerId: customer.id,
      buyerUserId: spec.customer === "morava" ? buyer?.id ?? null : null,
      number,
      status: spec.status,
      notes: spec.notes,
      subtotalPara: totalPara,
      totalPara,
      idempotencyKey,
      confirmationToken: seedId(`confirm:sava-trade:${spec.key}`),
      paymentMethod: spec.payment,
      customerSnapshot: {
        code: customer.code,
        businessName: customer.businessName,
        contactName: customer.contactName,
        email: customer.email,
        phone: customer.phone,
        pib: customer.pib,
        mb: spec.customer === "morava" ? "21334455" : "",
        address: customer.address,
        postalCode: spec.customer === "morava" ? "11000" : "11080",
        city: customer.city,
        bankAccount: "",
      },
      customerEmailStatus: "skipped",
      supplierEmailStatus: "skipped",
      sefInvoiceId: null,
      sefStatus: null,
      createdAt,
      updatedAt: createdAt,
    });
    db.orderItems.push(...lines);
    db.statusHistory.push({
      id: seedId(`status:sava-trade:${spec.key}:nova`),
      orderId,
      organizationId: organization.id,
      fromStatus: null,
      toStatus: "nova",
      actorName: "Sistem",
      createdAt,
    });
    if (spec.status !== "nova") {
      db.statusHistory.push({
        id: seedId(`status:sava-trade:${spec.key}:${spec.status}`),
        orderId,
        organizationId: organization.id,
        fromStatus: "nova",
        toStatus: spec.status,
        actorName: "Milan Kostić",
        createdAt: new Date(new Date(createdAt).getTime() + 45 * 60 * 1000).toISOString(),
      });
    }
    changed = true;
  }

  return changed;
}

export async function ensureRetailDemo(db: DemoDatabase) {
  let changed = renameUserEmail(db, "ana@gastrosupply.rs", DEMO_EMAIL);
  changed = renameUserEmail(db, "vera@butikvera.rs", RETAIL_DEMO_EMAIL) || changed;
  changed = renameUserEmail(db, "jovana@butikvera.rs", RETAIL_BUYER_EMAIL) || changed;
  changed = ensureMeatShop(db) || changed;
  changed = ensureMeatPhysicalBuyers(db) || changed;
  changed = ensureJewelryShop(db) || changed;
  changed = applyDemoStock(db) || changed;
  const ownerChanged = await ensureBoutiqueOwner(db);
  const buyersChanged = await ensureDemoBuyers(db);
  const productionChanged = await ensureProductionShop(db);
  const productionOrders = ensureSavaOrders(db);
  const platformChanged = await ensurePlatformAdmin(db);
  const inboxChanged = ensureSampleInboxes(db);
  return ownerChanged || buyersChanged || productionChanged || productionOrders || platformChanged || inboxChanged || changed;
}

const PLAN_OSNOVNI_ID = seedId("plan:osnovni");
const PLAN_POSLOVNI_ID = seedId("plan:poslovni");

function billingMonth(monthsBack: number) {
  const [yearText, monthText] = currentBelgradeMonthKey().split("-");
  const cursor = new Date(Date.UTC(Number(yearText), Number(monthText) - 1 - monthsBack, 1, 12, 0, 0));
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  return {
    year: String(year),
    start: new Date(Date.UTC(year, month, 1, 12, 0, 0)).toISOString(),
    end: new Date(Date.UTC(year, month + 1, 0, 12, 0, 0)).toISOString(),
  };
}

export async function ensurePlatformAdmin(db: DemoDatabase) {
  db.plans ??= [];
  db.subscriptions ??= [];
  db.invoices ??= [];
  db.supplierNotes ??= [];
  let changed = false;
  const now = new Date().toISOString();

  let admin = db.users.find((user) => user.email === PLATFORM_ADMIN_EMAIL);
  if (!admin) {
    admin = {
      id: seedId(`user:${PLATFORM_ADMIN_EMAIL}`),
      email: PLATFORM_ADMIN_EMAIL,
      name: "Prodora administracija",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      kind: "platform",
      businessName: "",
      phone: "",
      address: "",
      city: "",
      pib: "",
      bankAccount: "",
      createdAt: now,
    };
    db.users.push(admin);
    changed = true;
  }

  if (admin.kind !== "platform" && !db.members.some((member) => member.userId === admin.id)) {
    admin.kind = "platform";
    changed = true;
  }
  if (admin.kind === "platform") {
    const members = db.members.filter((member) => member.userId !== admin.id);
    if (members.length !== db.members.length) {
      db.members = members;
      changed = true;
    }
  }

  const defaults: SubscriptionPlan[] = [
    {
      id: PLAN_OSNOVNI_ID,
      name: "Osnovni",
      monthlyPricePara: 199_000,
      description: "Katalog, porudžbine i stranica prodavnice.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: PLAN_POSLOVNI_ID,
      name: "Poslovni",
      monthlyPricePara: 499_000,
      description: "Veći katalog i prioritetna podrška.",
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const plan of defaults) {
    if (db.plans.some((item) => item.id === plan.id)) continue;
    db.plans.push(plan);
    changed = true;
  }

  const osnovni = db.plans.find((plan) => plan.id === PLAN_OSNOVNI_ID) ?? db.plans[0];
  for (const organization of db.organizations) {
    if (db.subscriptions.some((item) => item.organizationId === organization.id)) continue;
    const preferred = organization.slug === MEAT_SLUG || organization.slug === LEGACY_MEAT_SLUG ? PLAN_POSLOVNI_ID : osnovni?.id;
    const planId = db.plans.some((plan) => plan.id === preferred) ? preferred : osnovni?.id;
    if (!planId) continue;
    const subscription: Subscription = {
      id: seedId(`subscription:${organization.slug}`),
      organizationId: organization.id,
      planId,
      status: "aktivna",
      periodStart: billingMonth(0).start,
      createdAt: now,
      updatedAt: now,
    };
    db.subscriptions.push(subscription);
    changed = true;
  }

  const notes: Record<string, string> = {
    "mesara-pajic": "Demo nalog. Prodavnica za pravna lica.",
    "mercis-atelier": "Demo nalog. Prodavnica za fizička lica.",
  };
  for (const [slug, body] of Object.entries(notes)) {
    const organization = db.organizations.find((item) => item.slug === slug);
    if (!organization || db.supplierNotes.some((item) => item.organizationId === organization.id)) continue;
    db.supplierNotes.push({ organizationId: organization.id, body, updatedAt: now });
    changed = true;
  }

  const invoiceSpecs: { slug: string; planId: string; rows: { key: string; monthsBack: number; status: InvoiceStatus }[] }[] = [
    {
      slug: "mesara-pajic",
      planId: PLAN_POSLOVNI_ID,
      rows: [
        { key: "1001", monthsBack: 2, status: "placena" },
        { key: "1002", monthsBack: 1, status: "placena" },
        { key: "1003", monthsBack: 0, status: "neplacena" },
      ],
    },
    {
      slug: "mercis-atelier",
      planId: PLAN_OSNOVNI_ID,
      rows: [
        { key: "2001", monthsBack: 1, status: "placena" },
        { key: "2002", monthsBack: 0, status: "neplacena" },
      ],
    },
  ];
  for (const spec of invoiceSpecs) {
    const organization = db.organizations.find((item) => item.slug === spec.slug);
    const plan = db.plans.find((item) => item.id === spec.planId);
    if (!organization || !plan) continue;
    const invoiceSlug = spec.slug === MEAT_SLUG ? LEGACY_MEAT_SLUG : spec.slug === BOUTIQUE_SLUG ? LEGACY_BOUTIQUE_SLUG : spec.slug;
    for (const row of spec.rows) {
      const id = seedId(`invoice:${invoiceSlug}:${row.key}`);
      if (db.invoices.some((item) => item.id === id)) continue;
      const month = billingMonth(row.monthsBack);
      db.invoices.push({
        id,
        organizationId: organization.id,
        number: `PF-${month.year}-${row.key}`,
        periodStart: month.start,
        periodEnd: month.end,
        amountPara: plan.monthlyPricePara,
        status: row.status,
        issuedAt: month.start,
      });
      changed = true;
    }
  }

  return changed;
}

async function ensureBoutiqueOwner(db: DemoDatabase) {
  const organization = db.organizations.find((item) => item.slug === BOUTIQUE_SLUG);
  if (!organization) return false;
  let user = db.users.find((item) => item.email === RETAIL_DEMO_EMAIL);
  let changed = false;
  if (!user) {
    user = {
      id: seedId(`user:${RETAIL_DEMO_EMAIL}`),
      email: RETAIL_DEMO_EMAIL,
      name: "Vera Jovanović",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      kind: "supplier",
      businessName: "",
      phone: "",
      address: "",
      city: "",
      pib: "",
      bankAccount: "",
      createdAt: organization.createdAt,
    };
    db.users.push(user);
    changed = true;
  }
  if (!db.members.some((item) => item.organizationId === organization.id && item.userId === user.id)) {
    db.members.push({
      id: seedId("member:butik-vera:vera"),
      organizationId: organization.id,
      userId: user.id,
      role: "owner",
      createdAt: organization.createdAt,
    });
    changed = true;
  }
  return changed;
}

function ensureSampleInboxes(db: DemoDatabase) {
  let changed = false;
  const sava = db.organizations.find((item) => item.slug === "sava-trade");
  if (sava && sava.notificationEmail !== DEMO_INBOX) {
    sava.notificationEmail = DEMO_INBOX;
    changed = true;
  }
  const petar = db.users.find((item) => item.email === "petar@restoranmorava.rs");
  if (petar && petar.confirmationEmail !== DEMO_INBOX) {
    petar.confirmationEmail = DEMO_INBOX;
    changed = true;
  }
  return changed;
}

async function ensureDemoBuyers(db: DemoDatabase) {
  const now = new Date().toISOString();
  const marko = await ensureBuyer(db, {
    email: BUSINESS_BUYER_EMAIL,
    name: "Marko Jović",
    businessName: "Restoran Dunav",
    phone: "+381 63 111 2200",
    address: "Bulevar kralja Aleksandra 142",
    city: "Beograd",
    pib: "108765432",
    mb: "20123456",
    postalCode: "11000",
    bankAccount: BUSINESS_BUYER_ACCOUNT,
    confirmationEmail: DEMO_INBOX,
    createdAt: now,
  });
  const jovana = await ensureBuyer(db, {
    email: RETAIL_BUYER_EMAIL,
    name: "Jovana Ilić",
    businessName: "",
    phone: "+381 64 555 0199",
    address: "Knez Mihailova 18",
    city: "Beograd",
    postalCode: "11000",
    pib: "",
    bankAccount: "",
    confirmationEmail: DEMO_INBOX,
    createdAt: now,
  });
  const linked = linkBusinessBuyerOrders(db, marko.user);
  const retailOrders = ensureRetailBuyerOrders(db, jovana.user);
  return marko.changed || jovana.changed || linked || retailOrders;
}

async function ensureBuyer(
  db: DemoDatabase,
  input: Omit<DemoUser, "id" | "passwordHash" | "kind">,
) {
  const existing = db.users.find((item) => item.email === input.email);
  if (existing) {
    let changed = false;
    if (input.mb && !existing.mb) {
      existing.mb = input.mb;
      changed = true;
    }
    if (input.postalCode && !existing.postalCode) {
      existing.postalCode = input.postalCode;
      changed = true;
    }
    if (input.confirmationEmail && existing.confirmationEmail !== input.confirmationEmail) {
      existing.confirmationEmail = input.confirmationEmail;
      changed = true;
    }
    return { user: existing, changed };
  }
  const user: DemoUser = {
    ...input,
    id: seedId(`user:${input.email}`),
    passwordHash: await hashPassword(DEMO_PASSWORD),
    kind: "buyer",
  };
  db.users.push(user);
  return { user, changed: true };
}

function linkBusinessBuyerOrders(db: DemoDatabase, user: DemoUser) {
  let changed = false;
  for (const order of db.orders) {
    const customer = db.customers.find((item) => item.id === order.customerId);
    const owned = order.buyerUserId === user.id || (!order.buyerUserId && customer?.email === BUSINESS_BUYER_EMAIL);
    if (!owned) continue;
    if (!order.buyerUserId) {
      order.buyerUserId = user.id;
      changed = true;
    }
    if (!order.paymentMethod) {
      order.paymentMethod = "racun";
      changed = true;
    }
    if (!order.customerSnapshot.bankAccount) {
      order.customerSnapshot.bankAccount = BUSINESS_BUYER_ACCOUNT;
      changed = true;
    }
    if (!order.customerSnapshot.mb && user.mb) {
      order.customerSnapshot.mb = user.mb;
      changed = true;
    }
    if (!order.customerSnapshot.postalCode && user.postalCode) {
      order.customerSnapshot.postalCode = user.postalCode;
      changed = true;
    }
  }
  return changed;
}

function ensureRetailBuyerOrders(db: DemoDatabase, user: DemoUser) {
  const organization = db.organizations.find((item) => item.slug === BOUTIQUE_SLUG);
  if (!organization) return false;
  let changed = false;
  let customer = db.customers.find(
    (item) => item.organizationId === organization.id && item.email === RETAIL_BUYER_EMAIL,
  );
  if (!customer) {
    const now = new Date().toISOString();
    customer = {
      id: seedId(`customer:butik-vera:${RETAIL_BUYER_EMAIL}`),
      organizationId: organization.id,
      businessName: user.name,
      contactName: user.name,
      email: user.email,
      phone: user.phone,
      pib: "",
      address: user.address,
      city: user.city,
      notes: "",
      code: "K-0001",
      party: "fizicka",
      paymentTermDays: 0,
      sefRegistered: false,
      createdAt: now,
      updatedAt: now,
    };
    db.customers.push(customer);
    changed = true;
  }

  const year = belgradeYear(new Date().toISOString());
  const specs = [
    { suffix: "0901", sku: "MA-ALK", status: "isporucena" as const, payment: "kartica" as const, days: 6 },
    { suffix: "0902", sku: "MA-BIS", status: "potvrdjena" as const, payment: "pouzecem" as const, days: 20 },
  ];
  for (const spec of specs) {
    const number = `BV-${year}-${spec.suffix}`;
    const orderId = seedId(`order:demo-buyer:butik:${spec.suffix}`);
    const existing = db.orders.find(
      (order) => order.id === orderId || (order.organizationId === organization.id && order.number === number),
    );
    if (existing) {
      if (!existing.buyerUserId) {
        existing.buyerUserId = user.id;
        changed = true;
      }
      if (!existing.customerSnapshot.postalCode && user.postalCode) {
        existing.customerSnapshot.postalCode = user.postalCode;
        changed = true;
      }
      continue;
    }
    const product = db.products.find((item) => item.organizationId === organization.id && item.sku === spec.sku);
    if (!product) continue;
    const unitPricePara = effectivePricePara(product);
    const lineTotalPara = Math.round(unitPricePara);
    const createdAt = ago(spec.days, 4);
    db.orderItems.push({
      id: seedId(`item:demo-buyer:butik:${spec.suffix}:${spec.sku}`),
      orderId,
      organizationId: organization.id,
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      quantity: 1,
      unitPricePara,
      lineTotalPara,
    });
    db.orders.push({
      id: orderId,
      organizationId: organization.id,
      customerId: customer.id,
      buyerUserId: user.id,
      number,
      status: spec.status,
      notes: "",
      subtotalPara: lineTotalPara,
      totalPara: lineTotalPara,
      idempotencyKey: seedId(`idem:demo-buyer:butik:${spec.suffix}`),
      confirmationToken: seedId(`confirm:demo-buyer:butik:${spec.suffix}`),
      paymentMethod: spec.payment,
      customerSnapshot: {
        code: customer.code,
        businessName: user.name,
        contactName: user.name,
        email: user.email,
        phone: user.phone,
        pib: "",
        mb: "",
        address: user.address,
        postalCode: user.postalCode ?? "",
        city: user.city,
        bankAccount: "",
      },
      customerEmailStatus: "skipped",
      supplierEmailStatus: "skipped",
      sefInvoiceId: null,
      sefStatus: null,
      createdAt,
      updatedAt: createdAt,
    });
    db.statusHistory.push(
      {
        id: seedId(`status:demo-buyer:butik:${spec.suffix}:nova`),
        orderId,
        organizationId: organization.id,
        fromStatus: null,
        toStatus: "nova",
        actorName: "Sistem",
        createdAt,
      },
      {
        id: seedId(`status:demo-buyer:butik:${spec.suffix}:${spec.status}`),
        orderId,
        organizationId: organization.id,
        fromStatus: "nova",
        toStatus: spec.status,
        actorName: "Vera Jovanović",
        createdAt: new Date(new Date(createdAt).getTime() + 45 * 60 * 1000).toISOString(),
      },
    );
    changed = true;
  }
  return changed;
}
