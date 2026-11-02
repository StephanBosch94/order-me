import type { SalesFollowUp, SalesFollowUpKind } from "@/lib/data/types";
import { belgradeDateKey } from "@/lib/format";

export type FollowUpCustomer = {
  id: string;
  code: string;
  businessName: string;
  email: string;
  phone: string;
  createdAt: string;
};

export type FollowUpOrder = {
  customerId: string;
  status: string;
  totalPara: number;
  createdAt: string;
};

const QUIET_AFTER_FIRST_ORDER_DAYS = 14;

export function salesFollowUps(
  customers: FollowUpCustomer[],
  orders: FollowUpOrder[],
  now = new Date(),
): SalesFollowUp[] {
  const today = dayIndex(now.toISOString());
  const items: SalesFollowUp[] = [];

  for (const customer of customers) {
    const own = orders
      .filter((order) => order.customerId === customer.id && order.status !== "otkazana")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (own.length === 0) {
      items.push(row(customer, "nije_narucio", Math.max(today - dayIndex(customer.createdAt), 0), null, null, 0, 0));
      continue;
    }
    const last = own[own.length - 1];
    const daysSince = Math.max(today - dayIndex(last.createdAt), 0);
    const averagePara = Math.round(own.reduce((sum, order) => sum + order.totalPara, 0) / own.length);
    if (own.length === 1) {
      if (daysSince >= QUIET_AFTER_FIRST_ORDER_DAYS) {
        items.push(row(customer, "jedna", daysSince, last.createdAt, null, averagePara, 1));
      }
      continue;
    }
    const gaps = own.slice(1).map((order, index) => dayIndex(order.createdAt) - dayIndex(own[index].createdAt));
    const intervalDays = Math.max(median(gaps), 1);
    if (daysSince >= intervalDays) {
      items.push(row(customer, "kasni", daysSince, last.createdAt, intervalDays, averagePara, own.length));
    }
  }

  const rank: Record<SalesFollowUpKind, number> = { kasni: 0, jedna: 1, nije_narucio: 2 };
  return items.sort((a, b) => {
    const byKind = rank[a.kind] - rank[b.kind];
    if (byKind !== 0) return byKind;
    const overdueA = a.daysSince - (a.intervalDays ?? 0);
    const overdueB = b.daysSince - (b.intervalDays ?? 0);
    if (overdueB !== overdueA) return overdueB - overdueA;
    return b.averagePara - a.averagePara;
  });
}

export function followUpReason(item: SalesFollowUp) {
  if (item.kind === "nije_narucio") return "Još nema porudžbine.";
  if (item.kind === "jedna") {
    return `Samo jedna porudžbina, pre ${item.daysSince} ${dayWord(item.daysSince)}.`;
  }
  return `Van ritma. Naručuje na oko ${item.intervalDays} ${dayWord(item.intervalDays ?? 0)}. Prošlo je ${item.daysSince} ${dayWord(item.daysSince)}.`;
}

function row(
  customer: FollowUpCustomer,
  kind: SalesFollowUpKind,
  daysSince: number,
  lastOrderAt: string | null,
  intervalDays: number | null,
  averagePara: number,
  orderCount: number,
): SalesFollowUp {
  return {
    customerId: customer.id,
    code: customer.code,
    businessName: customer.businessName,
    email: customer.email,
    phone: customer.phone,
    lastOrderAt,
    orderCount,
    intervalDays,
    daysSince,
    averagePara,
    kind,
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

function dayIndex(iso: string) {
  const [year, month, day] = belgradeDateKey(iso).split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function dayWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "dan";
  return "dana";
}
