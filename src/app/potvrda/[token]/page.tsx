import type { Metadata } from "next";

import { OrderConfirmation } from "@/components/shop/order-confirmation";

export const metadata: Metadata = { title: "Potvrda porudžbine", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PublicConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <OrderConfirmation token={token} />;
}
