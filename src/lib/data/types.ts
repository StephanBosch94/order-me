export const ORDER_STATUS_VALUES = [
  "nova",
  "potvrdjena",
  "u_pripremi",
  "isporucena",
  "otkazana",
] as const;

export const UNIT_VALUES = ["komad", "paket", "kutija", "kilogram", "litar"] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];
export type Unit = (typeof UNIT_VALUES)[number];
export type MemberRole = "owner" | "admin" | "staff";
export type StoreChannel = "b2c" | "b2b";
export type Audience = "fizicka" | "pravna" | "oba";
export type PaymentMethod = "pouzecem" | "ips" | "kartica" | "racun";

export type AccountContext = {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  organization: Organization;
};

export type OrganizationMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  createdAt: string;
};

export type BuyerAccount = {
  kind: "buyer";
  userId: string;
  name: string;
  email: string;
  /** Where potvrde porudžbine are sent. Empty means the login email. */
  confirmationEmail: string;
  businessName: string;
  phone: string;
  address: string;
  city: string;
  pib: string;
  mb: string;
  postalCode: string;
  bankAccount: string;
};

export type SupplierAccount = AccountContext & { kind: "supplier" };

export type PlatformAccount = {
  kind: "platform";
  userId: string;
  name: string;
  email: string;
};

export type SessionAccount = SupplierAccount | BuyerAccount | PlatformAccount;

export type BuyerOrder = {
  id: string;
  number: string;
  status: OrderStatus;
  totalPara: number;
  createdAt: string;
  supplierName: string;
  supplierSlug: string;
  supplierChannel: StoreChannel;
  supplierAudience: Audience;
  confirmationToken: string;
  itemCount: number;
  items: { productId: string | null; name: string; quantity: number; unit: Unit; imageUrl: string | null }[];
};
export type EmailDelivery = "pending" | "sent" | "outbox" | "failed" | "skipped";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  email: string;
  notificationEmail: string;
  phone: string;
  address: string;
  city: string;
  pib: string;
  mb: string;
  logoUrl: string | null;
  brandColor: string | null;
  coverUrl: string | null;
  description: string;
  /** Marketplace category. Empty until the supplier picks one. */
  trade: string;
  channel: StoreChannel;
  audience: Audience;
  orderPrefix: string;
  nextOrderNumber: number;
  active: boolean;
  /** When false, buyers cannot order on the public page. Staff still enter orders and customers. */
  publicStore: boolean;
  /** When true, products show warehouse stock and orders change it. */
  trackStock: boolean;
  /** SEF ApiKey. Kept on the organization and never written into the page. */
  efakturaApiKey: string;
  /** When true, a legal-entity invoice can be sent to SEF. */
  efakturaEnabled: boolean;
  /** demo uses the Ministry demo host. produkcija uses the live host. */
  efakturaEnvironment: "demo" | "produkcija";
  createdAt: string;
  updatedAt: string;
};

export type PublicSupplier = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pib: string;
  mb: string;
  logoUrl: string | null;
  brandColor: string | null;
  coverUrl: string | null;
  description: string;
  channel: StoreChannel;
  audience: Audience;
};

