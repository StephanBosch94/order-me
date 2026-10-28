import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CsvProductRow } from "@/lib/csv";
import { RESERVED_SLUGS } from "@/lib/constants";
import type { CommerceRepository, CreateOrganizationInput } from "@/lib/data/repository";
import { priceOrderLines } from "@/lib/data/pricing";
import {
  createSeedDatabase,
  emptyDatabase,
  type DemoDatabase,
  type DemoMembership,
  type DemoUser,
} from "@/lib/data/seed";
import type {
  Category,
  CreateOrderResult,
  Customer,
  CustomerDetail,
  CustomerInput,
  CustomerSummary,
  DashboardData,
  EmailDelivery,
  ImportResult,
  Order,
  OrderDetail,
  OrderItem,
  OrderListItem,
  OrderListQuery,
  OrderStatus,
  Organization,
  OrganizationInput,
  Paginated,
  Product,
  ProductInput,
  PublicCatalog,
  PublicOrderInput,
  PublicOrderView,
  PublicSupplier,
} from "@/lib/data/types";
import { DataError } from "@/lib/errors";
import { belgradeDateKey, belgradeMonthKey, belgradeYear } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/password";
import { fold, orderPrefixFromName } from "@/lib/text";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const SESSION_MS = 14 * 24 * 60 * 60 * 1000;

function toPublicSupplier(organization: Organization): PublicSupplier {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    email: organization.email,
    phone: organization.phone,
    address: organization.address,
    city: organization.city,
    pib: organization.pib,
    mb: organization.mb,
    logoUrl: organization.logoUrl,
  };
}

