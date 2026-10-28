import { NextResponse } from "next/server";

import { getCommerce } from "@/lib/data";
import { buildOrderConfirmationPdf } from "@/lib/pdf/order-confirmation";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const view = await getCommerce().getOrderByToken(token);
  if (!view) return NextResponse.json({ error: "Potvrda nije pronađena." }, { status: 404 });
  const pdf = await buildOrderConfirmationPdf(view.order, view.supplier);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="potvrda-${view.order.number}.pdf"`,
    },
  });
}