export type Category = {
  id: string;
  organizationId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export type Product = {
  id: string;
  organizationId: string;
  categoryId: string | null;
  name: string;
  sku: string;
  description: string;
  unit: Unit;
  pricePara: number;
  salePricePara: number | null;
  imageUrl: string | null;
  imageUrls: string[];
  active: boolean;
  minQuantity: number;
  /** On-hand quantity in the product unit. Zero means the warehouse is empty. */
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomerParty = "fizicka" | "pravna";

export type Customer = {
  id: string;
  organizationId: string;
  /** Unique customer code inside one distributor, for example K-0001. */
  code: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  pib: string;
  address: string;
  city: string;
  notes: string;
  party: CustomerParty;
  /** Days until the invoice due date. Zero means payment is due immediately. Only legal entities use it. */
  paymentTermDays: number;
  /** Seller's mark that this legal entity is registered in the Serbian e-invoice system. */
  sefRegistered: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerSnapshot = {
  code: string;
  businessName: string;
  contactName: string;
  email: string;
  /** Address that receives the potvrda. Empty means `email`. */
  confirmationEmail?: string;
  phone: string;
  pib: string;
  mb: string;
  address: string;
  postalCode: string;
  city: string;
  bankAccount: string;
};

export type Order = {
  id: string;
  organizationId: string;
  customerId: string;
  buyerUserId: string | null;
  number: string;
  status: OrderStatus;
  notes: string;
  subtotalPara: number;
  totalPara: number;
  idempotencyKey: string;
  confirmationToken: string;
  customerSnapshot: CustomerSnapshot;
  customerEmailStatus: EmailDelivery;
  supplierEmailStatus: EmailDelivery;
  paymentMethod: PaymentMethod | null;
  /** True while this order is holding warehouse quantities. Absent on older orders that never reserved stock. */
  stockHeld?: boolean;
  /** Sales invoice id returned by SEF. Empty until a send succeeds. */
  sefInvoiceId: string | null;
  sefStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  organizationId: string;
  productId: string | null;
  name: string;
  sku: string;
  unit: Unit;
  quantity: number;
  unitPricePara: number;
  lineTotalPara: number;
};

export type OrderStatusEvent = {
  id: string;
  orderId: string;
  organizationId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorName: string;
  createdAt: string;
};

export type OrderDetail = Order & {
  items: OrderItem[];
  history: OrderStatusEvent[];
};

export type OrderListItem = {
  id: string;
  number: string;
  status: OrderStatus;
  totalPara: number;
  createdAt: string;
  businessName: string;
  contactName: string;
  itemCount: number;
  paymentMethod: PaymentMethod | null;
  pib: string;
  party: CustomerParty;
};

export type CustomerSummary = {
  id: string;
  code: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  party: CustomerParty;
  paymentTermDays: number;
  sefRegistered: boolean;
  orderCount: number;
  totalPara: number;
  lastOrderAt: string | null;
};

export type CustomerDetail = Customer & {
  orders: OrderListItem[];
  orderCount: number;
  totalPara: number;
};

export type PublicCatalog = {
  supplier: PublicSupplier;
  categories: Category[];
  products: Product[];
  closedMessage?: string;
};

export type MarketplaceStore = {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string;
  trade: string;
  logoUrl: string | null;
  coverUrl: string | null;
  brandColor: string | null;
  productCount: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type OrderListQuery = {
  q?: string;
  status?: OrderStatus | "all";
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "total_desc" | "total_asc";
  page?: number;
  pageSize?: number;
  /** True: only company orders. False: exclude them. Omit to return every order. */
  company?: boolean;
};

export type OrderedQuantity = {
  createdAt: string;
  status: OrderStatus;
  productId: string | null;
  name: string;
  quantity: number;
  unit: Unit;
  imageUrl: string | null;
};

export type SalesFollowUpKind = "kasni" | "jedna" | "nije_narucio";

export type SalesFollowUp = {
  customerId: string;
  code: string;
  businessName: string;
  email: string;
  phone: string;
  lastOrderAt: string | null;
  orderCount: number;
  /** Typical days between orders. Empty when there is no rhythm yet. */
  intervalDays: number | null;
  daysSince: number;
  averagePara: number;
  kind: SalesFollowUpKind;
};

export type DashboardData = {
  newOrders: number;
  awaitingConfirmation: number;
  processedThisMonth: number;
  monthValuePara: number;
  activeProducts: number;
  recentOrders: OrderListItem[];
  followUps: SalesFollowUp[];
  hasProducts: boolean;
  hasOrders: boolean;
};

export type ImportRowError = {
  row: number;
  message: string;
};

export type ImportResult = {
  created: number;
  errors: ImportRowError[];
};

export type ProductInput = {
  name: string;
  sku: string;
  description: string;
  categoryId: string | null;
  newCategory: string;
  unit: Unit;
  pricePara: number;
  salePricePara: number | null;
  minQuantity: number;
  stockQuantity: number;
  active: boolean;
  imageUrl?: string | null;
  imageUrls?: string[];
};

export type OrganizationInput = {
  name: string;
  slug: string;
  email: string;
  notificationEmail: string;
  phone: string;
  address: string;
  city: string;
  pib: string;
  mb: string;
  logoUrl: string | null;
  brandColor: string | null;
  coverUrl: string | null;
  description: string;
  trade: string;
  audience: Audience;
  trackStock: boolean;
  publicStore: boolean;
  efakturaApiKey: string;
  efakturaEnabled: boolean;
  efakturaEnvironment: "demo" | "produkcija";
};

export type CustomerInput = {
  code: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  pib: string;
  address: string;
  city: string;
  notes: string;
  party: CustomerParty;
  paymentTermDays: number;
  sefRegistered: boolean;
};

export type PublicOrderInput = {
  slug: string;
  idempotencyKey: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  pib: string;
  mb?: string;
  address: string;
  postalCode?: string;
  city: string;
  notes: string;
  items: { productId: string; quantity: number }[];
  buyerUserId?: string | null;
  paymentMethod?: PaymentMethod | null;
  bankAccount?: string;
  /** Resolved potvrda address. Empty means the order contact email. */
  confirmationEmail?: string;
};

export type StaffOrderInput = {
  customerId: string;
  notes: string;
  items: { productId: string; quantity: number }[];
  actorName: string;
};

export type CreateOrderResult =
  | {
      ok: true;
      duplicate: boolean;
      order: OrderDetail;
      supplier: PublicSupplier;
    }
  | { ok: false; message: string };

export type PublicOrderView = {
  order: OrderDetail;
  supplier: PublicSupplier;
};

export type SubscriptionStatus = "aktivna" | "otkazana" | "istekla";
export type InvoiceStatus = "placena" | "neplacena";

export type SubscriptionPlan = {
  id: string;
  name: string;
  monthlyPricePara: number;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type Subscription = {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  periodStart: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierNote = {
  organizationId: string;
  body: string;
  updatedAt: string;
};

export type PlatformInvoice = {
  id: string;
  organizationId: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  amountPara: number;
  status: InvoiceStatus;
  issuedAt: string;
};

export type PlatformSupplier = {
  organization: Organization;
  plan: SubscriptionPlan | null;
  subscription: Subscription | null;
  note: string;
  productCount: number;
  ordersThisMonth: number;
  monthValuePara: number;
};