function orderDetail(db: DemoDatabase, order: Order): OrderDetail {
  return {
    ...order,
    items: db.orderItems.filter((item) => item.orderId === order.id),
    history: db.statusHistory
      .filter((event) => event.orderId === order.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

function orderListItem(db: DemoDatabase, order: Order): OrderListItem {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    totalPara: order.totalPara,
    createdAt: order.createdAt,
    businessName: order.customerSnapshot.businessName,
    contactName: order.customerSnapshot.contactName,
    itemCount: db.orderItems.filter((item) => item.orderId === order.id).length,
  };
}

function snapshot(customer: Customer) {
  return {
    businessName: customer.businessName,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    pib: customer.pib,
    address: customer.address,
    city: customer.city,
  };
}

export class DemoStore implements CommerceRepository {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly options: { seed?: boolean } = { seed: true },
  ) {}

  async emailExists(email: string) {
    return this.exclusive(async (db) =>
      db.users.some((user) => user.email.toLowerCase() === email.toLowerCase()),
    );
  }

  async createUser(input: { name: string; email: string; password: string }) {
    const passwordHash = await hashPassword(input.password);
    return this.exclusive(async (db) => {
      if (db.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
        throw new DataError("Nalog sa ovom email adresom već postoji.", "conflict");
      }
      const user: DemoUser = {
        id: randomUUID(),
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      return { id: user.id, email: user.email, name: user.name };
    });
  }

  async verifyCredentials(email: string, password: string) {
    const db = await this.read();
    const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return null;
    return { id: user.id, email: user.email, name: user.name };
  }

  async createSession(userId: string) {
    const token = randomBytes(32).toString("hex");
    await this.exclusive(async (db) => {
      db.sessions.push({
        id: randomUUID(),
        userId,
        token,
        expiresAt: new Date(Date.now() + SESSION_MS).toISOString(),
      });
    });
    return token;
  }

  async getUserIdBySession(token: string) {
    return this.exclusive(async (db) => {
      const now = Date.now();
      db.sessions = db.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
      return db.sessions.find((session) => session.token === token)?.userId ?? null;
    });
  }

  async deleteSession(token: string) {
    await this.exclusive(async (db) => {
      db.sessions = db.sessions.filter((session) => session.token !== token);
    });
  }

  async createOrganization(input: CreateOrganizationInput) {
    return this.exclusive(async (db) => {
      assertSlugAvailable(db, input.slug);
      const now = new Date().toISOString();
      const organization: Organization = {
        id: randomUUID(),
        name: input.name,
        slug: input.slug,
        email: input.userEmail,
        notificationEmail: input.userEmail,
        phone: input.phone,
        address: "",
        city: "",
        pib: "",
        mb: "",
        logoUrl: null,
        orderPrefix: orderPrefixFromName(input.name),
        nextOrderNumber: 1001,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      const member: DemoMembership = {
        id: randomUUID(),
        organizationId: organization.id,
        userId: input.userId,
        role: "owner",
        createdAt: now,
      };
      db.organizations.push(organization);
      db.members.push(member);
      return organization;
    });
  }

  async getOrganization(id: string) {
    const db = await this.read();
    return db.organizations.find((organization) => organization.id === id) ?? null;
  }

  async getAccount(userId: string) {
    const db = await this.read();
    const user = db.users.find((item) => item.id === userId);
    const member = db.members.find((item) => item.userId === userId);
    if (!user || !member) return null;
    const organization = db.organizations.find((item) => item.id === member.organizationId);
    if (!organization) return null;
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
      organization,
    };
  }

  async updateOrganization(id: string, input: OrganizationInput) {
    return this.exclusive(async (db) => {
      const organization = db.organizations.find((item) => item.id === id);
      if (!organization) throw new DataError("Firma nije pronađena.", "not_found");
      assertSlugAvailable(db, input.slug, id);
      Object.assign(organization, {
        ...input,
        logoUrl: input.logoUrl,
        updatedAt: new Date().toISOString(),
      });
      return organization;
    });
  }

  async isSlugTaken(slug: string, exceptId?: string) {
    const db = await this.read();
    return slugTaken(db, slug, exceptId);
  }

  async listCategories(organizationId: string) {
    const db = await this.read();
    return db.categories
      .filter((category) => category.organizationId === organizationId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "sr"));
  }

  async listProducts(organizationId: string) {
    const db = await this.read();
    return db.products
      .filter((product) => product.organizationId === organizationId)
      .sort((a, b) => a.name.localeCompare(b.name, "sr"));
  }

  async getProduct(organizationId: string, productId: string) {
    const db = await this.read();
    return (
      db.products.find(
        (product) => product.id === productId && product.organizationId === organizationId,
      ) ?? null
    );
  }

  async createProduct(organizationId: string, input: ProductInput) {
    return this.exclusive(async (db) => {
      const categoryId = await resolveCategory(db, organizationId, input);
      const now = new Date().toISOString();
      const product: Product = {
        id: randomUUID(),
        organizationId,
        categoryId,
        name: input.name,
        sku: input.sku,
        description: input.description,
        unit: input.unit,
        pricePara: input.pricePara,
        imageUrl: input.imageUrl ?? null,
        active: input.active,
        minQuantity: input.minQuantity,
        createdAt: now,
        updatedAt: now,
      };
      db.products.push(product);
      return product;
    });
  }

  async updateProduct(organizationId: string, productId: string, input: ProductInput) {
    return this.exclusive(async (db) => {
      const product = db.products.find(
        (item) => item.id === productId && item.organizationId === organizationId,
      );
      if (!product) return null;
      const categoryId = await resolveCategory(db, organizationId, input);
      product.categoryId = categoryId;
      product.name = input.name;
      product.sku = input.sku;
      product.description = input.description;
      product.unit = input.unit;
      product.pricePara = input.pricePara;
      product.active = input.active;
      product.minQuantity = input.minQuantity;
      if (input.imageUrl !== undefined) product.imageUrl = input.imageUrl;
      product.updatedAt = new Date().toISOString();
      return product;
    });
  }

  async importProducts(organizationId: string, rows: CsvProductRow[]) {
    return this.exclusive(async (db) => {
      const result: ImportResult = { created: 0, errors: [] };
      for (const row of rows) {
        try {
          const categoryId = row.category
            ? getOrCreateCategory(db, organizationId, row.category)
            : null;
          const now = new Date().toISOString();
          db.products.push({
            id: randomUUID(),
            organizationId,
            categoryId,
            name: row.name,
            sku: row.sku,
            description: row.description,
            unit: row.unit,
            pricePara: row.pricePara,
            imageUrl: null,
            active: row.active,
            minQuantity: row.minQuantity,
            createdAt: now,
            updatedAt: now,
          });
          result.created += 1;
        } catch (error) {
          result.errors.push({
            row: row.row,
            message: error instanceof Error ? error.message : "Red nije uvezen.",
          });
        }
      }
      return result;
    });
  }

  async listCustomers(organizationId: string, query?: string) {
    const db = await this.read();
    const needle = fold(query ?? "");
    return db.customers
      .filter((customer) => customer.organizationId === organizationId)
      .filter((customer) => {
        if (!needle) return true;
        return [customer.businessName, customer.contactName, customer.email, customer.city]
          .map(fold)
          .some((value) => value.includes(needle));
      })
      .map((customer) => summarizeCustomer(db, customer))
      .sort((a, b) => a.businessName.localeCompare(b.businessName, "sr"));
  }

  async getCustomer(organizationId: string, customerId: string) {
    const db = await this.read();
    const customer = db.customers.find(
      (item) => item.id === customerId && item.organizationId === organizationId,
    );
    if (!customer) return null;
    const orders = db.orders
      .filter((order) => order.customerId === customer.id && order.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => orderListItem(db, order));
    const activeOrders = db.orders.filter(
      (order) =>
        order.customerId === customer.id &&
        order.organizationId === organizationId &&
        order.status !== "otkazana",
    );
    const detail: CustomerDetail = {
      ...customer,
      orders,
      orderCount: orders.length,
      totalPara: activeOrders.reduce((sum, order) => sum + order.totalPara, 0),
    };
    return detail;
  }

  async updateCustomer(organizationId: string, customerId: string, input: CustomerInput) {
    return this.exclusive(async (db) => {
      const customer = db.customers.find(
        (item) => item.id === customerId && item.organizationId === organizationId,
      );
      if (!customer) return null;
      Object.assign(customer, input, { updatedAt: new Date().toISOString() });
      return customer;
    });
  }

  async listOrders(organizationId: string, query: OrderListQuery) {
    const db = await this.read();
    let rows = db.orders.filter((order) => order.organizationId === organizationId);
    if (query.status && query.status !== "all") {
      rows = rows.filter((order) => order.status === query.status);
    }
    const needle = fold(query.q ?? "");
    if (needle) {
      rows = rows.filter((order) =>
        [order.number, order.customerSnapshot.businessName, order.customerSnapshot.contactName]
          .map(fold)
          .some((value) => value.includes(needle)),
      );
    }
    if (query.from) {
      const from = query.from;
      rows = rows.filter((order) => belgradeDateKey(order.createdAt) >= from);
    }
    if (query.to) {
      const to = query.to;
      rows = rows.filter((order) => belgradeDateKey(order.createdAt) <= to);
    }

    const sort = query.sort ?? "newest";
    rows.sort((a, b) => {
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "total_asc") return a.totalPara - b.totalPara;
      if (sort === "total_desc") return b.totalPara - a.totalPara;
      return b.createdAt.localeCompare(a.createdAt);
    });

    const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), 50);
    const page = Math.max(query.page ?? 1, 1);
    const start = (page - 1) * pageSize;
    const pageResult: Paginated<OrderListItem> = {
      items: rows.slice(start, start + pageSize).map((order) => orderListItem(db, order)),
      total: rows.length,
      page,
      pageSize,
    };
    return pageResult;
  }

  async getOrder(organizationId: string, orderId: string) {
    const db = await this.read();
    const order = db.orders.find(
      (item) => item.id === orderId && item.organizationId === organizationId,
    );
    return order ? orderDetail(db, order) : null;
  }

  async getOrderByToken(token: string) {
    const db = await this.read();
    const order = db.orders.find((item) => item.confirmationToken === token);
    if (!order) return null;
    const organization = db.organizations.find((item) => item.id === order.organizationId);
    if (!organization) return null;
    const view: PublicOrderView = {
      order: orderDetail(db, order),
      supplier: toPublicSupplier(organization),
    };
    return view;
  }

  async createPublicOrder(input: PublicOrderInput, ip: string): Promise<CreateOrderResult> {
    return this.exclusive(async (db) => {
      const organization = db.organizations.find(
        (item) => item.slug === input.slug && item.active,
      );
      if (!organization) return { ok: false, message: "Dobavljač nije pronađen." };

      const existing = db.orders.find(
        (order) =>
          order.organizationId === organization.id && order.idempotencyKey === input.idempotencyKey,
      );
      if (existing) {
        return {
          ok: true,
          duplicate: true,
          order: orderDetail(db, existing),
          supplier: toPublicSupplier(organization),
        };
      }

      if (!consumeRateLimit(db, `${organization.id}:${ip || "local"}`)) {
        return {
          ok: false,
          message: "Previše pokušaja. Sačekajte nekoliko minuta i pokušajte ponovo.",
        };
      }

      const catalog = db.products.filter(
        (product) => product.organizationId === organization.id && product.active,
      );
      const priced = priceOrderLines(catalog, input.items);
      if (!priced.ok) return priced;

      const now = new Date().toISOString();
      const email = input.email.toLowerCase();
      let customer = db.customers.find(
        (item) => item.organizationId === organization.id && item.email.toLowerCase() === email,
      );
      if (!customer) {
        customer = {
          id: randomUUID(),
          organizationId: organization.id,
          businessName: input.businessName,
          contactName: input.contactName,
          email,
          phone: input.phone,
          pib: input.pib,
          address: input.address,
          city: input.city,
          notes: "",
          createdAt: now,
          updatedAt: now,
        };
        db.customers.push(customer);
      } else {
        customer.businessName = input.businessName;
        customer.contactName = input.contactName;
        customer.phone = input.phone;
        customer.pib = input.pib || customer.pib;
        customer.address = input.address || customer.address;
        customer.city = input.city || customer.city;
        customer.updatedAt = now;
      }

      const number = `${organization.orderPrefix}-${belgradeYear(now)}-${String(organization.nextOrderNumber).padStart(4, "0")}`;
      organization.nextOrderNumber += 1;
      organization.updatedAt = now;

      const order: Order = {
        id: randomUUID(),
        organizationId: organization.id,
        customerId: customer.id,
        number,
        status: "nova",
        notes: input.notes,
        subtotalPara: priced.subtotalPara,
        totalPara: priced.subtotalPara,
        idempotencyKey: input.idempotencyKey,
        confirmationToken: randomUUID(),
        customerSnapshot: snapshot(customer),
        customerEmailStatus: "pending",
        supplierEmailStatus: "pending",
        createdAt: now,
        updatedAt: now,
      };
      db.orders.push(order);
      for (const line of priced.items) {
        const item: OrderItem = {
          id: randomUUID(),
          orderId: order.id,
          organizationId: organization.id,
          productId: line.productId,
          name: line.name,
          sku: line.sku,
          unit: line.unit,
          quantity: line.quantity,
          unitPricePara: line.unitPricePara,
          lineTotalPara: line.lineTotalPara,
        };
        db.orderItems.push(item);
      }
      db.statusHistory.push({
        id: randomUUID(),
        orderId: order.id,
        organizationId: organization.id,
        fromStatus: null,
        toStatus: "nova",
        actorName: "Kupac",
        createdAt: now,
      });

      return {
        ok: true,
        duplicate: false,
        order: orderDetail(db, order),
        supplier: toPublicSupplier(organization),
      };
    });
  }

  async updateOrderStatus(
    organizationId: string,
    orderId: string,
    status: OrderStatus,
    actorName: string,
  ) {
    return this.exclusive(async (db) => {
      const order = db.orders.find(
        (item) => item.id === orderId && item.organizationId === organizationId,
      );
      if (!order) return null;
      if (order.status !== status) {
        const now = new Date().toISOString();
        db.statusHistory.push({
          id: randomUUID(),
          orderId: order.id,
          organizationId,
          fromStatus: order.status,
          toStatus: status,
          actorName,
          createdAt: now,
        });
        order.status = status;
        order.updatedAt = now;
      }
      return orderDetail(db, order);
    });
  }

  async setEmailStatus(orderId: string, customer: EmailDelivery, supplier: EmailDelivery) {
    await this.exclusive(async (db) => {
      const order = db.orders.find((item) => item.id === orderId);
      if (!order) return;
      order.customerEmailStatus = customer;
      order.supplierEmailStatus = supplier;
      order.updatedAt = new Date().toISOString();
    });
  }

  async getDashboard(organizationId: string): Promise<DashboardData> {
    const db = await this.read();
    const orders = db.orders.filter((order) => order.organizationId === organizationId);
    const products = db.products.filter((product) => product.organizationId === organizationId);
    const month = belgradeMonthKey(new Date().toISOString());
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);

    return {
      newOrders: orders.filter(
        (order) => order.status !== "otkazana" && new Date(order.createdAt).getTime() >= weekAgo,
      ).length,
      awaitingConfirmation: orders.filter((order) => order.status === "nova").length,
      processedThisMonth: orders.filter(
        (order) =>
          (order.status === "potvrdjena" ||
            order.status === "u_pripremi" ||
            order.status === "isporucena") &&
          belgradeMonthKey(order.createdAt) === month,
      ).length,
      monthValuePara: orders
        .filter(
          (order) => order.status !== "otkazana" && belgradeMonthKey(order.createdAt) === month,
        )
        .reduce((sum, order) => sum + order.totalPara, 0),
      activeProducts: products.filter((product) => product.active).length,
      recentOrders: recent.map((order) => orderListItem(db, order)),
      hasProducts: products.length > 0,
      hasOrders: orders.length > 0,
    };
  }

  async getPublicCatalog(slug: string): Promise<PublicCatalog | null> {
    const db = await this.read();
    const organization = db.organizations.find((item) => item.slug === slug && item.active);
    if (!organization) return null;
    const categories = db.categories
      .filter((category) => category.organizationId === organization.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "sr"));
    const products = db.products
      .filter((product) => product.organizationId === organization.id && product.active)
      .sort((a, b) => a.name.localeCompare(b.name, "sr"));
    return { supplier: toPublicSupplier(organization), categories, products };
  }

  private async read(): Promise<DemoDatabase> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as DemoDatabase;
      if (parsed.version !== 1) {
        throw new DataError("Demo baza ima nepoznatu verziju.", "validation");
      }
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const db = this.options.seed === false ? emptyDatabase() : await createSeedDatabase();
      await this.persist(db);
      return db;
    }
  }

  private async persist(db: DemoDatabase) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(db, null, 2));
    await rename(temporary, this.filePath);
  }

  private async exclusive<T>(fn: (db: DemoDatabase) => Promise<T> | T): Promise<T> {
    const job = this.chain.then(async () => {
      const db = await this.read();
      const result = await fn(db);
      await this.persist(db);
      return result;
    });
    this.chain = job.then(
      () => undefined,
      () => undefined,
    );
    return job;
  }
}

