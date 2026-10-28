import { randomUUID } from "node:crypto";

import type { CsvProductRow } from "@/lib/csv";
import { RESERVED_SLUGS } from "@/lib/constants";
import type { CommerceRepository, CreateOrganizationInput } from "@/lib/data/repository";
import { priceOrderLines } from "@/lib/data/pricing";
import type {
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
  Paginated,
  Product,
  ProductInput,
  PublicCatalog,
  PublicOrderInput,
  PublicOrderView,
  PublicSupplier,
  Unit,
} from "@/lib/data/types";
import { DataError } from "@/lib/errors";
import { belgradeDateKey, belgradeMonthKey, belgradeYear } from "@/lib/format";
import { getServiceClient } from "@/lib/supabase/admin";
import { fold, orderPrefixFromName } from "@/lib/text";

type DbError = { message: string; code?: string } | null;

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
    orderPrefix: String(row.order_prefix),
    nextOrderNumber: Number(row.next_order_number),
    active: Boolean(row.active),
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
    imageUrl: row.image_url ? String(row.image_url) : null,
    active: Boolean(row.active),
    minQuantity: Number(row.min_quantity),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    businessName: String(row.business_name),
    contactName: String(row.contact_name),
    email: String(row.email),
    phone: String(row.phone ?? ""),
    pib: String(row.pib ?? ""),
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    customerId: String(row.customer_id),
    number: String(row.number),
    status: String(row.status) as OrderStatus,
    notes: String(row.notes ?? ""),
    subtotalPara: Number(row.subtotal_para),
    totalPara: Number(row.total_para),
    idempotencyKey: String(row.idempotency_key),
    confirmationToken: String(row.confirmation_token),
    customerSnapshot: row.customer_snapshot as CustomerSnapshot,
    customerEmailStatus: String(row.customer_email_status) as EmailDelivery,
    supplierEmailStatus: String(row.supplier_email_status) as EmailDelivery,
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

function listItem(order: Order, itemCount: number): OrderListItem {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    totalPara: order.totalPara,
    createdAt: order.createdAt,
    businessName: order.customerSnapshot.businessName,
    contactName: order.customerSnapshot.contactName,
    itemCount,
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
        order_prefix: orderPrefixFromName(input.name),
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
    });
    fail(profile.error);
    const member = await admin.from("organization_members").insert({
      organization_id: organization.id,
      user_id: input.userId,
      role: "owner",
    });
    fail(member.error);
    return organization;
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
        image_url: input.imageUrl ?? null,
        active: input.active,
        min_quantity: input.minQuantity,
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
      active: input.active,
      min_quantity: input.minQuantity,
      updated_at: new Date().toISOString(),
    };
    if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
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
          minQuantity: row.minQuantity,
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

  async listCustomers(organizationId, query) {
    const { data, error } = await db().from("customers").select("*").eq("organization_id", organizationId);
    fail(error);
    const customers = ((data ?? []) as Record<string, unknown>[]).map(mapCustomer);
    const orders = await loadOrders(organizationId);
    const needle = fold(query ?? "");
    return customers
      .filter((customer) => {
        if (!needle) return true;
        return [customer.businessName, customer.contactName, customer.email, customer.city]
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
      .map((order) => listItem(order, counts.get(order.id) ?? 0));
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
    const { data, error } = await db()
      .from("customers")
      .update({
        business_name: input.businessName,
        contact_name: input.contactName,
        email: input.email,
        phone: input.phone,
        pib: input.pib,
        address: input.address,
        city: input.city,
        notes: input.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("id", customerId)
      .select("*")
      .maybeSingle();
    fail(error);
    return data ? mapCustomer(data as Record<string, unknown>) : null;
  },

  async listOrders(organizationId, query: OrderListQuery) {
    const orders = await loadOrders(organizationId);
    const counts = await itemCounts(organizationId);
    let rows = orders;
    if (query.status && query.status !== "all") rows = rows.filter((order) => order.status === query.status);
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
    const result: Paginated<OrderListItem> = {
      items: rows.slice(start, start + pageSize).map((order) => listItem(order, counts.get(order.id) ?? 0)),
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
    const orgResult = await admin.from("organizations").select("*").eq("slug", input.slug).eq("active", true).maybeSingle();
    fail(orgResult.error);
    if (!orgResult.data) return { ok: false, message: "Dobavljač nije pronađen." };
    const organization = mapOrganization(orgResult.data as Record<string, unknown>);

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
      businessName: customer.businessName,
      contactName: customer.contactName,
      email: customer.email,
      phone: customer.phone,
      pib: customer.pib,
      address: customer.address,
      city: customer.city,
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
    const admin = db();
    const updated = await admin
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
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
    return orderDetail(mapOrder(updated.data as Record<string, unknown>));
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
    const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
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
      recentOrders: recent.map((order) => listItem(order, counts.get(order.id) ?? 0)),
      hasProducts: products.length > 0,
      hasOrders: orders.length > 0,
    };
    return data;
  },

  async getPublicCatalog(slug) {
    const { data, error } = await db()
      .from("organizations")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    fail(error);
    if (!data) return null;
    const organization = mapOrganization(data as Record<string, unknown>);
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
};

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
    businessName: customer.businessName,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
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
