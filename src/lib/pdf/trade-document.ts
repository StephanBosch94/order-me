import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import { paymentLabel, unitLabel } from "@/lib/constants";
import { drawIpsPayment, IPS_BLOCK_HEIGHT } from "@/lib/pdf/ips-qr";
import type { TradeDocumentKind } from "@/lib/customers";
import type { OrderDetail, PublicSupplier, Unit } from "@/lib/data/types";
import { addCalendarDays, formatDate, formatQuantity, formatRsd } from "@/lib/format";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 40;
const RIGHT = 555;
const INK = rgb(0.09, 0.11, 0.14);
const MUTED = rgb(0.38, 0.4, 0.44);
const LINE = rgb(0.8, 0.82, 0.85);
const BAND = rgb(0.95, 0.96, 0.97);

const UNIT_SHORT: Record<Unit, string> = {
  komad: "kom",
  paket: "pak",
  kutija: "kut",
  kilogram: "kg",
  litar: "l",
};

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
    if (font.widthOfTextAtSize(next, size) <= width) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function hexColor(value: string | null) {
  const match = /^#?([0-9a-f]{6})$/i.exec(value ?? "");
  if (!match) return rgb(0.12, 0.14, 0.18);
  const n = Number.parseInt(match[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function loadLogo(doc: PDFDocument, logoUrl: string | null) {
  if (!logoUrl?.startsWith("/")) return null;
  const file = path.join(process.cwd(), "public", logoUrl);
  const candidates = logoUrl.endsWith(".svg") ? [file.replace(/\.svg$/, ".png"), file] : [file];
  for (const candidate of candidates) {
    try {
      const bytes = await readFile(candidate);
      if (candidate.endsWith(".png") || bytes[0] === 0x89) return doc.embedPng(bytes);
      if (/\.jpe?g$/i.test(candidate)) return doc.embedJpg(bytes);
    } catch {
      continue;
    }
  }
  return null;
}

function drawLogoMark(
  page: PDFPage,
  fontBold: PDFFont,
  supplier: PublicSupplier,
  image: PDFImage | null,
  x: number,
  top: number,
  size: number,
) {
  if (image) {
    const scale = Math.min(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, { x, y: top - height, width, height });
    return;
  }
  const color = hexColor(supplier.brandColor);
  page.drawRectangle({ x, y: top - size, width: size, height: size, color });
  const letter = supplier.name.trim().charAt(0).toUpperCase() || "P";
  const letterWidth = fontBold.widthOfTextAtSize(letter, 18);
  page.drawText(letter, {
    x: x + (size - letterWidth) / 2,
    y: top - size / 2 - 6,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
}

function drawRight(page: PDFPage, font: PDFFont, text: string, y: number, size: number, color = INK) {
  page.drawText(text, { x: RIGHT - font.widthOfTextAtSize(text, size), y, size, font, color });
}

export async function buildTradeDocumentPdf(
  order: OrderDetail,
  supplier: PublicSupplier,
  options: { kind: TradeDocumentKind; paymentTermDays: number; customerCode?: string },
) {
  const { regularBytes: regular, boldBytes: bold } = await loadFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(regular, { subset: true });
  const fontBold = await doc.embedFont(bold, { subset: true });
  const logo = await loadLogo(doc, supplier.logoUrl);
  const brand = hexColor(supplier.brandColor);
  const kind = options.kind;
  const days = kind === "faktura" ? options.paymentTermDays : 0;
  const issued = formatDate(order.createdAt);
  const due = formatDate(addCalendarDays(order.createdAt, days));
  const buyer = order.customerSnapshot;
  const title = kind === "faktura" ? "FAKTURA" : "NALOG";

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 790;

  const footer = (target: PDFPage) => {
    const note = kind === "faktura" ? "Faktura nije fiskalni račun." : "Nalog za isporuku nije faktura ni fiskalni račun.";
    target.drawText(`${title} ${order.number} · ${note}`, { x: LEFT, y: 28, size: 8, font, color: MUTED });
  };

  const nextPage = () => {
    footer(page);
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = 790;
  };

  const ensure = (height: number) => {
    if (y - height < 64) nextPage();
  };

  drawLogoMark(page, fontBold, supplier, logo, LEFT, y + 4, 46);
  const nameX = LEFT + 56;
  const nameLines = wrap(supplier.name, fontBold, 13, 250);
  nameLines.forEach((line, index) => {
    page.drawText(line, { x: nameX, y: y - index * 16, size: 13, font: fontBold, color: INK });
  });
  page.drawText(title, { x: RIGHT - fontBold.widthOfTextAtSize(title, 16), y, size: 16, font: fontBold, color: INK });
  if (kind === "nalog") {
    drawRight(page, font, "za isporuku robe", y - 14, 9, MUTED);
  }

  const issuer = [
    [supplier.address, supplier.city].filter(Boolean).join(", "),
    supplier.phone,
    supplier.email,
    supplier.pib ? `PIB: ${supplier.pib}` : "",
    supplier.mb ? `Matični broj: ${supplier.mb}` : "",
  ]
    .filter(Boolean)
    .flatMap((line) => wrap(line, font, 9, 250));
  issuer.forEach((line, index) => {
    page.drawText(line, { x: nameX, y: y - nameLines.length * 16 - 4 - index * 12, size: 9, font, color: INK });
  });

  const meta = [
    `Broj: ${order.number}`,
    `Datum izdavanja: ${issued}`,
    `Datum prometa: ${issued}`,
    supplier.city ? `Mesto izdavanja: ${supplier.city}` : "",
    kind === "faktura" ? `Rok plaćanja: ${days === 0 ? "odmah" : `${days} dana`}` : "",
    kind === "faktura" ? `Datum valute: ${due}` : "",
  ].filter(Boolean);
  meta.forEach((line, index) => drawRight(page, font, line, y - 22 - index * 12, 9));

  const headerHeight = Math.max(nameLines.length * 16 + 4 + issuer.length * 12, 22 + meta.length * 12, 50);
  y -= headerHeight + 16;
  page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 1.5, color: brand });
  y -= 22;

  page.drawText(kind === "faktura" ? "Kupac" : "Primalac", { x: LEFT, y, size: 10, font: fontBold, color: INK });
  y -= 16;
  const buyerCode = options.customerCode || buyer.code;
  const buyerLines = [
    buyerCode ? `Šifra: ${buyerCode}` : "",
    buyer.businessName,
    buyer.contactName && buyer.contactName !== buyer.businessName ? buyer.contactName : "",
    [buyer.address, buyer.postalCode, buyer.city].filter(Boolean).join(", "),
    buyer.phone,
    buyer.email,
    buyer.pib ? `PIB: ${buyer.pib}` : "",
    buyer.mb ? `Matični broj: ${buyer.mb}` : "",
  ].filter(Boolean);
  for (const line of buyerLines) {
    ensure(13);
    page.drawText(line, { x: LEFT, y, size: 10, font, color: INK });
    y -= 13;
  }
  y -= 14;

  const columns = [
    { label: "Rb.", x: LEFT, width: 22, align: "left" as const },
    { label: "Naziv", x: LEFT + 24, width: 210, align: "left" as const },
    { label: "JM", x: 292, width: 36, align: "left" as const },
    { label: "Količina", x: 330, width: 58, align: "right" as const },
    { label: "Cena", x: 394, width: 72, align: "right" as const },
    { label: "Iznos", x: 470, width: 85, align: "right" as const },
  ];

  const drawHeader = () => {
    ensure(22);
    page.drawRectangle({ x: LEFT, y: y - 6, width: RIGHT - LEFT, height: 18, color: BAND });
    for (const column of columns) {
      const size = 8;
      const textWidth = fontBold.widthOfTextAtSize(column.label, size);
      const x = column.align === "right" ? column.x + column.width - textWidth : column.x;
      page.drawText(column.label, { x, y, size, font: fontBold, color: MUTED });
    }
    y -= 20;
  };
  drawHeader();

  order.items.forEach((item, index) => {
    const name = wrap(item.name, font, 9, 210);
    const rowHeight = Math.max(name.length, 1) * 12 + 6;
    if (y - rowHeight < 64) {
      nextPage();
      drawHeader();
    }
    page.drawText(String(index + 1), { x: LEFT, y, size: 9, font, color: INK });
    name.forEach((line, lineIndex) => {
      page.drawText(line, { x: LEFT + 24, y: y - lineIndex * 12, size: 9, font, color: INK });
    });
    const unit = UNIT_SHORT[item.unit] ?? unitLabel(item.unit);
    const cells = [
      { text: unit, x: 292, width: 36 },
      { text: formatQuantity(item.quantity), x: 330, width: 58 },
      { text: formatRsd(item.unitPricePara), x: 394, width: 72 },
      { text: formatRsd(item.lineTotalPara), x: 470, width: 85 },
    ];
    for (const cell of cells) {
      const textWidth = font.widthOfTextAtSize(cell.text, 9);
      page.drawText(cell.text, { x: cell.x + cell.width - textWidth, y, size: 9, font, color: INK });
    }
    y -= rowHeight;
  });

  ensure(78);
  y -= 4;
  page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 0.8, color: LINE });
  y -= 18;
  const totalLabel = kind === "faktura" ? "Ukupno za uplatu" : "Ukupno";
  page.drawText(totalLabel, { x: 394, y, size: 10, font: fontBold, color: INK });
  const total = formatRsd(order.totalPara);
  page.drawText(total, {
    x: RIGHT - fontBold.widthOfTextAtSize(total, 11),
    y,
    size: 11,
    font: fontBold,
    color: INK,
  });
  y -= 16;

  const payment =
    kind === "nalog"
      ? order.paymentMethod
        ? paymentLabel(order.paymentMethod)
        : "Plaćanje pri isporuci"
      : order.paymentMethod && order.paymentMethod !== "racun"
        ? paymentLabel(order.paymentMethod)
        : "Virman";
  const closing = [
    `Način plaćanja: ${payment}`,
    kind === "faktura" ? "PDV nije obračunat." : "",
    kind === "faktura" ? "Ovaj dokument nije fiskalni račun." : "Ovo je nalog za isporuku. Nije faktura ni fiskalni račun.",
  ].filter(Boolean);
  for (const line of closing) {
    ensure(13);
    page.drawText(line, { x: LEFT, y, size: 9, font, color: MUTED });
    y -= 13;
  }

  if (supplier.ipsAccount && (kind === "faktura" || order.paymentMethod === "ips")) {
    y -= 8;
    ensure(IPS_BLOCK_HEIGHT);
    const drawn = await drawIpsPayment(doc, page, font, fontBold, LEFT, y, {
      account: supplier.ipsAccount,
      recipient: supplier.name,
      amountPara: order.totalPara,
      orderNumber: order.number,
    });
    if (drawn) y -= IPS_BLOCK_HEIGHT;
  }

  if (order.notes) {
    y -= 8;
    ensure(28);
    page.drawText("Napomena", { x: LEFT, y, size: 9, font: fontBold, color: INK });
    y -= 13;
    for (const line of wrap(order.notes, font, 9, RIGHT - LEFT)) {
      ensure(12);
      page.drawText(line, { x: LEFT, y, size: 9, font, color: INK });
      y -= 12;
    }
  }

  y -= 28;
  ensure(48);
  const signLeft = kind === "faktura" ? "Fakturisao" : "Izdao";
  const signRight = kind === "faktura" ? "Primio" : "Robu primio";
  page.drawText(signLeft, { x: LEFT, y, size: 9, font, color: MUTED });
  page.drawText(signRight, { x: 340, y, size: 9, font, color: MUTED });
  y -= 22;
  page.drawLine({ start: { x: LEFT, y }, end: { x: 220, y }, thickness: 0.6, color: LINE });
  page.drawLine({ start: { x: 340, y }, end: { x: RIGHT, y }, thickness: 0.6, color: LINE });

  footer(page);
  return doc.save();
}
