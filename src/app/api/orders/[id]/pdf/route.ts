import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { documentKind, documentLabel, partyForPib, paymentTermFor } from "@/lib/customers";
import { getCommerce } from "@/lib/data";
import type { PublicSupplier } from "@/lib/data/types";
import { buildTradeDocumentPdf } from "@/lib/pdf/trade-document";

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
    coverUrl: session.organization.coverUrl,
    description: session.organization.description,
    channel: session.organization.channel,
    audience: session.organization.audience,
  };
  const customer = await getCommerce().getCustomer(session.organization.id, order.customerId);
  const party = customer?.party ?? partyForPib(order.customerSnapshot.pib);
  const kind = documentKind(party);
  const pdf = await buildTradeDocumentPdf(order, supplier, {
    kind,
    paymentTermDays: paymentTermFor(party, customer?.paymentTermDays),
    customerCode: customer?.code || order.customerSnapshot.code,
  });
  const filename = `${kind}-${order.number}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "X-Document": documentLabel(kind),
    },
  });
}
