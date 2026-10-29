import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SupplierLogo } from "@/components/brand/supplier-logo";
import { supplierTheme } from "@/lib/color";
import { paymentLabel, storePath, unitLabel } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import { formatDateTime, formatQuantity, formatRsd } from "@/lib/format";

export const metadata: Metadata = { title: "Potvrda porudžbine" };

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const view = await getCommerce().getOrderByToken(token);
  if (!view || view.supplier.slug !== slug) notFound();
  const { order, supplier } = view;
  const emailNote =
    order.customerEmailStatus === "sent"
      ? `Poslali smo potvrdu na ${order.customerSnapshot.email}.`
      : order.customerEmailStatus === "outbox"
        ? "Porudžbina je sačuvana. Email servis nije podešen, pa je poruka upisana lokalno."
        : order.customerEmailStatus === "failed"
          ? "Porudžbina je primljena. Email trenutno nije poslat, ali porudžbina nije izgubljena."
          : "Porudžbina je primljena.";

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-10" style={supplierTheme(supplier.brandColor)}>
      <div className="flex items-center gap-3">
        <SupplierLogo name={supplier.name} logoUrl={supplier.logoUrl} />
        <p className="text-sm font-medium">{supplier.name}</p>
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Porudžbina {order.number} je primljena
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
      <p className="mt-4 text-sm">{emailNote}</p>
      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <ul>
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 text-sm last:border-0">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">
                  {formatQuantity(item.quantity)} {unitLabel(item.unit).toLowerCase()}
                </p>
              </div>
              <p className="tabular-nums">{formatRsd(item.lineTotalPara)}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-between px-4 py-3 text-sm font-semibold">
          <span>Ukupno</span>
          <span className="tabular-nums">{formatRsd(order.totalPara)}</span>
        </div>
        {order.paymentMethod ? (
          <p className="border-t border-border px-4 py-3 text-sm">
            Način plaćanja: {paymentLabel(order.paymentMethod)}
          </p>
        ) : null}
      </section>
      <p className="mt-4 text-sm text-muted-foreground">
        Ovo je potvrda porudžbine. Nije fiskalni račun ni faktura.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={`/api/confirmations/${order.confirmationToken}/pdf`} className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Preuzmi potvrdu
        </a>
        <Link
          href={storePath(supplier.slug)}
          className="inline-flex h-11 items-center rounded-md border border-border bg-card px-4 text-sm font-medium"
        >
          Nazad u prodavnicu
        </Link>
      </div>
    </main>
  );
}
