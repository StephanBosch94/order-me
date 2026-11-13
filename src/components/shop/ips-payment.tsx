import QRCode from "qrcode";

import { formatRsd } from "@/lib/format";
import { formatIpsAccount, ipsPayload, ipsPurpose } from "@/lib/ips";

export async function IpsPayment({
  account,
  recipient,
  amountPara,
  orderNumber,
}: {
  account: string;
  recipient: string;
  amountPara: number;
  orderNumber: string;
}) {
  const payload = ipsPayload({ account, recipient, amountPara, orderNumber });
  if (!payload) return null;
  const svg = (await QRCode.toString(payload, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 168 }))
    .replace(/<\?xml[^>]*>/, "")
    .replace("<svg", '<svg class="size-full"');
  const rows = [
    ["Primalac", recipient],
    ["Račun", formatIpsAccount(account)],
    ["Iznos", formatRsd(amountPara)],
    ["Svrha", ipsPurpose(orderNumber)],
  ];
  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">IPS uplata</h2>
      <p className="mt-1 text-sm text-muted-foreground">Skenirajte kod u aplikaciji banke.</p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="size-40 shrink-0 bg-white" dangerouslySetInnerHTML={{ __html: svg }} />
        <dl className="space-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
