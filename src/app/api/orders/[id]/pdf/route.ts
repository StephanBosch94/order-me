import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import type { PublicSupplier } from "@/lib/data/types";
import { buildOrderConfirmationPdf } from "@/lib/pdf/order-confirmation";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await context.params;
  const order = await getCommerce().getOrder(session.organization.id, id);
  if (!order) return NextResponse.json({ error: "Porudžbina nije pronađena." }, { status: 404 });

  const supplier: PublicSupplier = {
    id: session.organization.id,
    name: session.organization.name,
    slug: session.organization.slug,
    email: session.organization.email,
    phone: session.organization.phone,
    address: session.organization.address,
    city: session.organization.city,
    pib: session.organization.pib,
    mb: session.organization.mb,
    logoUrl: session.organization.logoUrl,
    brandColor: session.organization.brandColor,
  };
  const pdf = await buildOrderConfirmationPdf(order, supplier);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="potvrda-${order.number}.pdf"`,
    },
  });
}