function slugTaken(db: DemoDatabase, slug: string, exceptId?: string) {
  return db.organizations.some(
    (organization) => organization.slug === slug && organization.id !== exceptId,
  );
}

function assertSlugAvailable(db: DemoDatabase, slug: string, exceptId?: string) {
  if (RESERVED_SLUGS.has(slug) || slugTaken(db, slug, exceptId)) {
    throw new DataError("Ova adresa je već zauzeta.", "conflict");
  }
}

function getOrCreateCategory(db: DemoDatabase, organizationId: string, name: string) {
  const trimmed = name.trim();
  const existing = db.categories.find(
    (category) =>
      category.organizationId === organizationId &&
      fold(category.name) === fold(trimmed),
  );
  if (existing) return existing.id;
  const category: Category = {
    id: randomUUID(),
    organizationId,
    name: trimmed,
    sortOrder: db.categories.filter((item) => item.organizationId === organizationId).length + 1,
    createdAt: new Date().toISOString(),
  };
  db.categories.push(category);
  return category.id;
}

function resolveCategory(db: DemoDatabase, organizationId: string, input: ProductInput) {
  if (input.newCategory.trim()) return getOrCreateCategory(db, organizationId, input.newCategory);
  if (!input.categoryId) return null;
  const category = db.categories.find(
    (item) => item.id === input.categoryId && item.organizationId === organizationId,
  );
  return category?.id ?? null;
}

function summarizeCustomer(db: DemoDatabase, customer: Customer): CustomerSummary {
  const orders = db.orders.filter(
    (order) => order.customerId === customer.id && order.organizationId === customer.organizationId,
  );
  const billable = orders.filter((order) => order.status !== "otkazana");
  const last = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    id: customer.id,
    businessName: customer.businessName,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    orderCount: orders.length,
    totalPara: billable.reduce((sum, order) => sum + order.totalPara, 0),
    lastOrderAt: last?.createdAt ?? null,
  };
}

function consumeRateLimit(db: DemoDatabase, key: string) {
  const now = Date.now();
  let bucket = db.rateLimits.find((item) => item.key === key);
  if (!bucket) {
    bucket = { key, hits: [] };
    db.rateLimits.push(bucket);
  }
  bucket.hits = bucket.hits.filter((hit) => now - hit < RATE_WINDOW_MS);
  if (bucket.hits.length >= RATE_LIMIT) return false;
  bucket.hits.push(now);
  return true;
}

let singleton: DemoStore | null = null;

export function getDemoStore() {
  if (!singleton) {
    singleton = new DemoStore(path.join(process.cwd(), ".data", "demo-db.json"), { seed: true });
  }
  return singleton;
}
