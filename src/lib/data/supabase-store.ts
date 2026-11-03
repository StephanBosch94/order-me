import { randomUUID } from "node:crypto";

import type { CsvCustomerRow, CsvProductRow } from "@/lib/csv";
import { isCompanyOrder } from "@/lib/company-order";
import { nextCustomerCode, normalizeCustomerCode, partyForPib, paymentTermFor } from "@/lib/customers";
import { salesFollowUps } from "@/lib/follow-ups";
import { RESERVED_SLUGS, STORE_CLOSED_MESSAGE, channelForAudience } from "@/lib/constants";
import type { CommerceRepository, CreateBuyerInput, CreateOrganizationInput, UpdateBuyerInput } from "@/lib/data/repository";
import { syncProductImages } from "@/lib/data/images";
import {
  nextStockQuantities,
  normalizeStockQuantity,
  priceOrderLines,
  stockDirectionForStatus,
  type StockDirection,
} from "@/lib/data/pricing";
import type {
  BuyerOrder,
  Category,
  CreateOrderResult,
  Customer,
  CustomerDetail,
  CustomerInput,
  CustomerSnapshot,
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
  OrderStatusEvent,
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
  SubscriptionPlan,
  SubscriptionStatus,
  Unit,
} from "@/lib/data/types";
import { monthOrderUsage } from "@/lib/data/usage";
import { DataError } from "@/lib/errors";
import { belgradeDateKey, belgradeMonthKey, belgradeYear, currentBelgradeMonthKey } from "@/lib/format";
import { getServiceClient } from "@/lib/supabase/admin";
import { fold, orderPrefixFromName } from "@/lib/text";

type DbError = { message: string; code?: string } | null;

