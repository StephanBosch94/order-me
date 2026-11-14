import type { Metadata } from "next";

import { OrderConfirmation } from "@/components/shop/order-confirmation";

export const metadata: Metadata = { title: "Potvrda porudžbine" };
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  return <OrderConfirmation slug={slug} token={token} />;
}
