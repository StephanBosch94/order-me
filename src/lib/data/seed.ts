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
    name: "Gastro Supply",
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
    orderPrefix: "GS",
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

  const products: Product[] = productDefs.map((product) => ({
    id: randomUUID(),
    organizationId: orgId,
    categoryId: categoryId(product.category),
    name: product.name,
    sku: product.sku,
    description: product.description,
    unit: product.unit,
    pricePara: product.pricePara,
    imageUrl: `/products/${product.sku}.svg`,
    active: true,
    minQuantity: product.minQuantity,
    createdAt: ago(80),
    updatedAt: ago(4),
  }));

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

  return {
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
}
