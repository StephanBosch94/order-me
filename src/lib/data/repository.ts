import type { CsvProductRow } from "@/lib/csv";
import type {
  AccountContext,
  Category,
  CreateOrderResult,
  Customer,
  CustomerDetail,
  CustomerInput,
  CustomerSummary,
  DashboardData,
  EmailDelivery,
  ImportResult,
  OrderDetail,
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
} from "@/lib/data/types";

export type CreateOrganizationInput = {
  userId: string;
  userName: string;
  userEmail: string;
  name: string;
  slug: string;
  phone: string;
};

export type { AccountContext };

export interface CommerceRepository {
  createOrganization(input: CreateOrganizationInput): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | null>;
  getAccount(userId: string): Promise<AccountContext | null>;
  updateOrganization(id: string, input: OrganizationInput): Promise<Organization>;
  isSlugTaken(slug: string, exceptId?: string): Promise<boolean>;
  listCategories(organizationId: string): Promise<Category[]>;
  listProducts(organizationId: string): Promise<Product[]>;
  getProduct(organizationId: string, productId: string): Promise<Product | null>;
  createProduct(organizationId: string, input: ProductInput): Promise<Product>;
  updateProduct(
    organizationId: string,
    productId: string,
    input: ProductInput,
  ): Promise<Product | null>;
  importProducts(organizationId: string, rows: CsvProductRow[]): Promise<ImportResult>;
  listCustomers(organizationId: string, query?: string): Promise<CustomerSummary[]>;
  getCustomer(organizationId: string, customerId: string): Promise<CustomerDetail | null>;
  updateCustomer(
    organizationId: string,
    customerId: string,
    input: CustomerInput,
  ): Promise<Customer | null>;
  listOrders(organizationId: string, query: OrderListQuery): Promise<Paginated<OrderListItem>>;
  getOrder(organizationId: string, orderId: string): Promise<OrderDetail | null>;
  getOrderByToken(token: string): Promise<PublicOrderView | null>;
  createPublicOrder(input: PublicOrderInput, ip: string): Promise<CreateOrderResult>;
  updateOrderStatus(
    organizationId: string,
    orderId: string,
    status: OrderStatus,
    actorName: string,
  ): Promise<OrderDetail | null>;
  setEmailStatus(orderId: string, customer: EmailDelivery, supplier: EmailDelivery): Promise<void>;
  getDashboard(organizationId: string): Promise<DashboardData>;
  getPublicCatalog(slug: string): Promise<PublicCatalog | null>;
}
