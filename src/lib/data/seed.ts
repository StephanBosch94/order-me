import { createHash } from "node:crypto";

import { effectivePricePara } from "@/lib/data/pricing";
import { belgradeYear, currentBelgradeMonthKey } from "@/lib/format";
import { hashPassword } from "@/lib/password";
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
  role: "owner" | "staff";
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

export const DEMO_EMAIL = "ana@gastrosupply.rs";
export const RETAIL_DEMO_EMAIL = "vera@butikvera.rs";
export const BUSINESS_BUYER_EMAIL = "marko@restorandunav.rs";
export const RETAIL_BUYER_EMAIL = "jovana@butikvera.rs";
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
    slug: "gastro-supply",
    email: "porudzbine@gastrosupply.rs",
    notificationEmail: "porudzbine@gastrosupply.rs",
    phone: "+381 21 555 0142",
    address: "Jarmočna 20",
    city: "Bački Petrovac",
    pib: "109876543",
    mb: "21456789",
    logoUrl: "/suppliers/gastro-supply.svg",
    brandColor: MEAT_BRAND_COLOR,
    channel: "b2b",
    audience: "pravna",
    orderPrefix: "PU",
    nextOrderNumber: 1001,
    active: true,
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

  const customers: Customer[] = customerDefs.map((customer) => ({
    id: seedId(`customer:gastro-supply:${customer.email}`),
    organizationId: orgId,
    ...customer,
    notes: "",
    createdAt: ago(60),
    updatedAt: ago(2),
  }));

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
      paymentMethod: null,
      customerSnapshot: {
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

  addOrder({
    customer: "Restoran Dunav",
    lines: [
      ["PC-025", 500],
      ["PK-CAP", 500],
      ["SV-3333", 12],
    ],
    status: "nova",
    createdAt: ago(0, 2),
    notes: "Molimo isporuku pre 11 časova.",
  });
  addOrder({
    customer: "Kafić Luna",
    lines: [
      ["KF-1KG", 2],
      ["SC-1KG", 3],
      ["PC-040", 200],
    ],
    status: "nova",
    createdAt: ago(1, 3),
    notes: "",
  });
  addOrder({
    customer: "Market 22",
    lines: [
      ["KB-4030", 40],
      ["KS-RUC", 100],
    ],
    status: "potvrdjena",
    createdAt: ago(2, 5),
    notes: "Dostava na magacin, ulaz iz dvorišta.",
  });
  addOrder({
    customer: "Pekara Zrno",
    lines: [
      ["KB-4030", 80],
      ["KS-RUC", 200],
      ["PF-300", 4],
    ],
    status: "potvrdjena",
    createdAt: ago(3, 4),
    notes: "",
  });
  addOrder({
    customer: "Market 22",
    lines: [
      ["OD-5L", 2],
      ["RK-NIT", 3],
      ["TS-1L", 6],
    ],
    status: "u_pripremi",
    createdAt: ago(5, 2),
    notes: "Rukavice u veličini M.",
  });
  addOrder({
    customer: "Restoran Dunav",
    lines: [
      ["AF-50", 6],
      ["SV-3333", 20],
      ["UB-2SL", 10],
    ],
    status: "isporucena",
    createdAt: ago(10, 6),
    notes: "",
  });
  addOrder({
    customer: "Kafić Luna",
    lines: [
      ["PC-025", 300],
      ["PK-CAP", 300],
      ["KF-1KG", 1.5],
    ],
    status: "isporucena",
    createdAt: ago(16, 1),
    notes: "",
  });
  addOrder({
    customer: "Pekara Zrno",
    lines: [["KS-RUC", 50]],
    status: "otkazana",
    createdAt: ago(20, 4),
    notes: "Kupac je otkazao jer je stigla druga isporuka.",
  });

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

const BOUTIQUE_SLUG = "butik-vera";

const DEMO_SALE_PRICES: Record<string, number> = {
  "BV-KAPUT": 1_990_000,
  "BV-HALJ": 990_000,
};

const DEMO_PRODUCT_PHOTOS: Record<string, string> = {
  "KB-4030": "/products/KB-4030.jpg",
  "PC-025": "/products/PC-025.jpg",
  "PC-040": "/products/PC-040.jpg",
  "PK-CAP": "/products/PK-CAP.jpg",
  "SV-3333": "/products/SV-3333.jpg",
  "UB-2SL": "/products/UB-2SL.jpg",
  "KS-RUC": "/products/KS-RUC.jpg",
  "AF-50": "/products/AF-50.jpg",
  "PF-300": "/products/PF-300.jpg",
  "OD-5L": "/products/OD-5L.jpg",
  "TS-1L": "/products/TS-1L.jpg",
  "RK-NIT": "/products/RK-NIT.jpg",
  "SC-1KG": "/products/SC-1KG.jpg",
  "KF-1KG": "/products/KF-1KG.jpg",
  "BV-KAPUT": "/products/bv-kaput.jpg",
  "BV-HALJ": "/products/bv-haljina.jpg",
  "BV-KOS": "/products/bv-kosulja.jpg",
  "BV-MAJ": "/products/bv-majica.jpg",
  "BV-JAK": "/products/bv-jakna.jpg",
  "BV-MIN": "/products/bv-mindjuse.jpg",
};

const DEMO_GALLERIES: Record<string, string[]> = {
  "BV-KAPUT": ["/products/bv-kaput.jpg", "/products/bv-kaput-2.jpg", "/products/bv-kaput-3.jpg"],
  "BV-HALJ": ["/products/bv-haljina.jpg", "/products/bv-haljina-2.jpg", "/products/bv-haljina-3.jpg"],
  "BV-KOS": ["/products/bv-kosulja.jpg", "/products/bv-kosulja-2.jpg", "/products/bv-kosulja-3.jpg"],
  "BV-MAJ": ["/products/bv-majica.jpg", "/products/bv-majica-2.jpg", "/products/bv-majica-3.jpg"],
  "BV-JAK": ["/products/bv-jakna.jpg", "/products/bv-jakna-2.jpg", "/products/bv-jakna-3.jpg"],
  "BV-MIN": ["/products/bv-mindjuse.jpg", "/products/bv-mindjuse-2.jpg", "/products/bv-mindjuse-3.jpg"],
  "PC-025": ["/products/PC-025.jpg", "/products/pc-025-2.jpg", "/products/pc-025-3.jpg"],
  "PC-040": ["/products/PC-040.jpg", "/products/pc-040-2.jpg", "/products/pc-040-3.jpg"],
  "KB-4030": ["/products/KB-4030.jpg", "/products/kb-4030-2.jpg", "/products/kb-4030-3.jpg"],
  "AF-50": ["/products/AF-50.jpg", "/products/af-50-2.jpg", "/products/af-50-3.jpg"],
  "KF-1KG": ["/products/KF-1KG.jpg", "/products/kf-1kg-2.jpg", "/products/kf-1kg-3.jpg"],
  "SV-3333": ["/products/SV-3333.jpg", "/products/sv-3333-2.jpg", "/products/sv-3333-3.jpg"],
  "PK-CAP": ["/products/PK-CAP.jpg", "/products/pk-cap-2.jpg"],
  "KS-RUC": ["/products/KS-RUC.jpg", "/products/ks-ruc-2.jpg"],
  "PF-300": ["/products/PF-300.jpg", "/products/pf-300-2.jpg"],
  "UB-2SL": ["/products/UB-2SL.jpg", "/products/ub-2sl-2.jpg"],
  "OD-5L": ["/products/OD-5L.jpg", "/products/od-5l-2.jpg"],
  "TS-1L": ["/products/TS-1L.jpg", "/products/ts-1l-2.jpg"],
  "RK-NIT": ["/products/RK-NIT.jpg", "/products/rk-nit-2.jpg"],
  "SC-1KG": ["/products/SC-1KG.jpg", "/products/sc-1kg-2.jpg"],
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
  organization.name = "Butik Vera";
  organization.slug = BOUTIQUE_SLUG;
  organization.email = "prodavnica@butikvera.rs";
  organization.notificationEmail = "prodavnica@butikvera.rs";
  organization.phone = "+381 11 555 0188";
  organization.address = "Gospodar Jevremova 28";
  organization.city = "Beograd";
  organization.brandColor = "#6b2d3c";
  organization.audience = "fizicka";
  organization.channel = "b2c";
  organization.orderPrefix = "BV";
  organization.updatedAt = now;
}

function boutiqueCatalog(organizationId: string, now: string) {
  const clothing: Category = {
    id: seedId("category:butik-vera:odeca"),
    organizationId,
    name: "Odeća",
    sortOrder: 1,
    createdAt: now,
  };
  const jewelry: Category = {
    id: seedId("category:butik-vera:nakit"),
    organizationId,
    name: "Nakit",
    sortOrder: 2,
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
    createdAt: now,
    updatedAt: now,
  });
  const items: Product[] = [
    piece(clothing.id, "Kaput", "BV-KAPUT", "Vuneni kaput, kamel boja, sa kaišem.", 2_490_000, 1_990_000, "/products/bv-kaput.jpg"),
    piece(clothing.id, "Crvena haljina", "BV-HALJ", "Duga haljina za izlazak.", 1_290_000, 990_000, "/products/bv-haljina.jpg"),
    piece(clothing.id, "Bela košulja", "BV-KOS", "Pamuk, klasičan kroj.", 590_000, null, "/products/bv-kosulja.jpg"),
    piece(clothing.id, "Bela majica", "BV-MAJ", "Pamuk, okrugli izrez.", 290_000, null, "/products/bv-majica.jpg"),
    piece(clothing.id, "Jakna", "BV-JAK", "Lagana jakna, više boja.", 1_490_000, null, "/products/bv-jakna.jpg"),
    piece(jewelry.id, "Minđuše", "BV-MIN", "Viseće minđuše sa plavim kamenom.", 450_000, null, "/products/bv-mindjuse.jpg"),
  ];
  return { categories: [clothing, jewelry], items };
}

