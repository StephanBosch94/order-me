import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { unitLabel } from "@/lib/constants";
import type { OrderDetail, PublicSupplier } from "@/lib/data/types";
import { formatDateTime, formatQuantity, formatRsd } from "@/lib/format";

let regularBytes: Uint8Array | null = null;
let boldBytes: Uint8Array | null = null;

async function loadFonts() {
  if (!regularBytes || !boldBytes) {
    const dir = path.join(process.cwd(), "assets", "fonts");
    regularBytes = await readFile(path.join(dir, "Roboto-Regular.ttf"));
    boldBytes = await readFile(path.join(dir, "Roboto-Bold.ttf"));
  }
  return { regularBytes, boldBytes };
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function buildOrderConfirmationPdf(order: OrderDetail, supplier: PublicSupplier) {
  const { regularBytes: regular, boldBytes: bold } = await loadFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(regular, { subset: true });
  const fontBold = await doc.embedFont(bold, { subset: true });

  let page = doc.addPage([595.28, 841.89]);
  let y = 790;
  const left = 48;
  const right = 547;

  const ensure = (height: number) => {
    if (y - height < 56) {
      drawFooter(page, font, order.number);
      page = doc.addPage([595.28, 841.89]);
      y = 790;
    }
  };

  page.drawText("POTVRDA PORUDŽBINE", { x: left, y, size: 18, font: fontBold, color: rgb(0.09, 0.09, 0.11) });
  y -= 18;
  page.drawText("Ovaj dokument nije fiskalni račun ni faktura.", {
    x: left,
    y,
    size: 9,
    font,
    color: rgb(0.38, 0.38, 0.42),
  });
  y -= 8;
  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 1.5,
    color: rgb(0.19, 0.18, 0.51),
  });
  y -= 22;

  const supplierLines = [
    supplier.name,
    [supplier.address, supplier.city].filter(Boolean).join(", "),
    supplier.phone,
    supplier.email,
    supplier.pib ? `PIB: ${supplier.pib}` : "",
    supplier.mb ? `MB: ${supplier.mb}` : "",
  ].filter(Boolean);
  const meta = [
    `Broj: ${order.number}`,
    `Datum: ${formatDateTime(order.createdAt)}`,
    `Status: ${statusText(order.status)}`,
  ];

  const blockHeight = Math.max(supplierLines.length, meta.length) * 14;
  ensure(blockHeight + 20);
  supplierLines.forEach((line, index) => {
    page.drawText(line, {
      x: left,
      y: y - index * 14,
      size: 10,
      font: index === 0 ? fontBold : font,
      color: rgb(0.09, 0.09, 0.11),
    });
  });
  meta.forEach((line, index) => {
    const width = font.widthOfTextAtSize(line, 10);
    page.drawText(line, {
      x: right - width,
      y: y - index * 14,
      size: 10,
      font,
      color: rgb(0.09, 0.09, 0.11),
    });
  });
  y -= blockHeight + 18;

  page.drawText("Kupac", { x: left, y, size: 11, font: fontBold, color: rgb(0.09, 0.09, 0.11) });
  y -= 16;
  const customer = order.customerSnapshot;
  const customerLines = [
    customer.businessName,
    customer.contactName,
    customer.email,
    customer.phone,
    [customer.address, customer.city].filter(Boolean).join(", "),
    customer.pib ? `PIB: ${customer.pib}` : "",
  ].filter(Boolean);
  for (const line of customerLines) {
    ensure(14);
    page.drawText(line, { x: left, y, size: 10, font, color: rgb(0.09, 0.09, 0.11) });
    y -= 14;
  }
  y -= 12;

  ensure(24);
  drawRow(page, fontBold, y, ["Proizvod", "Jedinica", "Količina", "Cena", "Ukupno"], true);
  y -= 8;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: rgb(0.82, 0.82, 0.85) });
  y -= 16;

  for (const item of order.items) {
    const nameLines = wrap(item.name, font, 10, 210);
    const rowHeight = Math.max(nameLines.length, 1) * 13 + 6;
    ensure(rowHeight + 8);
    nameLines.forEach((line, index) => {
      page.drawText(line, { x: left, y: y - index * 13, size: 10, font, color: rgb(0.09, 0.09, 0.11) });
    });
    drawAligned(page, font, unitLabel(item.unit), 300, y, 60);
    drawAligned(page, font, formatQuantity(item.quantity), 360, y, 40);
    drawAligned(page, font, formatRsd(item.unitPricePara), 405, y, 65);
    drawAligned(page, font, formatRsd(item.lineTotalPara), 475, y, 72);
    y -= rowHeight;
  }

  y -= 6;
  ensure(28);
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: rgb(0.82, 0.82, 0.85) });
  y -= 20;
  const total = `Ukupno: ${formatRsd(order.totalPara)}`;
  page.drawText(total, {
    x: right - fontBold.widthOfTextAtSize(total, 12),
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.09, 0.09, 0.11),
  });
  y -= 24;

  if (order.notes) {
    ensure(36);
    page.drawText("Napomena kupca", { x: left, y, size: 11, font: fontBold, color: rgb(0.09, 0.09, 0.11) });
    y -= 16;
    for (const line of wrap(order.notes, font, 10, right - left)) {
      ensure(14);
      page.drawText(line, { x: left, y, size: 10, font, color: rgb(0.09, 0.09, 0.11) });
      y -= 14;
    }
  }

  drawFooter(page, font, order.number);
  return doc.save();
}

function statusText(status: OrderDetail["status"]) {
  const labels: Record<OrderDetail["status"], string> = {
    nova: "Nova",
    potvrdjena: "Potvrđena",
    u_pripremi: "U pripremi",
    isporucena: "Isporučena",
    otkazana: "Otkazana",
  };
  return labels[status];
}

function drawRow(page: PDFPage, font: PDFFont, y: number, cells: string[], header: boolean) {
  const positions = [48, 300, 360, 405, 475];
  cells.forEach((cell, index) => {
    page.drawText(cell, {
      x: positions[index] ?? 48,
      y,
      size: header ? 9 : 10,
      font,
      color: rgb(0.28, 0.28, 0.32),
    });
  });
}

function drawAligned(page: PDFPage, font: PDFFont, text: string, x: number, y: number, width: number) {
  const size = 9;
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: x + Math.max(width - textWidth, 0),
    y,
    size,
    font,
    color: rgb(0.09, 0.09, 0.11),
  });
}

function drawFooter(page: PDFPage, font: PDFFont, number: string) {
  page.drawText(`Potvrda porudžbine ${number} · Dokument nije fiskalni račun ni faktura.`, {
    x: 48,
    y: 36,
    size: 8,
    font,
    color: rgb(0.45, 0.45, 0.48),
  });
}
