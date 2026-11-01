import type { PaymentMethod } from "@/lib/data/types";

const COMPANY_PIB = /^\d{9}$/;

export function isCompanyOrder(order: {
  paymentMethod: PaymentMethod | null;
  customerSnapshot: { pib: string };
}) {
  return order.paymentMethod === "racun" || COMPANY_PIB.test(order.customerSnapshot.pib);
}
