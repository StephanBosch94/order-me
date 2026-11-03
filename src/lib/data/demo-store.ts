import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CsvCustomerRow, CsvProductRow } from "@/lib/csv";
import { loadNetlifyDatabase, netlifyDemoEnabled, saveNetlifyDatabase } from "@/lib/db/netlify-state";
import { isCompanyOrder } from "@/lib/company-order";
import { nextCustomerCode, normalizeCustomerCode, partyForPib, paymentTermFor } from "@/lib/customers";
import { salesFollowUps } from "@/lib/follow-ups";
import type { SessionCarry } from "@/lib/session-token";
import { RESERVED_SLUGS, STORE_CLOSED_MESSAGE, channelForAudience } from "@/lib/constants";
import type { CommerceRepository, CreateBuyerInput, CreateOrganizationInput, UpdateBuyerInput } from "@/lib/data/repository";
import { syncProductImages } from "@/lib/data/images";
import {
  isFractionalUnit,
  nextStockQuantities,
  normalizeStockQuantity,
  priceOrderLines,
  stockDirectionForStatus,
  type StockDirection,
} from "@/lib/data/pricing";
import {
  createSeedDatabase,
  emptyDatabase,
  applyDemoPhotos,
  applyDemoGalleries,
  ensureRetailDemo,
  type DemoDatabase,
  type DemoMembership,
  type DemoUser,
} from "@/lib/data/seed";
import type {
  BuyerOrder,
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
  OrganizationMember,
  Paginated,
  PlatformInvoice,
  PlatformSupplier,
  Product,
  ProductInput,
  PublicCatalog,
  PublicOrderInput,
  PublicOrderView,
  PublicSupplier,
  StaffOrderInput,
  SessionAccount,
  Subscription,
  SubscriptionStatus,
} from "@/lib/data/types";
import { monthOrderUsage } from "@/lib/data/usage";
import { DataError } from "@/lib/errors";
import { belgradeDateKey, belgradeMonthKey, belgradeYear, currentBelgradeMonthKey } from "@/lib/format";
import { loadDatabase, saveDatabase } from "@/lib/db/postgres-state";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getDataMode, getLocalDataDir } from "@/lib/config";
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
    brandColor: organization.brandColor,
    coverUrl: organization.coverUrl,
    description: organization.description,
    channel: organization.channel,
    audience: organization.audience,
  };
}

function applyStockMovement(
  products: Product[],
  lines: { productId: string | null; quantity: number }[],
  direction: StockDirection,
) {
  const now = new Date().toISOString();
  for (const update of nextStockQuantities(products, lines, direction)) {
    const product = products.find((item) => item.id === update.id);
    if (!product) continue;
    product.stockQuantity = update.stockQuantity;
    product.updatedAt = now;
  }
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
  const customer = db.customers.find(
    (item) => item.id === order.customerId && item.organizationId === order.organizationId,
  );
  const party =
    customer?.party === "fizicka" || customer?.party === "pravna"
      ? customer.party
      : partyForPib(order.customerSnapshot.pib);
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    totalPara: order.totalPara,
    createdAt: order.createdAt,
    businessName: order.customerSnapshot.businessName,
    contactName: order.customerSnapshot.contactName,
    itemCount: db.orderItems.filter((item) => item.orderId === order.id).length,
    paymentMethod: order.paymentMethod,
    pib: order.customerSnapshot.pib,
    party,
  };
}

function snapshot(customer: Customer, extra: { bankAccount?: string; mb?: string; postalCode?: string; confirmationEmail?: string } = {}) {
  return {
    code: customer.code,
    businessName: customer.businessName,
    contactName: customer.contactName,
    email: customer.email,
    confirmationEmail: extra.confirmationEmail?.trim() ?? "",
    phone: customer.phone,
    pib: customer.pib,
    mb: extra.mb ?? "",
    address: customer.address,
    postalCode: extra.postalCode ?? "",
    city: customer.city,
    bankAccount: extra.bankAccount ?? "",
  };
}

