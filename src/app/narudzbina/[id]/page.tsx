import { redirect } from "next/navigation";

import { buyerDestination, getSession } from "@/lib/auth";
import { confirmationPath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";

export default async function OpenBuyerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/orders/${id}`)}`);
  if (session.kind === "supplier") redirect(`/orders/${id}`);
  if (session.kind !== "buyer") redirect("/dashboard");
  const orders = await getCommerce().listBuyerOrders(session.userId);
  const order = orders.find((item) => item.id === id);
  const path = order ? confirmationPath(order.supplierSlug, order.confirmationToken) : null;
  redirect(path ?? (await buyerDestination("", session.userId)));
}
