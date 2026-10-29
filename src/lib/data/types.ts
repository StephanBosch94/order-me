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
export type MemberRole = "owner" | "staff";
export type StoreChannel = "b2c" | "b2b";
export type Audience = "fizicka" | "pravna" | "oba";
export type PaymentMethod = "pouzecem" | "kartica";

export type AccountContext = {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  organization: Organization;
};

export type BuyerAccount = {
  kind: "buyer";
  userId: string;
  name: string;
  email: string;
  businessName: string;
  phone: string;
  address: string;
  city: string;
  pib: string;
};

export type SupplierAccount = AccountContext & { kind: "supplier" };
export type SessionAccount = SupplierAccount | BuyerAccount;

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
  items: { productId: string | null; name: string; quantity: number; unit: Unit }[];
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
  channel: StoreChannel;
  audience: Audience;
  orderPrefix: string;
  nextOrderNumber: number;
  active: boolean;
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
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  organizationId: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  pib: string;
  address: string;
  city: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerSnapshot = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  pib: string;
  address: string;
  city: string;
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
};

export type CustomerSummary = {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
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
};

export type DashboardData = {
  newOrders: number;
  awaitingConfirmation: number;
  processedThisMonth: number;
  monthValuePara: number;
  activeProducts: number;
  recentOrders: OrderListItem[];
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
  audience: Audience;
};

export type CustomerInput = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  pib: string;
  address: string;
  city: string;
  notes: string;
};

export type PublicOrderInput = {
  slug: string;
  idempotencyKey: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  pib: string;
  address: string;
  city: string;
  notes: string;
  items: { productId: string; quantity: number }[];
  buyerUserId?: string | null;
  paymentMethod?: PaymentMethod | null;
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
