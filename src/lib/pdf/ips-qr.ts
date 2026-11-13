import "server-only";

import QRCode from "qrcode";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formatRsd } from "@/lib/format";
import { formatIpsAccount, ipsPayload, ipsPurpose } from "@/lib/ips";

const INK = rgb(0.09, 0.11, 0.14);
const MUTED = rgb(0.38, 0.4, 0.44);

export const IPS_BLOCK_HEIGHT = 112;

export async function drawIpsPayment(
  doc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  top: number,
  input: { account: string; recipient: string; amountPara: number; orderNumber: string },
) {
  const payload = ipsPayload(input);
  if (!payload) return false;
  const png = await QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });
  const image = await doc.embedPng(png);
  const size = 96;
  page.drawImage(image, { x, y: top - size, width: size, height: size });
  const lines: Array<[string, boolean]> = [
    ["IPS uplata", true],
    ["Skenirajte kod u aplikaciji banke.", false],
    [input.recipient.replace(/\s+/g, " ").trim().slice(0, 42), false],
    [`Račun: ${formatIpsAccount(input.account)}`, false],
    [`Iznos: ${formatRsd(input.amountPara)}`, false],
    [`Svrha: ${ipsPurpose(input.orderNumber)}`, false],
  ];
  let textY = top - 14;
  for (const [line, bold] of lines) {
    if (!line) continue;
    page.drawText(line, {
      x: x + size + 12,
      y: textY,
      size: bold ? 11 : 9,
      font: bold ? fontBold : font,
      color: bold ? INK : MUTED,
    });
    textY -= 14;
  }
  return true;
}