function oneRecord(value: unknown) {
  if (Array.isArray(value)) return (value[0] ?? null) as Record<string, unknown> | null;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function fail(error: DbError): asserts error is null {
  if (!error) return;
  if (error.code === "23505") {
    throw new DataError("Podatak već postoji.", "conflict");
  }
  throw new Error(error.message);
}

function db() {
  return getServiceClient();
}

function mapOrganization(row: Record<string, unknown>): Organization {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    email: String(row.email ?? ""),
    notificationEmail: String(row.notification_email ?? ""),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    pib: String(row.pib ?? ""),
    mb: String(row.mb ?? ""),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    brandColor: row.brand_color ? String(row.brand_color) : null,
    coverUrl: row.cover_url ? String(row.cover_url) : null,
    description: String(row.description ?? ""),
    audience:
      row.audience === "fizicka" || row.audience === "pravna" || row.audience === "oba"
        ? row.audience
        : row.channel === "b2c"
          ? "fizicka"
          : "pravna",
    channel: row.channel === "b2c" ? "b2c" : "b2b",
    orderPrefix: String(row.order_prefix),
    nextOrderNumber: Number(row.next_order_number),
    active: Boolean(row.active),
    trackStock: row.track_stock === true,
    efakturaApiKey: typeof row.efaktura_api_key === "string" ? row.efaktura_api_key : "",
    efakturaEnabled: row.efaktura_enabled === true,
    efakturaEnvironment: row.efaktura_environment === "produkcija" ? "produkcija" : "demo",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toPublic(organization: Organization): PublicSupplier {
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

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    sortOrder: Number(row.sort_order),
    createdAt: String(row.created_at),
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    categoryId: row.category_id ? String(row.category_id) : null,
    name: String(row.name),
    sku: String(row.sku ?? ""),
    description: String(row.description ?? ""),
    unit: String(row.unit) as Unit,
    pricePara: Number(row.price_para),
    salePricePara: row.sale_price_para == null ? null : Number(row.sale_price_para),
    ...syncProductImages(
      row.image_url ? String(row.image_url) : null,
      Array.isArray(row.image_urls) ? row.image_urls.map(String) : [],
    ),
    active: Boolean(row.active),
    minQuantity: Number(row.min_quantity),
    stockQuantity: normalizeStockQuantity(Number(row.stock_quantity), String(row.unit) as Unit) ?? 0,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCustomer(row: Record<string, unknown>): Customer {
  const pib = String(row.pib ?? "");
  const party = row.party === "fizicka" || row.party === "pravna" ? row.party : partyForPib(pib);
  const rawDays = Number(row.payment_term_days);
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    businessName: String(row.business_name),
    contactName: String(row.contact_name),
    email: String(row.email),
    phone: String(row.phone ?? ""),
    pib,
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    notes: String(row.notes ?? ""),
    code: String(row.code ?? ""),
    party,
    paymentTermDays: paymentTermFor(party, Number.isFinite(rawDays) ? rawDays : null),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    customerId: String(row.customer_id),
    buyerUserId: row.buyer_user_id ? String(row.buyer_user_id) : null,
    number: String(row.number),
    status: String(row.status) as OrderStatus,
    notes: String(row.notes ?? ""),
    subtotalPara: Number(row.subtotal_para),
    totalPara: Number(row.total_para),
    idempotencyKey: String(row.idempotency_key),
    confirmationToken: String(row.confirmation_token),
    customerSnapshot: {
      ...(row.customer_snapshot as CustomerSnapshot),
      bankAccount: String((row.customer_snapshot as CustomerSnapshot | null)?.bankAccount ?? ""),
      mb: String((row.customer_snapshot as CustomerSnapshot | null)?.mb ?? ""),
      postalCode: String((row.customer_snapshot as CustomerSnapshot | null)?.postalCode ?? ""),
      confirmationEmail: String((row.customer_snapshot as CustomerSnapshot | null)?.confirmationEmail ?? "").trim(),
      code: String((row.customer_snapshot as CustomerSnapshot | null)?.code ?? ""),
    },
    customerEmailStatus: String(row.customer_email_status) as EmailDelivery,
    supplierEmailStatus: String(row.supplier_email_status) as EmailDelivery,
    paymentMethod:
      row.payment_method === "pouzecem" || row.payment_method === "ips" || row.payment_method === "kartica" || row.payment_method === "racun"
        ? row.payment_method
        : null,
    stockHeld: row.stock_held === true,
    sefInvoiceId: typeof row.sef_invoice_id === "string" && row.sef_invoice_id.trim() ? row.sef_invoice_id.trim() : null,
    sefStatus: typeof row.sef_status === "string" && row.sef_status.trim() ? row.sef_status.trim() : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapItem(row: Record<string, unknown>): OrderItem {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    organizationId: String(row.organization_id),
    productId: row.product_id ? String(row.product_id) : null,
    name: String(row.name),
    sku: String(row.sku ?? ""),
    unit: String(row.unit) as Unit,
    quantity: Number(row.quantity),
    unitPricePara: Number(row.unit_price_para),
    lineTotalPara: Number(row.line_total_para),
  };
}

function mapEvent(row: Record<string, unknown>): OrderStatusEvent {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    organizationId: String(row.organization_id),
    fromStatus: row.from_status ? (String(row.from_status) as OrderStatus) : null,
    toStatus: String(row.to_status) as OrderStatus,
    actorName: String(row.actor_name),
    createdAt: String(row.created_at),
  };
}

async function moveStock(
  organizationId: string,
  lines: { productId: string | null; quantity: number }[],
  direction: StockDirection,
) {
  if (!lines.some((line) => line.productId)) return;
  const admin = db();
  const productResult = await admin.from("products").select("*").eq("organization_id", organizationId);
  fail(productResult.error);
  const products = ((productResult.data ?? []) as Record<string, unknown>[]).map(mapProduct);
  const updates = nextStockQuantities(products, lines, direction);
  await Promise.all(
    updates.map(async (update) => {
      const result = await admin
        .from("products")
        .update({ stock_quantity: update.stockQuantity, updated_at: new Date().toISOString() })
        .eq("organization_id", organizationId)
        .eq("id", update.id);
      fail(result.error);
    }),
  );
}

async function orderDetail(order: Order): Promise<OrderDetail> {
  const admin = db();
  const [items, history] = await Promise.all([
    admin.from("order_items").select("*").eq("order_id", order.id).eq("organization_id", order.organizationId),
    admin
      .from("order_status_history")
      .select("*")
      .eq("order_id", order.id)
      .eq("organization_id", order.organizationId)
      .order("created_at", { ascending: true }),
  ]);
  fail(items.error);
  fail(history.error);
  return {
    ...order,
    items: ((items.data ?? []) as Record<string, unknown>[]).map(mapItem),
    history: ((history.data ?? []) as Record<string, unknown>[]).map(mapEvent),
  };
}

function listItem(order: Order, itemCount: number, party: Customer["party"]): OrderListItem {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    totalPara: order.totalPara,
    createdAt: order.createdAt,
    businessName: order.customerSnapshot.businessName,
    contactName: order.customerSnapshot.contactName,
    itemCount,
    paymentMethod: order.paymentMethod,
    pib: order.customerSnapshot.pib,
    party,
  };
}

async function categoryIdFor(organizationId: string, input: ProductInput) {
  if (input.newCategory.trim()) {
    const admin = db();
    const { data: existing, error } = await admin
      .from("categories")
      .select("*")
      .eq("organization_id", organizationId);
    fail(error);
    const found = ((existing ?? []) as Record<string, unknown>[])
      .map(mapCategory)
      .find((category) => fold(category.name) === fold(input.newCategory));
    if (found) return found.id;
    const { data, error: insertError } = await admin
      .from("categories")
      .insert({
        organization_id: organizationId,
        name: input.newCategory.trim(),
        sort_order: (existing?.length ?? 0) + 1,
      })
      .select("*")
      .single();
    fail(insertError);
    return String((data as Record<string, unknown>).id);
  }
  return input.categoryId || null;
}

export const supabaseRepository: CommerceRepository = {
  async createOrganization(input: CreateOrganizationInput) {
    if (RESERVED_SLUGS.has(input.slug)) {
      throw new DataError("Ova adresa je rezervisana.", "conflict");
    }
    const admin = db();
    const { data, error } = await admin
      .from("organizations")
      .insert({
        name: input.name,
        slug: input.slug,
        email: input.userEmail,
        notification_email: input.userEmail,
        phone: input.phone,
        audience: input.audience ?? (input.channel === "b2c" ? "fizicka" : "pravna"),
        channel: channelForAudience(input.audience ?? (input.channel === "b2c" ? "fizicka" : "pravna")),
        order_prefix: orderPrefixFromName(input.name),
        track_stock: false,
      })
      .select("*")
      .single();
    if (error?.code === "23505") throw new DataError("Ova adresa je već zauzeta.", "conflict");
    fail(error);
    const organization = mapOrganization(data as Record<string, unknown>);
    const profile = await admin.from("profiles").upsert({
      id: input.userId,
      email: input.userEmail,
      name: input.userName,
      kind: "supplier",
    });
    fail(profile.error);
    const member = await admin.from("organization_members").insert({
      organization_id: organization.id,
      user_id: input.userId,
      role: "owner",
    });
    fail(member.error);
    await assignDefaultSubscription(organization.id);
    return organization;
  },

  async createBuyerProfile(input: CreateBuyerInput) {
    const { error } = await db().from("profiles").upsert({
      id: input.userId,
      email: input.email,
      name: input.name,
      kind: "buyer",
      business_name: input.businessName,
      phone: input.phone,
      address: input.address,
      city: input.city,
      pib: input.pib,
      mb: input.mb,
      postal_code: input.postalCode,
      bank_account: input.bankAccount,
      confirmation_email: input.confirmationEmail.trim(),
    });
    fail(error);
  },

  async saveBuyerBankAccount(userId, bankAccount) {
    const { error } = await db().from("profiles").update({ bank_account: bankAccount }).eq("id", userId).eq("kind", "buyer");
    fail(error);
  },

  async saveBuyerCompanyDetails(userId, input: { mb: string; postalCode: string }) {
    const { error } = await db()
      .from("profiles")
      .update({ mb: input.mb, postal_code: input.postalCode })
      .eq("id", userId)
      .eq("kind", "buyer");
    fail(error);
  },

  async updateBuyerProfile(userId, input: UpdateBuyerInput) {
    const { data, error } = await db()
      .from("profiles")
      .update({
        name: input.name,
        business_name: input.businessName,
        phone: input.phone,
        address: input.address,
        city: input.city,
        pib: input.pib,
        mb: input.mb,
        postal_code: input.postalCode,
        bank_account: input.bankAccount,
        confirmation_email: input.confirmationEmail.trim(),
      })
      .eq("id", userId)
      .eq("kind", "buyer")
      .select("id")
      .maybeSingle();
    fail(error);
    if (!data) throw new DataError("Nalog nije pronađen.", "not_found");
  },

  async getOrganization(id) {
    const { data, error } = await db().from("organizations").select("*").eq("id", id).maybeSingle();
    fail(error);
    return data ? mapOrganization(data as Record<string, unknown>) : null;
  },

  async getAccount(userId) {
    const admin = db();
    const profile = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
    fail(profile.error);
    const member = await admin
      .from("organization_members")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    fail(member.error);
    if (!profile.data || !member.data) return null;
    const organization = await this.getOrganization(String((member.data as Record<string, unknown>).organization_id));
    if (!organization) return null;
    const profileRow = profile.data as Record<string, unknown>;
    return {
      userId,
      name: String(profileRow.name),
      email: String(profileRow.email),
      role: String((member.data as Record<string, unknown>).role) as "owner" | "staff",
      organization,
    };
  },

  async listMembers(organizationId) {
    return listOrganizationMembers(organizationId);
  },

  async addStaffMember(organizationId, input) {
    return insertStaffMember(organizationId, input);
  },

  async resolveAccount(userId): Promise<SessionAccount | null> {
    const profile = await db().from("profiles").select("*").eq("id", userId).maybeSingle();
    fail(profile.error);
    if (!profile.data) return null;
    const row = profile.data as Record<string, unknown>;
    if (row.kind === "platform") {
      return {
        kind: "platform",
        userId,
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
      };
    }
    if (row.kind === "buyer") {
      return {
        kind: "buyer",
        userId,
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
        businessName: String(row.business_name ?? ""),
        phone: String(row.phone ?? ""),
        address: String(row.address ?? ""),
        city: String(row.city ?? ""),
        pib: String(row.pib ?? ""),
        mb: String(row.mb ?? ""),
        postalCode: String(row.postal_code ?? ""),
        bankAccount: String(row.bank_account ?? ""),
        confirmationEmail: String(row.confirmation_email ?? "").trim(),
      };
    }
    const account = await this.getAccount(userId);
    return account ? { ...account, kind: "supplier" } : null;
  },

  async listBuyerOrders(userId): Promise<BuyerOrder[]> {
    const { data, error } = await db()
      .from("orders")
      .select("id, number, status, total_para, created_at, confirmation_token, organizations(name, slug, channel, audience), order_items(product_id, name, quantity, unit, products(image_url, image_urls))")
      .eq("buyer_user_id", userId)
      .order("created_at", { ascending: false });
    fail(error);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => {
      const organization = oneRecord(row.organizations);
      const items = Array.isArray(row.order_items) ? row.order_items : [];
      return {
        id: String(row.id),
        number: String(row.number),
        status: String(row.status) as OrderStatus,
        totalPara: Number(row.total_para),
        createdAt: String(row.created_at),
        supplierName: String(organization?.name ?? "Dobavljač"),
        supplierSlug: String(organization?.slug ?? ""),
        supplierChannel: organization?.channel === "b2c" ? "b2c" : "b2b",
        supplierAudience:
          organization?.audience === "fizicka" || organization?.audience === "pravna" || organization?.audience === "oba"
            ? organization.audience
            : organization?.channel === "b2c"
              ? "fizicka"
              : "pravna",
        confirmationToken: String(row.confirmation_token),
        itemCount: items.length,
        items: items.map((item) => {
          const line = item as Record<string, unknown>;
          const product = oneRecord(line.products);
          const urls = Array.isArray(product?.image_urls) ? product.image_urls : [];
          const first = urls.find((url) => typeof url === "string" && url);
          return {
            productId: line.product_id ? String(line.product_id) : null,
            name: String(line.name ?? ""),
            quantity: Number(line.quantity),
            unit: String(line.unit ?? "komad") as BuyerOrder["items"][number]["unit"],
            imageUrl: typeof first === "string" ? first : product?.image_url ? String(product.image_url) : null,
          };
        }),
      };
    });
  },

  async updateOrganization(id, input: OrganizationInput) {
    if (RESERVED_SLUGS.has(input.slug)) throw new DataError("Ova adresa je rezervisana.", "conflict");
    const { data, error } = await db()
      .from("organizations")
      .update({
        name: input.name,
        slug: input.slug,
        email: input.email,
        notification_email: input.notificationEmail,
        phone: input.phone,
        address: input.address,
        city: input.city,
        pib: input.pib,
        mb: input.mb,
        logo_url: input.logoUrl,
        brand_color: input.brandColor,
        cover_url: input.coverUrl,
        description: input.description,
        audience: input.audience,
        channel: channelForAudience(input.audience),
        track_stock: input.trackStock,
        efaktura_api_key: input.efakturaApiKey,
        efaktura_enabled: input.efakturaEnabled,
        efaktura_environment: input.efakturaEnvironment === "produkcija" ? "produkcija" : "demo",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error?.code === "23505") throw new DataError("Ova adresa je već zauzeta.", "conflict");
    fail(error);
    return mapOrganization(data as Record<string, unknown>);
  },

  async isSlugTaken(slug, exceptId) {
    const { data, error } = await db().from("organizations").select("id").eq("slug", slug).maybeSingle();
    fail(error);
    if (!data) return false;
    return String((data as Record<string, unknown>).id) !== exceptId;
  },

  async listCategories(organizationId) {
    const { data, error } = await db()
      .from("categories")
      .select("*")
      .eq("organization_id", organizationId)
      .order("sort_order");
    fail(error);
    return ((data ?? []) as Record<string, unknown>[]).map(mapCategory);
  },

  async listProducts(organizationId) {
    const { data, error } = await db()
      .from("products")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");
    fail(error);
    return ((data ?? []) as Record<string, unknown>[]).map(mapProduct);
  },

  async getProduct(organizationId, productId) {
    const { data, error } = await db()
      .from("products")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", productId)
      .maybeSingle();
    fail(error);
    return data ? mapProduct(data as Record<string, unknown>) : null;
  },

  async createProduct(organizationId, input) {
    const categoryId = await categoryIdFor(organizationId, input);
    const { data, error } = await db()
      .from("products")
      .insert({
        organization_id: organizationId,
        category_id: categoryId,
        name: input.name,
        sku: input.sku,
        description: input.description,
        unit: input.unit,
        price_para: input.pricePara,
        sale_price_para: input.salePricePara,
        ...(() => {
          const images = syncProductImages(input.imageUrl, input.imageUrls);
          return { image_url: images.imageUrl, image_urls: images.imageUrls };
        })(),
        active: input.active,
        min_quantity: input.minQuantity,
        stock_quantity: input.stockQuantity,
      })
      .select("*")
      .single();
    fail(error);
    return mapProduct(data as Record<string, unknown>);
  },

  async updateProduct(organizationId, productId, input) {
    const existing = await this.getProduct(organizationId, productId);
    if (!existing) return null;
    const categoryId = await categoryIdFor(organizationId, input);
    const patch: Record<string, unknown> = {
      category_id: categoryId,
      name: input.name,
      sku: input.sku,
      description: input.description,
      unit: input.unit,
      price_para: input.pricePara,
      sale_price_para: input.salePricePara,
      active: input.active,
      min_quantity: input.minQuantity,
      stock_quantity: input.stockQuantity,
      updated_at: new Date().toISOString(),
    };
    if (input.imageUrls !== undefined || input.imageUrl !== undefined) {
      const images = syncProductImages(input.imageUrl, input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : []));
      patch.image_url = images.imageUrl;
      patch.image_urls = images.imageUrls;
    }
    const { data, error } = await db()
      .from("products")
      .update(patch)
      .eq("organization_id", organizationId)
      .eq("id", productId)
      .select("*")
      .single();
    fail(error);
    return mapProduct(data as Record<string, unknown>);
  },

  async importProducts(organizationId, rows: CsvProductRow[]) {
    const result: ImportResult = { created: 0, errors: [] };
    for (const row of rows) {
      try {
        await this.createProduct(organizationId, {
          name: row.name,
          sku: row.sku,
          description: row.description,
          categoryId: null,
          newCategory: row.category,
          unit: row.unit,
          pricePara: row.pricePara,
          salePricePara: null,
          minQuantity: row.minQuantity,
          stockQuantity: 0,
          active: row.active,
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
  },

  async importCustomers(organizationId, rows: CsvCustomerRow[]) {
    const result: ImportResult = { created: 0, errors: [] };
    for (const row of rows) {
      try {
        await this.createCustomer(organizationId, {
          code: row.code,
          businessName: row.businessName,
          contactName: row.contactName,
          email: row.email,
          phone: row.phone,
          pib: row.pib,
          address: row.address,
          city: row.city,
          notes: row.notes,
          party: row.party,
          paymentTermDays: row.paymentTermDays,
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
  },

  async listCustomers(organizationId, query) {
    const { data, error } = await db().from("customers").select("*").eq("organization_id", organizationId);
    fail(error);
    const customers = ((data ?? []) as Record<string, unknown>[]).map(mapCustomer);
    const orders = await loadOrders(organizationId);
    const needle = fold(query ?? "");
    return customers
      .filter((customer) => {
        if (!needle) return true;
        return [customer.code, customer.businessName, customer.contactName, customer.email, customer.city]
          .map(fold)
          .some((value) => value.includes(needle));
      })
      .map((customer) => summarize(customer, orders))
      .sort((a, b) => a.businessName.localeCompare(b.businessName, "sr"));
  },

  async getCustomer(organizationId, customerId) {
    const { data, error } = await db()
      .from("customers")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", customerId)
      .maybeSingle();
    fail(error);
    if (!data) return null;
    const customer = mapCustomer(data as Record<string, unknown>);
    const orders = (await loadOrders(organizationId)).filter((order) => order.customerId === customer.id);
    const counts = await itemCounts(organizationId);
    const listed = [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => listItem(order, counts.get(order.id) ?? 0, customer.party));
    const detail: CustomerDetail = {
      ...customer,
      orders: listed,
      orderCount: listed.length,
      totalPara: orders
        .filter((order) => order.status !== "otkazana")
        .reduce((sum, order) => sum + order.totalPara, 0),
    };
    return detail;
  },

  async updateCustomer(organizationId, customerId, input: CustomerInput) {
    const existing = await db()
      .from("customers")
      .select("id, code, email")
      .eq("organization_id", organizationId);
    fail(existing.error);
    const rows = (existing.data ?? []) as Record<string, unknown>[];
    const current = rows.find((row) => String(row.id) === customerId);
    if (!current) return null;
    const email = input.email.toLowerCase();
    if (rows.some((row) => String(row.id) !== customerId && String(row.email ?? "").toLowerCase() === email)) {
      throw new DataError("Kupac sa ovom email adresom već postoji.", "conflict");
    }
    const requested = normalizeCustomerCode(input.code);
    const code = requested || String(current.code ?? "");
    if (
      requested &&
      rows.some((row) => String(row.id) !== customerId && normalizeCustomerCode(String(row.code ?? "")) === code)
    ) {
      throw new DataError("Ova šifra je već dodeljena drugom kupcu.", "conflict");
    }
    const { data, error } = await db()
      .from("customers")
      .update({
        business_name: input.businessName,
        contact_name: input.contactName,
        email,
        phone: input.phone,
        pib: input.pib,
        address: input.address,
        city: input.city,
        notes: input.notes,
        code,
        party: input.party,
        payment_term_days: input.paymentTermDays,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("id", customerId)
      .select("*")
      .maybeSingle();
    fail(error);
    return data ? mapCustomer(data as Record<string, unknown>) : null;
  },

  async createCustomer(organizationId, input: CustomerInput) {
    const admin = db();
    const email = input.email.toLowerCase();
    const existing = await admin
      .from("customers")
      .select("id, code, email")
      .eq("organization_id", organizationId);
    fail(existing.error);
    const rows = (existing.data ?? []) as Record<string, unknown>[];
    if (rows.some((row) => String(row.email ?? "").toLowerCase() === email)) {
      throw new DataError("Kupac sa ovom email adresom već postoji.", "conflict");
    }
    const code = input.code.trim()
      ? input.code.trim().toUpperCase()
      : nextCustomerCode(rows.map((row) => String(row.code ?? "")));
    if (rows.some((row) => String(row.code ?? "").toUpperCase() === code)) {
      throw new DataError("Ova šifra je već dodeljena drugom kupcu.", "conflict");
    }
    const inserted = await admin
      .from("customers")
      .insert({
        organization_id: organizationId,
        business_name: input.businessName,
        contact_name: input.contactName,
        email,
        phone: input.phone,
        pib: input.pib,
        address: input.address,
        city: input.city,
        notes: input.notes,
        code,
        party: input.party,
        payment_term_days: input.paymentTermDays,
      })
      .select("*")
      .single();
    fail(inserted.error);
    return mapCustomer(inserted.data as Record<string, unknown>);
  },

  async createStaffOrder(organizationId, input: StaffOrderInput) {
    const admin = db();
    const organizationResult = await admin.from("organizations").select("*").eq("id", organizationId).maybeSingle();
    fail(organizationResult.error);
    const customerResult = await admin
      .from("customers")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", input.customerId)
      .maybeSingle();
    fail(customerResult.error);
    if (!organizationResult.data || !customerResult.data) {
      return { ok: false as const, message: "Kupac nije pronađen." };
    }
    const organization = mapOrganization(organizationResult.data as Record<string, unknown>);
    const customer = mapCustomer(customerResult.data as Record<string, unknown>);
    const productResult = await admin.from("products").select("*").eq("organization_id", organizationId);
    fail(productResult.error);
    const priced = priceOrderLines(
      ((productResult.data ?? []) as Record<string, unknown>[]).map(mapProduct),
      input.items,
      { enforceMinimum: false, allowInactive: true },
    );
    if (!priced.ok) return priced;

    const number = await allocateNumber(organizationId);
    const snapshot: CustomerSnapshot = {
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
      confirmationEmail: "",
    };
    const insertedOrder = await admin
      .from("orders")
      .insert({
        organization_id: organizationId,
        customer_id: customer.id,
        number,
        status: "nova",
        notes: input.notes,
        subtotal_para: priced.subtotalPara,
        total_para: priced.subtotalPara,
        idempotency_key: randomUUID(),
        confirmation_token: randomUUID(),
        customer_snapshot: snapshot,
        payment_method: customer.party === "pravna" ? "racun" : null,
        stock_held: organization.trackStock === true,
      })
      .select("*")
      .single();
    fail(insertedOrder.error);
    const order = mapOrder(insertedOrder.data as Record<string, unknown>);
    const items = await admin.from("order_items").insert(
      priced.items.map((line) => ({
        order_id: order.id,
        organization_id: organizationId,
        product_id: line.productId,
        name: line.name,
        sku: line.sku,
        unit: line.unit,
        quantity: line.quantity,
        unit_price_para: line.unitPricePara,
        line_total_para: line.lineTotalPara,
      })),
    );
    fail(items.error);
    if (organization.trackStock) await moveStock(organizationId, priced.items, "reserve");
    const history = await admin.from("order_status_history").insert({
      order_id: order.id,
      organization_id: organizationId,
      from_status: null,
      to_status: "nova",
      actor_name: input.actorName,
    });
    fail(history.error);
    return {
      ok: true as const,
      duplicate: false,
      order: await orderDetail(order),
      supplier: toPublic(organization),
    };
  },

  async listOrders(organizationId, query: OrderListQuery) {
    const orders = await loadOrders(organizationId);
    const counts = await itemCounts(organizationId);
    let rows = orders;
    if (query.status && query.status !== "all") rows = rows.filter((order) => order.status === query.status);
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
    const parties = await customerParties(organizationId);
    const result: Paginated<OrderListItem> = {
      items: rows.slice(start, start + pageSize).map((order) =>
        listItem(order, counts.get(order.id) ?? 0, parties.get(order.customerId) ?? partyForPib(order.customerSnapshot.pib)),
      ),
      total: rows.length,
      page,
      pageSize,
    };
    return result;
  },

  async getOrder(organizationId, orderId) {
    const { data, error } = await db()
      .from("orders")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", orderId)
      .maybeSingle();
    fail(error);
    if (!data) return null;
    return orderDetail(mapOrder(data as Record<string, unknown>));
  },

  async getOrderByToken(token) {
    const { data, error } = await db().from("orders").select("*").eq("confirmation_token", token).maybeSingle();
    fail(error);
    if (!data) return null;
    const order = mapOrder(data as Record<string, unknown>);
    const organization = await this.getOrganization(order.organizationId);
    if (!organization) return null;
    const view: PublicOrderView = { order: await orderDetail(order), supplier: toPublic(organization) };
    return view;
  },

  async createPublicOrder(input: PublicOrderInput, ip: string): Promise<CreateOrderResult> {
    const admin = db();
    const orgResult = await admin.from("organizations").select("*").eq("slug", input.slug).maybeSingle();
    fail(orgResult.error);
    if (!orgResult.data) return { ok: false, message: "Dobavljač nije pronađen." };
    const organization = mapOrganization(orgResult.data as Record<string, unknown>);
    if (!organization.active) return { ok: false, message: STORE_CLOSED_MESSAGE };

    const existing = await admin
      .from("orders")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    fail(existing.error);
    if (existing.data) {
      const order = mapOrder(existing.data as Record<string, unknown>);
      return { ok: true, duplicate: true, order: await orderDetail(order), supplier: toPublic(organization) };
    }

    const allowed = await consumeRateLimit(`${organization.id}:${ip || "local"}`);
    if (!allowed) {
      return { ok: false, message: "Previše pokušaja. Sačekajte nekoliko minuta i pokušajte ponovo." };
    }

    const productResult = await admin
      .from("products")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("active", true);
    fail(productResult.error);
    const priced = priceOrderLines(
      ((productResult.data ?? []) as Record<string, unknown>[]).map(mapProduct),
      input.items,
    );
    if (!priced.ok) return priced;

    const now = new Date().toISOString();
    const email = input.email.toLowerCase();
    const existingCodes = await admin.from("customers").select("code").eq("organization_id", organization.id);
    fail(existingCodes.error);
    const customerCode = nextCustomerCode(
      ((existingCodes.data ?? []) as Record<string, unknown>[]).map((row) => String(row.code ?? "")),
    );
    const customerResult = await admin
      .from("customers")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("email", email)
      .maybeSingle();
    fail(customerResult.error);
    let customer = customerResult.data ? mapCustomer(customerResult.data as Record<string, unknown>) : null;
    if (!customer) {
      const inserted = await admin
        .from("customers")
        .insert({
          organization_id: organization.id,
          business_name: input.businessName,
          contact_name: input.contactName,
          email,
          phone: input.phone,
          pib: input.pib,
          address: input.address,
          city: input.city,
          code: customerCode,
          party: partyForPib(input.pib),
          payment_term_days: paymentTermFor(partyForPib(input.pib)),
        })
        .select("*")
        .single();
      fail(inserted.error);
      customer = mapCustomer(inserted.data as Record<string, unknown>);
    } else {
      const updated = await admin
        .from("customers")
        .update({
          business_name: input.businessName,
          contact_name: input.contactName,
          phone: input.phone,
          pib: input.pib || customer.pib,
          address: input.address || customer.address,
          city: input.city || customer.city,
          updated_at: now,
        })
        .eq("id", customer.id)
        .eq("organization_id", organization.id)
        .select("*")
        .single();
      fail(updated.error);
      customer = mapCustomer(updated.data as Record<string, unknown>);
    }

    const number = await allocateNumber(organization.id);
    const snapshot: CustomerSnapshot = {
      code: customer.code,
      businessName: customer.businessName,
      contactName: customer.contactName,
      email: customer.email,
      phone: customer.phone,
      pib: customer.pib,
      mb: input.mb ?? "",
      address: customer.address,
      postalCode: input.postalCode ?? "",
      city: customer.city,
      bankAccount: input.bankAccount ?? "",
      confirmationEmail: input.confirmationEmail?.trim() ?? "",
    };
    const insertedOrder = await admin
      .from("orders")
      .insert({
        organization_id: organization.id,
        customer_id: customer.id,
        number,
        status: "nova",
        notes: input.notes,
        subtotal_para: priced.subtotalPara,
        total_para: priced.subtotalPara,
        idempotency_key: input.idempotencyKey,
        confirmation_token: randomUUID(),
        customer_snapshot: snapshot,
        buyer_user_id: input.buyerUserId || null,
        payment_method: input.paymentMethod ?? null,
        stock_held: organization.trackStock === true,
      })
      .select("*")
      .single();
    if (insertedOrder.error?.code === "23505") {
      const again = await admin
        .from("orders")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("idempotency_key", input.idempotencyKey)
        .single();
      fail(again.error);
      const order = mapOrder(again.data as Record<string, unknown>);
      return { ok: true, duplicate: true, order: await orderDetail(order), supplier: toPublic(organization) };
    }
    fail(insertedOrder.error);
    const order = mapOrder(insertedOrder.data as Record<string, unknown>);
    const items = await admin.from("order_items").insert(
      priced.items.map((line) => ({
        order_id: order.id,
        organization_id: organization.id,
        product_id: line.productId,
        name: line.name,
        sku: line.sku,
        unit: line.unit,
        quantity: line.quantity,
        unit_price_para: line.unitPricePara,
        line_total_para: line.lineTotalPara,
      })),
    );
    fail(items.error);
    if (organization.trackStock) await moveStock(organization.id, priced.items, "reserve");
    const history = await admin.from("order_status_history").insert({
      order_id: order.id,
      organization_id: organization.id,
      from_status: null,
      to_status: "nova",
      actor_name: "Kupac",
    });
    fail(history.error);
    return { ok: true, duplicate: false, order: await orderDetail(order), supplier: toPublic(organization) };
  },

  async updateOrderStatus(organizationId, orderId, status, actorName) {
    const current = await this.getOrder(organizationId, orderId);
    if (!current) return null;
    if (current.status === status) return current;
    const organization = await this.getOrganization(organizationId);
    const direction =
      organization?.trackStock && current.stockHeld ? stockDirectionForStatus(current.status, status) : null;
    const admin = db();
    const updated = await admin
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(direction ? { stock_held: false } : {}),
      })
      .eq("organization_id", organizationId)
      .eq("id", orderId)
      .select("*")
      .single();
    fail(updated.error);
    const history = await admin.from("order_status_history").insert({
      order_id: orderId,
      organization_id: organizationId,
      from_status: current.status,
      to_status: status,
      actor_name: actorName,
    });
    fail(history.error);
    if (direction) await moveStock(organizationId, current.items, direction);
    return orderDetail(mapOrder(updated.data as Record<string, unknown>));
  },

  async saveSefInvoice(organizationId, orderId, input) {
    const current = await this.getOrder(organizationId, orderId);
    if (!current) return null;
    if (current.sefInvoiceId) {
      return { invoiceId: current.sefInvoiceId, status: current.sefStatus ?? "poslata", already: true };
    }
    const { data, error } = await db()
      .from("orders")
      .update({
        sef_invoice_id: input.invoiceId,
        sef_status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("id", orderId)
      .is("sef_invoice_id", null)
      .select("sef_invoice_id, sef_status")
      .maybeSingle();
    fail(error);
    if (!data) {
      const again = await this.getOrder(organizationId, orderId);
      if (!again?.sefInvoiceId) return null;
      return { invoiceId: again.sefInvoiceId, status: again.sefStatus ?? "poslata", already: true };
    }
    const row = data as Record<string, unknown>;
    return {
      invoiceId: String(row.sef_invoice_id),
      status: typeof row.sef_status === "string" && row.sef_status ? row.sef_status : input.status,
      already: false,
    };
  },

  async setEmailStatus(orderId, customer, supplier) {
    const { error } = await db()
      .from("orders")
      .update({
        customer_email_status: customer,
        supplier_email_status: supplier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    fail(error);
  },

  async getDashboard(organizationId) {
    const orders = await loadOrders(organizationId);
    const products = await this.listProducts(organizationId);
    const counts = await itemCounts(organizationId);
    const month = belgradeMonthKey(new Date().toISOString());
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const awaiting = orders
      .filter((order) => order.status === "nova")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const { data: customerRows, error: customerError } = await db()
      .from("customers")
      .select("*")
      .eq("organization_id", organizationId);
    fail(customerError);
    const customers = ((customerRows ?? []) as Record<string, unknown>[]).map(mapCustomer);
    const parties = new Map(customers.map((customer) => [customer.id, customer.party]));
    const data: DashboardData = {
      newOrders: orders.filter(
        (order) => order.status !== "otkazana" && new Date(order.createdAt).getTime() >= weekAgo,
      ).length,
      awaitingConfirmation: orders.filter((order) => order.status === "nova").length,
      processedThisMonth: orders.filter(
        (order) =>
          (order.status === "potvrdjena" || order.status === "u_pripremi" || order.status === "isporucena") &&
          belgradeMonthKey(order.createdAt) === month,
      ).length,
      monthValuePara: orders
        .filter((order) => order.status !== "otkazana" && belgradeMonthKey(order.createdAt) === month)
        .reduce((sum, order) => sum + order.totalPara, 0),
      activeProducts: products.filter((product) => product.active).length,
      recentOrders: awaiting.map((order) =>
        listItem(order, counts.get(order.id) ?? 0, parties.get(order.customerId) ?? partyForPib(order.customerSnapshot.pib)),
      ),
      followUps: salesFollowUps(
        customers.map((customer) => ({
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
    return data;
  },

  async getPublicCatalog(slug) {
    const { data, error } = await db().from("organizations").select("*").eq("slug", slug).maybeSingle();
    fail(error);
    if (!data) return null;
    const organization = mapOrganization(data as Record<string, unknown>);
    if (!organization.active) {
      return {
        supplier: toPublic(organization),
        categories: [],
        products: [],
        closedMessage: STORE_CLOSED_MESSAGE,
      };
    }
    const [categories, products] = await Promise.all([
      this.listCategories(organization.id),
      this.listProducts(organization.id),
    ]);
    const catalog: PublicCatalog = {
      supplier: toPublic(organization),
      categories,
      products: products.filter((product) => product.active),
    };
    return catalog;
  },

  async listPlatformSuppliers() {
    const admin = db();
    const [organizations, plans, subscriptions, notes, products, orders] = await Promise.all([
      admin.from("organizations").select("*"),
      admin.from("subscription_plans").select("*"),
      admin.from("subscriptions").select("*"),
      admin.from("supplier_notes").select("*"),
      admin.from("products").select("organization_id"),
      admin.from("orders").select("organization_id, status, total_para, created_at"),
    ]);
    fail(organizations.error);
    fail(plans.error);
    fail(subscriptions.error);
    fail(notes.error);
    fail(products.error);
    fail(orders.error);
    const month = currentBelgradeMonthKey();
    const planRows = ((plans.data ?? []) as Record<string, unknown>[]).map(mapPlan);
    const subscriptionRows = ((subscriptions.data ?? []) as Record<string, unknown>[]).map(mapSubscription);
    const noteRows = new Map(
      ((notes.data ?? []) as Record<string, unknown>[]).map((row) => [String(row.organization_id), String(row.body ?? "")]),
    );
    const productCounts = new Map<string, number>();
    for (const row of (products.data ?? []) as Record<string, unknown>[]) {
      const id = String(row.organization_id);
      productCounts.set(id, (productCounts.get(id) ?? 0) + 1);
    }
    const ordersByOrg = new Map<string, { status: OrderStatus; totalPara: number; createdAt: string }[]>();
    for (const row of (orders.data ?? []) as Record<string, unknown>[]) {
      const id = String(row.organization_id);
      const list = ordersByOrg.get(id) ?? [];
      list.push({
        status: String(row.status) as OrderStatus,
        totalPara: Number(row.total_para),
        createdAt: String(row.created_at),
      });
      ordersByOrg.set(id, list);
    }
    const rows: PlatformSupplier[] = ((organizations.data ?? []) as Record<string, unknown>[])
      .map(mapOrganization)
      .sort((a, b) => a.name.localeCompare(b.name, "sr"))
      .map((organization) => {
        const subscription = subscriptionRows.find((item) => item.organizationId === organization.id) ?? null;
        const plan = subscription ? planRows.find((item) => item.id === subscription.planId) ?? null : null;
        const usage = monthOrderUsage(ordersByOrg.get(organization.id) ?? [], month);
        return {
          organization,
          plan,
          subscription,
          note: noteRows.get(organization.id) ?? "",
          productCount: productCounts.get(organization.id) ?? 0,
          ordersThisMonth: usage.ordersThisMonth,
          monthValuePara: usage.monthValuePara,
        };
      });
    return rows;
  },

  async setOrganizationActive(organizationId, active) {
    const existing = await db().from("organizations").select("id").eq("id", organizationId).maybeSingle();
    fail(existing.error);
    if (!existing.data) throw new DataError("Dobavljač nije pronađen.", "not_found");
    const { error } = await db()
      .from("organizations")
      .update({ active, updated_at: new Date().toISOString() })
      .eq("id", organizationId);
    fail(error);
  },

  async listPlans() {
    const { data, error } = await db().from("subscription_plans").select("*").order("monthly_price_para");
    fail(error);
    return ((data ?? []) as Record<string, unknown>[]).map(mapPlan);
  },

  async updatePlan(planId, input) {
    const name = input.name.trim();
    if (!name) throw new DataError("Unesite naziv paketa.", "validation");
    if (!Number.isInteger(input.monthlyPricePara) || input.monthlyPricePara < 0) {
      throw new DataError("Cena nije ispravna.", "validation");
    }
    const { data, error } = await db()
      .from("subscription_plans")
      .update({
        name,
        monthly_price_para: input.monthlyPricePara,
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .select("id")
      .maybeSingle();
    if (error?.code === "23505") throw new DataError("Paket sa ovim nazivom već postoji.", "conflict");
    fail(error);
    if (!data) throw new DataError("Paket nije pronađen.", "not_found");
  },

  async updateSubscription(organizationId, input) {
    if (!SUBSCRIPTION_STATUSES.has(input.status)) {
      throw new DataError("Status pretplate nije ispravan.", "validation");
    }
    const admin = db();
    const organization = await admin.from("organizations").select("id").eq("id", organizationId).maybeSingle();
    fail(organization.error);
    if (!organization.data) throw new DataError("Dobavljač nije pronađen.", "not_found");
    const plan = await admin.from("subscription_plans").select("id").eq("id", input.planId).maybeSingle();
    fail(plan.error);
    if (!plan.data) throw new DataError("Paket nije pronađen.", "not_found");
    const now = new Date().toISOString();
    const existing = await admin.from("subscriptions").select("id").eq("organization_id", organizationId).maybeSingle();
    fail(existing.error);
    if (!existing.data) {
      const inserted = await admin.from("subscriptions").insert({
        organization_id: organizationId,
        plan_id: input.planId,
        status: input.status,
        period_start: now,
      });
      fail(inserted.error);
      return;
    }
    const updated = await admin
      .from("subscriptions")
      .update({ plan_id: input.planId, status: input.status, updated_at: now })
      .eq("organization_id", organizationId);
    fail(updated.error);
  },

  async updateSupplierNote(organizationId, note) {
    const body = note.trim();
    if (body.length > 2000) throw new DataError("Beleška može imati najviše 2000 karaktera.", "validation");
    const organization = await db().from("organizations").select("id").eq("id", organizationId).maybeSingle();
    fail(organization.error);
    if (!organization.data) throw new DataError("Dobavljač nije pronađen.", "not_found");
    const { error } = await db().from("supplier_notes").upsert({
      organization_id: organizationId,
      body,
      updated_at: new Date().toISOString(),
    });
    fail(error);
  },

  async listInvoices(organizationId) {
    const { data, error } = await db()
      .from("platform_invoices")
      .select("*")
      .eq("organization_id", organizationId)
      .order("issued_at", { ascending: false });
    fail(error);
    return ((data ?? []) as Record<string, unknown>[]).map(mapInvoice);
  },
};

const SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>(["aktivna", "otkazana", "istekla"]);

function mapPlan(row: Record<string, unknown>): SubscriptionPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    monthlyPricePara: Number(row.monthly_price_para),
    description: String(row.description ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSubscription(row: Record<string, unknown>): Subscription {
  const status = String(row.status);
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    planId: String(row.plan_id),
    status: status === "otkazana" || status === "istekla" ? status : "aktivna",
    periodStart: String(row.period_start),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapInvoice(row: Record<string, unknown>): PlatformInvoice {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    number: String(row.number),
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    amountPara: Number(row.amount_para),
    status: row.status === "placena" ? "placena" : "neplacena",
    issuedAt: String(row.issued_at),
  };
}

const DUPLICATE_EMAIL = "Nalog sa ovom email adresom već postoji.";

function compareMembers(a: OrganizationMember, b: OrganizationMember) {
  if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
  return a.name.localeCompare(b.name, "sr");
}

function duplicateAccount(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "email_exists" ||
    error?.code === "23505" ||
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists") ||
    message.includes("duplicate")
  );
}

async function listOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  const members = await db()
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("organization_id", organizationId);
  fail(members.error);
  const rows = (members.data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return [];
  const profiles = await db()
    .from("profiles")
    .select("id, name, email")
    .in(
      "id",
      rows.map((row) => String(row.user_id)),
    );
  fail(profiles.error);
  const byId = new Map(
    ((profiles.data ?? []) as Record<string, unknown>[]).map((profile) => [String(profile.id), profile]),
  );
  return rows
    .flatMap((row) => {
      const profile = byId.get(String(row.user_id));
      if (!profile) return [];
      const role = row.role === "owner" ? "owner" : "staff";
      return [
        {
          id: String(row.id),
          userId: String(row.user_id),
          name: String(profile.name ?? ""),
          email: String(profile.email ?? ""),
          role,
          createdAt: String(row.created_at),
        } satisfies OrganizationMember,
      ];
    })
    .sort(compareMembers);
}

async function insertStaffMember(
  organizationId: string,
  input: { name: string; email: string; password: string },
): Promise<OrganizationMember> {
  const admin = db();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const organization = await admin.from("organizations").select("id").eq("id", organizationId).maybeSingle();
  fail(organization.error);
  if (!organization.data) throw new DataError("Prodavnica nije pronađena.", "not_found");

  const existing = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  fail(existing.error);
  if (existing.data) throw new DataError(DUPLICATE_EMAIL, "conflict");

  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (created.error || !created.data.user) {
    if (duplicateAccount(created.error)) throw new DataError(DUPLICATE_EMAIL, "conflict");
    const message = created.error?.message?.toLowerCase() ?? "";
    if (message.includes("password")) {
      throw new DataError("Lozinka mora imati bar 8 karaktera.", "validation");
    }
    throw new DataError("Zaposleni nije dodat. Pokušajte ponovo.", "validation");
  }

  const userId = created.data.user.id;
  const profile = await admin.from("profiles").upsert({
    id: userId,
    email,
    name,
    kind: "supplier",
  });
  if (profile.error) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    if (duplicateAccount(profile.error)) throw new DataError(DUPLICATE_EMAIL, "conflict");
    fail(profile.error);
  }

  const member = await admin
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      role: "staff",
    })
    .select("id, created_at")
    .single();
  if (member.error) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    if (duplicateAccount(member.error)) throw new DataError(DUPLICATE_EMAIL, "conflict");
    fail(member.error);
  }

  const row = member.data as Record<string, unknown>;
  return {
    id: String(row.id),
    userId,
    name,
    email,
    role: "staff",
    createdAt: String(row.created_at),
  };
}

async function assignDefaultSubscription(organizationId: string) {
  const admin = db();
  const plans = await admin.from("subscription_plans").select("id, name").order("monthly_price_para");
  fail(plans.error);
  const rows = (plans.data ?? []) as Record<string, unknown>[];
  const plan = rows.find((item) => item.name === "Osnovni") ?? rows[0];
  if (!plan) return;
  const inserted = await admin.from("subscriptions").insert({
    organization_id: organizationId,
    plan_id: String(plan.id),
    status: "aktivna",
    period_start: new Date().toISOString(),
  });
  if (inserted.error?.code === "23505") return;
  fail(inserted.error);
}

async function customerParties(organizationId: string) {
  const { data, error } = await db().from("customers").select("id, party, pib").eq("organization_id", organizationId);
  fail(error);
  const parties = new Map<string, Customer["party"]>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const pib = String(row.pib ?? "");
    const party = row.party === "fizicka" || row.party === "pravna" ? row.party : partyForPib(pib);
    parties.set(String(row.id), party);
  }
  return parties;
}

async function loadOrders(organizationId: string) {
  const { data, error } = await db().from("orders").select("*").eq("organization_id", organizationId);
  fail(error);
  return ((data ?? []) as Record<string, unknown>[]).map(mapOrder);
}

async function itemCounts(organizationId: string) {
  const { data, error } = await db().from("order_items").select("order_id").eq("organization_id", organizationId);
  fail(error);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const id = String(row.order_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function summarize(customer: Customer, orders: Order[]): CustomerSummary {
  const own = orders.filter((order) => order.customerId === customer.id);
  const last = [...own].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
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
    orderCount: own.length,
    totalPara: own.filter((order) => order.status !== "otkazana").reduce((sum, order) => sum + order.totalPara, 0),
    lastOrderAt: last?.createdAt ?? null,
  };
}

async function consumeRateLimit(key: string) {
  const admin = db();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const existing = await admin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("bucket", key)
    .gte("created_at", since);
  fail(existing.error);
  if ((existing.count ?? 0) >= 20) return false;
  const inserted = await admin.from("rate_limit_events").insert({ bucket: key });
  fail(inserted.error);
  return true;
}

async function allocateNumber(organizationId: string) {
  const admin = db();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await admin
      .from("organizations")
      .select("order_prefix, next_order_number")
      .eq("id", organizationId)
      .single();
    fail(current.error);
    const row = current.data as Record<string, unknown>;
    const sequence = Number(row.next_order_number);
    const number = `${String(row.order_prefix)}-${belgradeYear(new Date().toISOString())}-${String(sequence).padStart(4, "0")}`;
    const updated = await admin
      .from("organizations")
      .update({ next_order_number: sequence + 1, updated_at: new Date().toISOString() })
      .eq("id", organizationId)
      .eq("next_order_number", sequence)
      .select("id");
    fail(updated.error);
    if ((updated.data ?? []).length > 0) return number;
  }
  throw new DataError("Broj porudžbine nije dodeljen. Pokušajte ponovo.", "conflict");
}