function renameSupplyHouse(db: DemoDatabase) {
  const organization = db.organizations.find((item) => item.slug === "gastro-supply");
  if (!organization || organization.name !== "Gastro Supply") return false;
  organization.name = "Pult";
  organization.logoUrl = "/suppliers/gastro-supply.svg";
  organization.orderPrefix = "PU";
  organization.updatedAt = new Date().toISOString();
  return true;
}

export async function ensureRetailDemo(db: DemoDatabase) {
  let changed = renameSupplyHouse(db);
  const legacy = db.organizations.find((organization) => organization.slug === "kafa-kutak");
  if (legacy) {
    const now = new Date().toISOString();
    fillBoutique(legacy, now);
    db.categories = db.categories.filter((category) => category.organizationId !== legacy.id);
    db.products = db.products.filter((product) => product.organizationId !== legacy.id);
    const catalog = boutiqueCatalog(legacy.id, now);
    db.categories.push(...catalog.categories);
    db.products.push(...catalog.items);
    changed = true;
  } else {
    const existing = db.organizations.find((organization) => organization.slug === BOUTIQUE_SLUG);
    if (existing) {
      changed = backfillBoutiqueSales(db, existing.id) || changed;
    } else {
      const now = new Date().toISOString();
      const organization: Organization = {
        id: seedId("org:butik-vera"),
        name: "Butik Vera",
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
        channel: "b2c",
        audience: "fizicka",
        orderPrefix: "BV",
        nextOrderNumber: 1001,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      fillBoutique(organization, now);
      const catalog = boutiqueCatalog(organization.id, now);
      db.organizations.push(organization);
      db.categories.push(...catalog.categories);
      db.products.push(...catalog.items);
      changed = true;
    }
  }
  const ownerChanged = await ensureBoutiqueOwner(db);
  const buyersChanged = await ensureDemoBuyers(db);
  const platformChanged = await ensurePlatformAdmin(db);
  return ownerChanged || buyersChanged || platformChanged || changed;
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
    const preferred = organization.slug === "gastro-supply" ? PLAN_POSLOVNI_ID : osnovni?.id;
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
    "gastro-supply": "Demo nalog. Prodavnica za pravna lica.",
    "butik-vera": "Demo nalog. Prodavnica za fizička lica.",
  };
  for (const [slug, body] of Object.entries(notes)) {
    const organization = db.organizations.find((item) => item.slug === slug);
    if (!organization || db.supplierNotes.some((item) => item.organizationId === organization.id)) continue;
    db.supplierNotes.push({ organizationId: organization.id, body, updatedAt: now });
    changed = true;
  }

  const invoiceSpecs: { slug: string; planId: string; rows: { key: string; monthsBack: number; status: InvoiceStatus }[] }[] = [
    {
      slug: "gastro-supply",
      planId: PLAN_POSLOVNI_ID,
      rows: [
        { key: "1001", monthsBack: 2, status: "placena" },
        { key: "1002", monthsBack: 1, status: "placena" },
        { key: "1003", monthsBack: 0, status: "neplacena" },
      ],
    },
    {
      slug: "butik-vera",
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
    for (const row of spec.rows) {
      const id = seedId(`invoice:${spec.slug}:${row.key}`);
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
    createdAt: now,
  });
  const jovana = await ensureBuyer(db, {
    email: RETAIL_BUYER_EMAIL,
    name: "Jovana Ilić",
    businessName: "",
    phone: "+381 64 555 0199",
    address: "Knez Mihailova 18",
    city: "Beograd",
    pib: "",
    bankAccount: "",
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
      createdAt: now,
      updatedAt: now,
    };
    db.customers.push(customer);
    changed = true;
  }

  const year = belgradeYear(new Date().toISOString());
  const specs = [
    { suffix: "0901", sku: "BV-HALJ", status: "isporucena" as const, payment: "kartica" as const, days: 6 },
    { suffix: "0902", sku: "BV-MIN", status: "potvrdjena" as const, payment: "pouzecem" as const, days: 20 },
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
        businessName: user.name,
        contactName: user.name,
        email: user.email,
        phone: user.phone,
        pib: "",
        mb: "",
        address: user.address,
        postalCode: "",
        city: user.city,
        bankAccount: "",
      },
      customerEmailStatus: "skipped",
      supplierEmailStatus: "skipped",
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