export class DemoStore implements CommerceRepository {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly options: { seed?: boolean; postgres?: boolean } = { seed: true },
  ) {}

  async emailExists(email: string) {
    return this.exclusive(async (db) =>
      db.users.some((user) => user.email.toLowerCase() === email.toLowerCase()),
    );
  }

  async createUser(input: {
    name: string;
    email: string;
    password: string;
    kind?: "supplier" | "buyer";
    businessName?: string;
    phone?: string;
    address?: string;
    city?: string;
    pib?: string;
    mb?: string;
    postalCode?: string;
    bankAccount?: string;
    confirmationEmail?: string;
  }) {
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
        kind: input.kind ?? "supplier",
        businessName: input.businessName ?? "",
        phone: input.phone ?? "",
        address: input.address ?? "",
        city: input.city ?? "",
        pib: input.pib ?? "",
        mb: input.mb ?? "",
        postalCode: input.postalCode ?? "",
        bankAccount: input.bankAccount ?? "",
        confirmationEmail: input.confirmationEmail?.trim() ?? "",
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

  async sessionCarry(userId: string): Promise<SessionCarry | null> {
    const db = await this.read();
    const user = db.users.find((item) => item.id === userId);
    if (!user) return null;
    const member = db.members.find((item) => item.userId === userId);
    const organization = member ? db.organizations.find((item) => item.id === member.organizationId) : undefined;
    return {
      user: { ...user },
      member: member ? { ...member } : undefined,
      organization: organization ? { ...organization, efakturaApiKey: "" } : undefined,
    };
  }

  async ensureCarriedAccount(carry: SessionCarry) {
    await this.exclusive(async (db) => {
      const user = carry.user;
      if (!db.users.some((item) => item.id === user.id)) {
        if (db.users.some((item) => item.email.toLowerCase() === user.email.toLowerCase())) return;
        db.users.push({ ...user });
      }
      const organization = carry.organization;
      if (organization && !db.organizations.some((item) => item.id === organization.id)) {
        let slug = organization.slug;
        let suffix = 2;
        while (db.organizations.some((item) => item.slug === slug)) {
          slug = `${organization.slug}-${suffix}`;
          suffix += 1;
          if (suffix > 30) return;
        }
        db.organizations.push({ ...organization, slug, efakturaApiKey: "" });
      }
      const member = carry.member;
      if (
        member &&
        db.users.some((item) => item.id === member.userId) &&
        db.organizations.some((item) => item.id === member.organizationId) &&
        !db.members.some((item) => item.userId === member.userId && item.organizationId === member.organizationId)
      ) {
        db.members.push({ ...member });
      }
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
        brandColor: null,
        coverUrl: null,
        description: "",
        audience: input.audience ?? (input.channel === "b2c" ? "fizicka" : "pravna"),
        channel: channelForAudience(input.audience ?? (input.channel === "b2c" ? "fizicka" : "pravna")),
        orderPrefix: orderPrefixFromName(input.name),
        nextOrderNumber: 1001,
        active: true,
        trackStock: false,
        efakturaApiKey: "",
        efakturaEnabled: false,
        efakturaEnvironment: "demo",
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
      const plan = (db.plans ?? []).find((item) => item.name === "Osnovni") ?? db.plans?.[0];
      if (plan && !(db.subscriptions ?? []).some((item) => item.organizationId === organization.id)) {
        db.subscriptions ??= [];
        db.subscriptions.push({
          id: randomUUID(),
          organizationId: organization.id,
          planId: plan.id,
          status: "aktivna",
          periodStart: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      const owner = db.users.find((user) => user.id === input.userId);
      if (owner) owner.kind = "supplier";
      return organization;
    });
  }

  async createBuyerProfile(input: CreateBuyerInput) {
    await this.exclusive(async (db) => {
      const user = db.users.find((item) => item.id === input.userId);
      if (!user) throw new DataError("Nalog nije pronađen.", "not_found");
      if (db.members.some((member) => member.userId === user.id)) {
        throw new DataError("Ovaj nalog je već nalog prodavca.", "conflict");
      }
      user.kind = "buyer";
      user.name = input.name;
      user.businessName = input.businessName;
      user.phone = input.phone;
      user.address = input.address;
      user.city = input.city;
      user.pib = input.pib;
      user.mb = input.mb;
      user.postalCode = input.postalCode;
      user.bankAccount = input.bankAccount;
      user.confirmationEmail = input.confirmationEmail.trim();
    });
  }

  async saveBuyerBankAccount(userId: string, bankAccount: string) {
    await this.exclusive(async (db) => {
      const user = db.users.find((item) => item.id === userId && item.kind === "buyer");
      if (!user) throw new DataError("Nalog nije pronađen.", "not_found");
      user.bankAccount = bankAccount;
    });
  }

  async updateBuyerProfile(userId: string, input: UpdateBuyerInput) {
    await this.exclusive(async (db) => {
      const user = db.users.find((item) => item.id === userId && item.kind === "buyer");
      if (!user) throw new DataError("Nalog nije pronađen.", "not_found");
      user.name = input.name;
      user.businessName = input.businessName;
      user.phone = input.phone;
      user.address = input.address;
      user.city = input.city;
      user.pib = input.pib;
      user.mb = input.mb;
      user.postalCode = input.postalCode;
      user.bankAccount = input.bankAccount;
      user.confirmationEmail = input.confirmationEmail.trim();
    });
  }

  async saveBuyerCompanyDetails(userId: string, input: { mb: string; postalCode: string }) {
    await this.exclusive(async (db) => {
      const user = db.users.find((item) => item.id === userId && item.kind === "buyer");
      if (!user) throw new DataError("Nalog nije pronađen.", "not_found");
      user.mb = input.mb;
      user.postalCode = input.postalCode;
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

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    const db = await this.read();
    return db.members
      .filter((member) => member.organizationId === organizationId)
      .flatMap((member) => {
        const user = db.users.find((item) => item.id === member.userId);
        if (!user) return [];
        return [
          {
            id: member.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            role: member.role,
            createdAt: member.createdAt,
          },
        ];
      })
      .sort(compareMembers);
  }

  async addStaffMember(
    organizationId: string,
    input: { name: string; email: string; password: string },
  ): Promise<OrganizationMember> {
    const passwordHash = await hashPassword(input.password);
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    return this.exclusive(async (db) => {
      if (!db.organizations.some((organization) => organization.id === organizationId)) {
        throw new DataError("Prodavnica nije pronađena.", "not_found");
      }
      if (db.users.some((user) => user.email.toLowerCase() === email)) {
        throw new DataError("Nalog sa ovom email adresom već postoji.", "conflict");
      }
      const now = new Date().toISOString();
      const user: DemoUser = {
        id: randomUUID(),
        email,
        name,
        passwordHash,
        kind: "supplier",
        businessName: "",
        phone: "",
        address: "",
        city: "",
        pib: "",
        mb: "",
        postalCode: "",
        bankAccount: "",
        confirmationEmail: "",
        createdAt: now,
      };
      const member: DemoMembership = {
        id: randomUUID(),
        organizationId,
        userId: user.id,
        role: "staff",
        createdAt: now,
      };
      db.users.push(user);
      db.members.push(member);
      return {
        id: member.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: member.role,
        createdAt: member.createdAt,
      };
    });
  }

  async resolveAccount(userId: string): Promise<SessionAccount | null> {
    const db = await this.read();
    const user = db.users.find((item) => item.id === userId);
    if (!user) return null;
    if (user.kind === "platform") {
      return { kind: "platform", userId: user.id, name: user.name, email: user.email };
    }
    if (user.kind === "buyer") {
      return {
        kind: "buyer",
        userId: user.id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        phone: user.phone,
        address: user.address,
        city: user.city,
        pib: user.pib,
        mb: user.mb ?? "",
        postalCode: user.postalCode ?? "",
        bankAccount: user.bankAccount ?? "",
        confirmationEmail: user.confirmationEmail?.trim() ?? "",
      };
    }
    const account = await this.getAccount(userId);
    return account ? { ...account, kind: "supplier" } : null;
  }

  async listBuyerOrders(userId: string): Promise<BuyerOrder[]> {
    const db = await this.read();
    return db.orders
      .filter((order) => order.buyerUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => {
        const organization = db.organizations.find((item) => item.id === order.organizationId);
        return {
          id: order.id,
          number: order.number,
          status: order.status,
          totalPara: order.totalPara,
          createdAt: order.createdAt,
          supplierName: organization?.name ?? "Dobavljač",
          supplierSlug: organization?.slug ?? "",
          supplierChannel: organization?.channel === "b2c" ? "b2c" : "b2b",
          supplierAudience: organization?.audience === "fizicka" || organization?.audience === "oba" ? organization.audience : "pravna",
          confirmationToken: order.confirmationToken,
          itemCount: db.orderItems.filter((item) => item.orderId === order.id).length,
          items: db.orderItems
            .filter((item) => item.orderId === order.id)
            .map((item) => {
              const product = item.productId ? db.products.find((entry) => entry.id === item.productId) : undefined;
              return {
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                imageUrl: product?.imageUrls[0] ?? product?.imageUrl ?? null,
              };
            }),
        };
      });
  }

  async updateOrganization(id: string, input: OrganizationInput) {
    return this.exclusive(async (db) => {
      const organization = db.organizations.find((item) => item.id === id);
      if (!organization) throw new DataError("Firma nije pronađena.", "not_found");
      assertSlugAvailable(db, input.slug, id);
      Object.assign(organization, {
        ...input,
        logoUrl: input.logoUrl,
        channel: channelForAudience(input.audience),
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
        salePricePara: input.salePricePara,
        ...syncProductImages(input.imageUrl, input.imageUrls),
        active: input.active,
        minQuantity: input.minQuantity,
        stockQuantity: input.stockQuantity,
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
      product.salePricePara = input.salePricePara;
      product.active = input.active;
      product.minQuantity = input.minQuantity;
      product.stockQuantity = input.stockQuantity;
      if (input.imageUrls !== undefined || input.imageUrl !== undefined) {
        const images = syncProductImages(
          input.imageUrl,
          input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : []),
        );
        product.imageUrl = images.imageUrl;
        product.imageUrls = images.imageUrls;
      }
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
            salePricePara: null,
            imageUrl: null,
            imageUrls: [],
            active: row.active,
            minQuantity: row.minQuantity,
            stockQuantity: 0,
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

  async importCustomers(organizationId: string, rows: CsvCustomerRow[]) {
    return this.exclusive(async (db) => {
      const result: ImportResult = { created: 0, errors: [] };
      const own = () => db.customers.filter((item) => item.organizationId === organizationId);
      for (const row of rows) {
        try {
          const email = row.email.toLowerCase();
          if (own().some((item) => item.email.toLowerCase() === email)) {
            throw new DataError("Kupac sa ovom email adresom već postoji.", "conflict");
          }
          const code = row.code.trim()
            ? row.code.trim().toUpperCase()
            : nextCustomerCode(own().map((item) => item.code));
          if (own().some((item) => item.code.toUpperCase() === code)) {
            throw new DataError("Ova šifra je već dodeljena drugom kupcu.", "conflict");
          }
          const now = new Date().toISOString();
          db.customers.push({
            id: randomUUID(),
            organizationId,
            businessName: row.businessName,
            contactName: row.contactName,
            email,
            phone: row.phone,
            pib: row.pib,
            address: row.address,
            city: row.city,
            notes: row.notes,
            party: row.party,
            paymentTermDays: row.paymentTermDays,
            code,
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
        return [customer.code, customer.businessName, customer.contactName, customer.email, customer.city]
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
      const email = input.email.toLowerCase();
      if (
        db.customers.some(
          (item) =>
            item.organizationId === organizationId && item.id !== customer.id && item.email.toLowerCase() === email,
        )
      ) {
        throw new DataError("Kupac sa ovom email adresom već postoji.", "conflict");
      }
      const requested = normalizeCustomerCode(input.code);
      const code = requested || customer.code;
      if (
        requested &&
        db.customers.some(
          (item) =>
            item.organizationId === organizationId &&
            item.id !== customer.id &&
            normalizeCustomerCode(item.code) === code,
        )
      ) {
        throw new DataError("Ova šifra je već dodeljena drugom kupcu.", "conflict");
      }
      Object.assign(customer, input, { email, code, updatedAt: new Date().toISOString() });
      return customer;
    });
  }

  async createCustomer(organizationId: string, input: CustomerInput) {
    return this.exclusive(async (db) => {
      const email = input.email.toLowerCase();
      if (
        db.customers.some(
          (item) => item.organizationId === organizationId && item.email.toLowerCase() === email,
        )
      ) {
        throw new DataError("Kupac sa ovom email adresom već postoji.", "conflict");
      }
      const code = input.code.trim()
        ? input.code.trim().toUpperCase()
        : nextCustomerCode(
            db.customers.filter((item) => item.organizationId === organizationId).map((item) => item.code),
          );
      if (
        db.customers.some(
          (item) => item.organizationId === organizationId && item.code.toUpperCase() === code,
        )
      ) {
        throw new DataError("Ova šifra je već dodeljena drugom kupcu.", "conflict");
      }
      const now = new Date().toISOString();
      const customer: Customer = {
        id: randomUUID(),
        organizationId,
        ...input,
        email,
        code,
        createdAt: now,
        updatedAt: now,
      };
      db.customers.push(customer);
      return customer;
    });
  }

  async createStaffOrder(organizationId: string, input: StaffOrderInput) {
    return this.exclusive(async (db) => {
      const organization = db.organizations.find((item) => item.id === organizationId);
      const customer = db.customers.find(
        (item) => item.id === input.customerId && item.organizationId === organizationId,
      );
      if (!organization || !customer) return { ok: false as const, message: "Kupac nije pronađen." };
      const catalog = db.products.filter((product) => product.organizationId === organization.id);
      const priced = priceOrderLines(catalog, input.items, { enforceMinimum: false, allowInactive: true });
      if (!priced.ok) return priced;

      const now = new Date().toISOString();
      const number = `${organization.orderPrefix}-${belgradeYear(now)}-${String(organization.nextOrderNumber).padStart(4, "0")}`;
      organization.nextOrderNumber += 1;
      organization.updatedAt = now;
      const order: Order = {
        id: randomUUID(),
        organizationId: organization.id,
        customerId: customer.id,
        buyerUserId: null,
        number,
        status: "nova",
        notes: input.notes,
        subtotalPara: priced.subtotalPara,
        totalPara: priced.subtotalPara,
        idempotencyKey: randomUUID(),
        confirmationToken: randomUUID(),
        customerSnapshot: snapshot(customer),
        customerEmailStatus: "pending",
        supplierEmailStatus: "pending",
        paymentMethod: customer.party === "pravna" ? "racun" : null,
        stockHeld: organization.trackStock === true,
        sefInvoiceId: null,
        sefStatus: null,
        createdAt: now,
        updatedAt: now,
      };
      db.orders.push(order);
      for (const line of priced.items) {
        db.orderItems.push({
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
        });
      }
      db.statusHistory.push({
        id: randomUUID(),
        orderId: order.id,
        organizationId: organization.id,
        fromStatus: null,
        toStatus: "nova",
        actorName: input.actorName,
        createdAt: now,
      });
      if (organization.trackStock) applyStockMovement(catalog, priced.items, "reserve");
      return {
        ok: true as const,
        duplicate: false,
        order: orderDetail(db, order),
        supplier: toPublicSupplier(organization),
      };
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
        [order.number, order.customerSnapshot.code, order.customerSnapshot.businessName, order.customerSnapshot.contactName]
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
    if (query.company === true) rows = rows.filter((order) => isCompanyOrder(order));
    if (query.company === false) rows = rows.filter((order) => !isCompanyOrder(order));

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
      const organization = db.organizations.find((item) => item.slug === input.slug);
      if (!organization) return { ok: false, message: "Dobavljač nije pronađen." };
      if (!organization.active) return { ok: false, message: STORE_CLOSED_MESSAGE };

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
          code: nextCustomerCode(
            db.customers.filter((item) => item.organizationId === organization.id).map((item) => item.code),
          ),
          party: partyForPib(input.pib),
          paymentTermDays: paymentTermFor(partyForPib(input.pib)),
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
        buyerUserId: input.buyerUserId ?? null,
        number,
        status: "nova",
        notes: input.notes,
        subtotalPara: priced.subtotalPara,
        totalPara: priced.subtotalPara,
        idempotencyKey: input.idempotencyKey,
        confirmationToken: randomUUID(),
        customerSnapshot: snapshot(customer, {
          bankAccount: input.bankAccount ?? "",
          mb: input.mb ?? "",
          postalCode: input.postalCode ?? "",
          confirmationEmail: input.confirmationEmail ?? "",
        }),
        customerEmailStatus: "pending",
        supplierEmailStatus: "pending",
        paymentMethod: input.paymentMethod ?? null,
        stockHeld: organization.trackStock === true,
        sefInvoiceId: null,
        sefStatus: null,
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
      if (organization.trackStock) applyStockMovement(catalog, priced.items, "reserve");

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
        const organization = db.organizations.find((item) => item.id === organizationId);
        const direction =
          organization?.trackStock && order.stockHeld ? stockDirectionForStatus(order.status, status) : null;
        if (direction) {
          applyStockMovement(
            db.products.filter((product) => product.organizationId === organizationId),
            db.orderItems.filter((item) => item.orderId === order.id),
            direction,
          );
          order.stockHeld = false;
        }
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

  async saveSefInvoice(organizationId: string, orderId: string, input: { invoiceId: string; status: string }) {
    return this.exclusive(async (db) => {
      const order = db.orders.find((item) => item.id === orderId && item.organizationId === organizationId);
      if (!order) return null;
      if (order.sefInvoiceId) {
        return { invoiceId: order.sefInvoiceId, status: order.sefStatus ?? "poslata", already: true };
      }
      order.sefInvoiceId = input.invoiceId;
      order.sefStatus = input.status;
      order.updatedAt = new Date().toISOString();
      return { invoiceId: input.invoiceId, status: input.status, already: false };
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
    const awaiting = orders
      .filter((order) => order.status === "nova")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
      recentOrders: awaiting.map((order) => orderListItem(db, order)),
      followUps: salesFollowUps(
        db.customers
          .filter((customer) => customer.organizationId === organizationId)
          .map((customer) => ({
            id: customer.id,
            code: customer.code,
            businessName: customer.businessName,
            email: customer.email,
            phone: customer.phone,
            createdAt: customer.createdAt,
          })),
        orders.map((order) => ({
          customerId: order.customerId,
          status: order.status,
          totalPara: order.totalPara,
          createdAt: order.createdAt,
        })),
      ),
      hasProducts: products.length > 0,
      hasOrders: orders.length > 0,
    };
  }

  async getPublicCatalog(slug: string): Promise<PublicCatalog | null> {
    const db = await this.read();
    const organization = db.organizations.find((item) => item.slug === slug);
    if (!organization) return null;
    if (!organization.active) {
      return {
        supplier: toPublicSupplier(organization),
        categories: [],
        products: [],
        closedMessage: STORE_CLOSED_MESSAGE,
      };
    }
    const categories = db.categories
      .filter((category) => category.organizationId === organization.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "sr"));
    const products = db.products
      .filter((product) => product.organizationId === organization.id && product.active)
      .sort((a, b) => a.name.localeCompare(b.name, "sr"));
    return { supplier: toPublicSupplier(organization), categories, products };
  }

  async listPlatformSuppliers(): Promise<PlatformSupplier[]> {
    const db = await this.read();
    return platformSuppliers(db);
  }

  async setOrganizationActive(organizationId: string, active: boolean) {
    await this.exclusive(async (db) => {
      const organization = db.organizations.find((item) => item.id === organizationId);
      if (!organization) throw new DataError("Dobavljač nije pronađen.", "not_found");
      organization.active = active;
      organization.updatedAt = new Date().toISOString();
    });
  }

  async listPlans() {
    const db = await this.read();
    return [...(db.plans ?? [])].sort((a, b) => a.monthlyPricePara - b.monthlyPricePara || a.name.localeCompare(b.name, "sr"));
  }

  async updatePlan(planId: string, input: { name: string; monthlyPricePara: number }) {
    const name = input.name.trim();
    if (!name) throw new DataError("Unesite naziv paketa.", "validation");
    if (!Number.isInteger(input.monthlyPricePara) || input.monthlyPricePara < 0) {
      throw new DataError("Cena nije ispravna.", "validation");
    }
    await this.exclusive(async (db) => {
      const plan = (db.plans ?? []).find((item) => item.id === planId);
      if (!plan) throw new DataError("Paket nije pronađen.", "not_found");
      if ((db.plans ?? []).some((item) => item.id !== planId && fold(item.name) === fold(name))) {
        throw new DataError("Paket sa ovim nazivom već postoji.", "conflict");
      }
      plan.name = name;
      plan.monthlyPricePara = input.monthlyPricePara;
      plan.updatedAt = new Date().toISOString();
    });
  }

  async updateSubscription(organizationId: string, input: { planId: string; status: SubscriptionStatus }) {
    if (!SUBSCRIPTION_STATUSES.has(input.status)) {
      throw new DataError("Status pretplate nije ispravan.", "validation");
    }
    await this.exclusive(async (db) => {
      const organization = db.organizations.find((item) => item.id === organizationId);
      if (!organization) throw new DataError("Dobavljač nije pronađen.", "not_found");
      const plan = (db.plans ?? []).find((item) => item.id === input.planId);
      if (!plan) throw new DataError("Paket nije pronađen.", "not_found");
      const now = new Date().toISOString();
      db.subscriptions ??= [];
      const existing = db.subscriptions.find((item) => item.organizationId === organizationId);
      if (!existing) {
        const created: Subscription = {
          id: randomUUID(),
          organizationId,
          planId: plan.id,
          status: input.status,
          periodStart: now,
          createdAt: now,
          updatedAt: now,
        };
        db.subscriptions.push(created);
        return;
      }
      existing.planId = plan.id;
      existing.status = input.status;
      existing.updatedAt = now;
    });
  }

  async updateSupplierNote(organizationId: string, note: string) {
    const body = note.trim();
    if (body.length > 2000) throw new DataError("Beleška može imati najviše 2000 karaktera.", "validation");
    await this.exclusive(async (db) => {
      const organization = db.organizations.find((item) => item.id === organizationId);
      if (!organization) throw new DataError("Dobavljač nije pronađen.", "not_found");
      const now = new Date().toISOString();
      db.supplierNotes ??= [];
      const existing = db.supplierNotes.find((item) => item.organizationId === organizationId);
      if (!existing) {
        db.supplierNotes.push({ organizationId, body, updatedAt: now });
        return;
      }
      existing.body = body;
      existing.updatedAt = now;
    });
  }

  async listInvoices(organizationId: string): Promise<PlatformInvoice[]> {
    const db = await this.read();
    return (db.invoices ?? [])
      .filter((invoice) => invoice.organizationId === organizationId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  private async read(): Promise<DemoDatabase> {
    if (this.options.postgres) return this.readPostgres();
    if (netlifyDemoEnabled()) {
      try {
        const loaded = await loadNetlifyDatabase();
        if (!loaded) {
          const db = normalizeDatabase(this.options.seed === false ? emptyDatabase() : await createSeedDatabase());
          await this.persist(db);
          return db;
        }
        return await this.adopt(loaded);
      } catch (error) {
        if (error instanceof DataError) throw error;
        console.error("Netlify baza nije dostupna.");
      }
    }
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as DemoDatabase;
      return await this.adopt(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const db = this.options.seed === false ? emptyDatabase() : await createSeedDatabase();
      await this.persist(db);
      return db;
    }
  }

  private async readPostgres(): Promise<DemoDatabase> {
    let loaded: DemoDatabase | null;
    try {
      loaded = await loadDatabase();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      throw new Error(
        message.includes("ECONNREFUSED") || message.includes("connect")
          ? "PostgreSQL nije pokrenut. U drugom terminalu pokrenite npm run db."
          : `PostgreSQL nije dostupan. ${message}`,
      );
    }
    if (!loaded) {
      const imported = await readOptionalJson(this.filePath);
      const db = imported ?? (this.options.seed === false ? emptyDatabase() : await createSeedDatabase());
      const normalized = normalizeDatabase(db);
      if (this.options.seed !== false) {
        await ensureRetailDemo(normalized);
        applyDemoPhotos(normalized);
        applyDemoGalleries(normalized);
      }
      await saveDatabase(normalized);
      return normalized;
    }
    let changed = false;
    if (this.options.seed !== false) {
      const retail = await ensureRetailDemo(loaded);
      const photos = applyDemoPhotos(loaded);
      const galleries = applyDemoGalleries(loaded);
      changed = retail || photos || galleries;
    }
    changed = missingTrackStock(loaded) || changed;
    const db = normalizeDatabase(loaded);
    if (changed) await saveDatabase(db);
    return db;
  }

  private async adopt(parsed: DemoDatabase) {
    if (parsed.version !== 1) {
      throw new DataError("Demo baza ima nepoznatu verziju.", "validation");
    }
    let changed = false;
    if (this.options.seed !== false) {
      const retail = await ensureRetailDemo(parsed);
      const photos = applyDemoPhotos(parsed);
      const galleries = applyDemoGalleries(parsed);
      changed = retail || photos || galleries;
    }
    changed = missingTrackStock(parsed) || changed;
    const db = normalizeDatabase(parsed);
    if (changed) await this.persist(db);
    return db;
  }

  private async persist(db: DemoDatabase) {
    if (this.options.postgres) {
      await saveDatabase(db);
      return;
    }
    if (netlifyDemoEnabled()) {
      try {
        await saveNetlifyDatabase(db);
        return;
      } catch {
        console.error("Netlify baza nije sačuvana.");
      }
    }
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

function missingTrackStock(db: DemoDatabase) {
  return (db.organizations ?? []).some(
    (organization) => organization.trackStock !== true && organization.trackStock !== false,
  );
}

function normalizeDatabase(db: DemoDatabase) {
  db.plans ??= [];
  db.subscriptions ??= [];
  db.invoices ??= [];
  db.supplierNotes ??= [];
  for (const user of db.users) {
    if (user.kind !== "buyer" && user.kind !== "supplier" && user.kind !== "platform") user.kind = "supplier";
    user.businessName ??= "";
    user.phone ??= "";
    user.address ??= "";
    user.city ??= "";
    user.pib ??= "";
    user.mb ??= "";
    user.postalCode ??= "";
    user.bankAccount ??= "";
    user.confirmationEmail ??= "";
  }
  for (const order of db.orders) {
    if (!order.buyerUserId) order.buyerUserId = null;
    if (order.paymentMethod !== "pouzecem" && order.paymentMethod !== "ips" && order.paymentMethod !== "kartica" && order.paymentMethod !== "racun") {
      order.paymentMethod = null;
    }
    order.customerSnapshot.bankAccount ??= "";
    order.customerSnapshot.mb ??= "";
    order.customerSnapshot.postalCode ??= "";
    order.customerSnapshot.confirmationEmail ??= "";
    order.customerSnapshot.code ??= "";
    const invoiceId = order.sefInvoiceId;
    order.sefInvoiceId = typeof invoiceId === "string" && invoiceId.trim() ? invoiceId.trim() : null;
    const sefStatus = order.sefStatus;
    order.sefStatus = typeof sefStatus === "string" && sefStatus.trim() ? sefStatus.trim() : null;
  }
  for (const organization of db.organizations) {
    organization.coverUrl ??= null;
    organization.description ??= "";
    if (organization.trackStock !== true) organization.trackStock = false;
    if (typeof organization.efakturaApiKey !== "string") organization.efakturaApiKey = "";
    else organization.efakturaApiKey = organization.efakturaApiKey.trim();
    if (organization.efakturaEnabled !== true) organization.efakturaEnabled = false;
    if (organization.efakturaEnvironment !== "produkcija") organization.efakturaEnvironment = "demo";
  }
  for (const customer of db.customers) {
    if (customer.party !== "fizicka" && customer.party !== "pravna") {
      customer.party = partyForPib(customer.pib ?? "");
    }
    customer.paymentTermDays = paymentTermFor(customer.party, customer.paymentTermDays);
    customer.code ??= "";
  }
  assignCustomerCodes(db.customers);
  for (const order of db.orders) {
    if (order.customerSnapshot.code) continue;
    const customer = db.customers.find((item) => item.id === order.customerId);
    order.customerSnapshot.code = customer?.code ?? "";
  }
  for (const organization of db.organizations) {
    if (organization.audience !== "fizicka" && organization.audience !== "pravna" && organization.audience !== "oba") {
      organization.audience = organization.channel === "b2c" ? "fizicka" : "pravna";
    }
    organization.channel = channelForAudience(organization.audience);
  }
  for (const product of db.products) {
    const sale = product.salePricePara;
    if (typeof sale !== "number" || sale <= 0 || sale >= product.pricePara) product.salePricePara = null;
    const images = syncProductImages(product.imageUrl, product.imageUrls);
    product.imageUrl = images.imageUrl;
    product.imageUrls = images.imageUrls;
    const rawStock = Number(product.stockQuantity);
    const stock = normalizeStockQuantity(isFractionalUnit(product.unit) ? rawStock : Math.trunc(rawStock), product.unit);
    product.stockQuantity = stock ?? 0;
  }
  return db;
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
    code: customer.code,
    businessName: customer.businessName,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    party: customer.party,
    paymentTermDays: customer.paymentTermDays,
    orderCount: orders.length,
    totalPara: billable.reduce((sum, order) => sum + order.totalPara, 0),
    lastOrderAt: last?.createdAt ?? null,
  };
}

function assignCustomerCodes(customers: DemoDatabase["customers"]) {
  const groups = new Map<string, typeof customers>();
  for (const customer of customers) {
    const group = groups.get(customer.organizationId) ?? [];
    group.push(customer);
    groups.set(customer.organizationId, group);
  }
  for (const group of groups.values()) {
    const missing = group
      .filter((customer) => !customer.code.trim())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    const taken = group.map((customer) => customer.code).filter((code) => code.trim());
    for (const customer of missing) {
      const code = nextCustomerCode(taken);
      customer.code = code;
      taken.push(code);
    }
  }
}

const SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>(["aktivna", "otkazana", "istekla"]);

function platformSuppliers(db: DemoDatabase): PlatformSupplier[] {
  const month = currentBelgradeMonthKey();
  return [...db.organizations]
    .sort((a, b) => a.name.localeCompare(b.name, "sr"))
    .map((organization) => {
      const subscription = (db.subscriptions ?? []).find((item) => item.organizationId === organization.id) ?? null;
      const plan = subscription ? (db.plans ?? []).find((item) => item.id === subscription.planId) ?? null : null;
      const orders = db.orders.filter((order) => order.organizationId === organization.id);
      const usage = monthOrderUsage(orders, month);
      return {
        organization,
        plan,
        subscription,
        note: (db.supplierNotes ?? []).find((item) => item.organizationId === organization.id)?.body ?? "",
        productCount: db.products.filter((product) => product.organizationId === organization.id).length,
        ordersThisMonth: usage.ordersThisMonth,
        monthValuePara: usage.monthValuePara,
      };
    });
}

function compareMembers(a: OrganizationMember, b: OrganizationMember) {
  if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
  return a.name.localeCompare(b.name, "sr");
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
    singleton = new DemoStore(path.join(getLocalDataDir(), "demo-db.json"), {
      seed: true,
      postgres: getDataMode() === "demo" && Boolean(process.env.DATABASE_URL?.trim()),
    });
  }
  return singleton;
}

async function readOptionalJson(filePath: string) {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as DemoDatabase;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
