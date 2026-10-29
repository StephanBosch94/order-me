import { randomUUID } from "node:crypto";

import { belgradeYear } from "@/lib/format";
import { hashPassword } from "@/lib/password";
import type {
  Category,
  Customer,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  Organization,
  Product,
  Unit,
} from "@/lib/data/types";

export type DemoUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  kind: "supplier" | "buyer";
  businessName: string;
  phone: string;
  address: string;
  city: string;
  pib: string;
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

export type DemoDatabase = {
  version: 1;
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
};

export const DEMO_EMAIL = "ana@gastrosupply.rs";
export const DEMO_PASSWORD = "poruci-demo";

export function emptyDatabase(): DemoDatabase {
  return {
    version: 1,
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
  };
}

function ago(days: number, hours = 0) {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000).toISOString();
}

export async function createSeedDatabase(): Promise<DemoDatabase> {
  const now = new Date().toISOString();
  const year = belgradeYear(now);
  const userId = randomUUID();
  const orgId = randomUUID();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const organization: Organization = {
    id: orgId,
    name: "Pult",
    slug: "gastro-supply",
    email: "porudzbine@gastrosupply.rs",
    notificationEmail: "porudzbine@gastrosupply.rs",
    phone: "+381 21 555 0142",
    address: "Bulevar oslobođenja 88",
    city: "Novi Sad",
    pib: "109876543",
    mb: "21456789",
    logoUrl: "/suppliers/gastro-supply.svg",
    brandColor: "#14532d",
    channel: "b2b",
    audience: "pravna",
    orderPrefix: "PU",
    nextOrderNumber: 1001,
    active: true,
    createdAt: ago(120),
    updatedAt: now,
  };

  const categoryDefs = [
    ["Ambalaža", 1],
    ["Ugostiteljstvo", 2],
    ["Higijena", 3],
  ] as const;
  const categories: Category[] = categoryDefs.map(([name, sortOrder]) => ({
    id: randomUUID(),
    organizationId: orgId,
    name,
    sortOrder,
    createdAt: ago(90),
  }));
  const categoryId = (name: string) => categories.find((category) => category.name === name)!.id;

  const productDefs: Array<{
    sku: string;
    name: string;
    category: string;
    unit: Unit;
    pricePara: number;
    minQuantity: number;
    description: string;
  }> = [
    {
      sku: "KB-4030",
      name: "Kartonska kutija 40×30×20",
      category: "Ambalaža",
      unit: "kutija",
      pricePara: 9500,
      minQuantity: 1,
      description: "Troslojna kutija za pakovanje hrane i suve robe.",
    },
    {
      sku: "PC-025",
      name: "Papirna čaša 2,5 dl",
      category: "Ugostiteljstvo",
      unit: "komad",
      pricePara: 450,
      minQuantity: 100,
      description: "Bela čaša za topli napitak.",
    },
    {
      sku: "PC-040",
      name: "Papirna čaša 4 dl",
      category: "Ugostiteljstvo",
      unit: "komad",
      pricePara: 620,
      minQuantity: 100,
      description: "Čaša za hladne napitke i veće porcije kafe.",
    },
    {
      sku: "PK-CAP",
      name: "Poklopac za čašu",
      category: "Ugostiteljstvo",
      unit: "komad",
      pricePara: 190,
      minQuantity: 100,
      description: "Univerzalni poklopac za čaše od 2,5 i 4 dl.",
    },
    {
      sku: "SV-3333",
      name: "Salvete 33×33 cm",
      category: "Ugostiteljstvo",
      unit: "paket",
      pricePara: 18900,
      minQuantity: 1,
      description: "Paket od 100 salveta, dve sloja.",
    },
    {
      sku: "UB-2SL",
      name: "Ubrus dvoslojni",
      category: "Ugostiteljstvo",
      unit: "paket",
      pricePara: 24900,
      minQuantity: 1,
      description: "Paket ubrusa za stolove.",
    },
    {
      sku: "KS-RUC",
      name: "Kesa sa ručkom",
      category: "Ambalaža",
      unit: "komad",
      pricePara: 1450,
      minQuantity: 50,
      description: "Papirna kesa sa unutrašnjim slojem.",
    },
    {
      sku: "AF-50",
      name: "Aluminijumska folija 50 m",
      category: "Ambalaža",
      unit: "komad",
      pricePara: 42900,
      minQuantity: 1,
      description: "Rolna širine 30 cm.",
    },
    {
      sku: "PF-300",
      name: "Providna folija 300 m",
      category: "Ambalaža",
      unit: "komad",
      pricePara: 38900,
      minQuantity: 1,
      description: "Folija za umotavanje i zaštitu namirnica.",
    },
    {
      sku: "OD-5L",
      name: "Sredstvo za odmašćivanje 5 l",
      category: "Higijena",
      unit: "komad",
      pricePara: 189000,
      minQuantity: 1,
      description: "Profesionalno sredstvo za kuhinjske površine.",
    },
    {
      sku: "TS-1L",
      name: "Tečnost za sudove 1 l",
      category: "Higijena",
      unit: "komad",
      pricePara: 24900,
      minQuantity: 1,
      description: "Koncentrovana tečnost za ručno pranje.",
    },
    {
      sku: "RK-NIT",
      name: "Rukavice nitril M",
      category: "Higijena",
      unit: "kutija",
      pricePara: 89000,
      minQuantity: 1,
      description: "Kutija od 100 rukavica, veličina M.",
    },
    {
      sku: "SC-1KG",
      name: "Šećer u kesicama",
      category: "Ugostiteljstvo",
      unit: "kilogram",
      pricePara: 16500,
      minQuantity: 1,
      description: "Bele kesice, pakovanje po kilogramu.",
    },
    {
      sku: "KF-1KG",
      name: "Kafa mlevena 1 kg",
      category: "Ugostiteljstvo",
      unit: "kilogram",
      pricePara: 145000,
      minQuantity: 0.5,
      description: "Mešavina za espresso, veleprodajno pakovanje.",
    },
  ];

  const products: Product[] = productDefs.map((product) => {
    const gallery = galleryFor(product.sku, `/products/${product.sku}.jpg`);
    return {
    id: randomUUID(),
    organizationId: orgId,
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
    createdAt: ago(80),
    updatedAt: ago(4),
    };
  });

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
    id: randomUUID(),
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
        id: randomUUID(),
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
    const orderId = randomUUID();
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
      idempotencyKey: randomUUID(),
      confirmationToken: randomUUID(),
      paymentMethod: null,
      customerSnapshot: {
        businessName: customer.businessName,
        contactName: customer.contactName,
        email: customer.email,
        phone: customer.phone,
        pib: customer.pib,
        address: customer.address,
        city: customer.city,
      },
      customerEmailStatus: "skipped",
      supplierEmailStatus: "skipped",
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    orders.push(order);
    orderItems.push(...items);
    statusHistory.push({
      id: randomUUID(),
      orderId,
      organizationId: orgId,
      fromStatus: null,
      toStatus: "nova",
      actorName: "Sistem",
      createdAt: input.createdAt,
    });
    if (input.status !== "nova") {
      statusHistory.push({
        id: randomUUID(),
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
        createdAt: ago(120),
      },
    ],
    sessions: [],
    organizations: [organization],
    members: [
      {
        id: randomUUID(),
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
  };
  ensureRetailDemo(database);
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
    id: randomUUID(),
    organizationId,
    name: "Odeća",
    sortOrder: 1,
    createdAt: now,
  };
  const jewelry: Category = {
    id: randomUUID(),
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
    id: randomUUID(),
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

export function ensureRetailDemo(db: DemoDatabase) {
  const renamed = renameSupplyHouse(db);
  const legacy = db.organizations.find((organization) => organization.slug === "kafa-kutak");
  if (legacy) {
    const now = new Date().toISOString();
    fillBoutique(legacy, now);
    db.categories = db.categories.filter((category) => category.organizationId !== legacy.id);
    db.products = db.products.filter((product) => product.organizationId !== legacy.id);
    const catalog = boutiqueCatalog(legacy.id, now);
    db.categories.push(...catalog.categories);
    db.products.push(...catalog.items);
    return true;
  }
  const existing = db.organizations.find((organization) => organization.slug === BOUTIQUE_SLUG);
  if (existing) return backfillBoutiqueSales(db, existing.id) || renamed;
  const now = new Date().toISOString();
  const organization: Organization = {
    id: randomUUID(),
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
  return true;
}
