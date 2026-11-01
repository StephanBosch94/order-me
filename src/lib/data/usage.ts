import { belgradeMonthKey } from "@/lib/format";
import type { OrderStatus } from "@/lib/data/types";

export function monthOrderUsage(
  orders: { status: OrderStatus; totalPara: number; createdAt: string }[],
  month: string,
) {
  const inMonth = orders.filter((order) => belgradeMonthKey(order.createdAt) === month);
  return {
    ordersThisMonth: inMonth.length,
    monthValuePara: inMonth
      .filter((order) => order.status !== "otkazana")
      .reduce((sum, order) => sum + order.totalPara, 0),
  };
}
