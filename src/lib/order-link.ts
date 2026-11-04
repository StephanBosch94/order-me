import { confirmationPath } from "@/lib/constants";

/** Header set by the request proxy so a signed-in buyer can be sent to the order they opened. */
export const REQUEST_PATH_HEADER = "x-poruci-path";

type LinkedOrder = {
  id: string;
  supplierSlug: string;
  confirmationToken: string;
};

/** A buyer who opens a seller order link should land on that order, not the shop catalog. */
export function buyerOrderDestination(nextPath: string, orders: LinkedOrder[]): string | null {
  const path = (nextPath.split("?")[0] ?? "").replace(/\/$/, "");
  const id = path.match(/^\/orders\/([^/]+)$/)?.[1];
  if (!id) return null;
  let orderId = id;
  try {
    orderId = decodeURIComponent(id);
  } catch {
    orderId = id;
  }
  const order = orders.find((item) => item.id === orderId);
  if (!order) return null;
  return confirmationPath(order.supplierSlug, order.confirmationToken);
}
