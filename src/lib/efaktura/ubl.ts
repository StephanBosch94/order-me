import type { Unit } from "@/lib/data/types";

/**
 * Sales invoice UBL for SEF public API
 * POST /api/publicApi/sales-invoice/ubl
 *
 * Assumptions, from the Ministry specification (srbdt:2022) and API 3.14:
 * - The printed faktura says PDV is not calculated, so lines use VAT category O
 *   and InvoicePeriod/DescriptionCode is omitted (that code is only for S10/S20).
 * - Datum prometa is ActualDeliveryDate and matches the issue date on the faktura.
 * - The recipient is not a budget user: no JBKJS, and the caller sends sendToCir=No.
 * - Piece, kilogram, litre, package and box use UN/ECE codes. H87 and KGM are on
 *   the SEF unit list; LTR, XPK and XBX are the same code list.
 */
export const SEF_CUSTOMIZATION_ID = "urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2022";

const UNIT_CODE: Record<Unit, string> = {
  komad: "H87",
  kilogram: "KGM",
  litar: "LTR",
  paket: "XPK",
  kutija: "XBX",
};

export type SefParty = {
  name: string;
  pib: string;
  mb: string;
  address: string;
  city: string;
  postalCode: string;
  email: string;
  phone: string;
};

export type SefInvoiceLine = {
  name: string;
  sku: string;
  unit: Unit;
  quantity: number;
  unitPricePara: number;
  lineTotalPara: number;
};

export type SefInvoiceDraft = {
  number: string;
  issueDate: string;
  dueDate: string;
  deliveryDate: string;
  supplier: SefParty;
  customer: SefParty;
  lines: SefInvoiceLine[];
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function amount(para: number) {
  return (para / 100).toFixed(2);
}

function quantityText(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

function digits(value: string, length: number) {
  const clean = value.replace(/\D/g, "");
  return clean.length === length ? clean : "";
}

function partyXml(party: SefParty, vatStatus: "VAT" | "NO-VAT" | null) {
  const pib = digits(party.pib, 9);
  const mb = digits(party.mb, 8);
  const postal = digits(party.postalCode, 5);
  const contact = [party.email.trim(), party.phone.trim()].some(Boolean);
  return [
    `<cac:Party>`,
    `<cbc:EndpointID schemeID="9948">${escapeXml(pib)}</cbc:EndpointID>`,
    `<cac:PartyName><cbc:Name>${escapeXml(party.name.trim())}</cbc:Name></cac:PartyName>`,
    `<cac:PostalAddress>`,
    party.address.trim() ? `<cbc:StreetName>${escapeXml(party.address.trim())}</cbc:StreetName>` : "",
    `<cbc:CityName>${escapeXml(party.city.trim())}</cbc:CityName>`,
    postal ? `<cbc:PostalZone>${postal}</cbc:PostalZone>` : "",
    `<cac:Country><cbc:IdentificationCode>RS</cbc:IdentificationCode></cac:Country>`,
    `</cac:PostalAddress>`,
    `<cac:PartyTaxScheme>`,
    `<cbc:CompanyID>RS${escapeXml(pib)}</cbc:CompanyID>`,
    `<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>`,
    `</cac:PartyTaxScheme>`,
    vatStatus
      ? `<cac:PartyTaxScheme><cbc:CompanyID>${vatStatus}</cbc:CompanyID><cac:TaxScheme><cbc:ID>RS-VAT-STATUS</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`
      : "",
    `<cac:PartyLegalEntity>`,
    `<cbc:RegistrationName>${escapeXml(party.name.trim())}</cbc:RegistrationName>`,
    mb ? `<cbc:CompanyID>${mb}</cbc:CompanyID>` : "",
    `</cac:PartyLegalEntity>`,
    contact
      ? `<cac:Contact>${party.phone.trim() ? `<cbc:Telephone>${escapeXml(party.phone.trim())}</cbc:Telephone>` : ""}${party.email.trim() ? `<cbc:ElectronicMail>${escapeXml(party.email.trim())}</cbc:ElectronicMail>` : ""}</cac:Contact>`
      : "",
    `</cac:Party>`,
  ]
    .filter(Boolean)
    .join("");
}

function taxCategory() {
  return `<cac:TaxCategory><cbc:ID>O</cbc:ID><cbc:Percent>0</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>`;
}

export function buildSalesInvoiceUbl(draft: SefInvoiceDraft) {
  const totalPara = draft.lines.reduce((sum, line) => sum + line.lineTotalPara, 0);
  const total = amount(totalPara);
  const lines = draft.lines
    .map((line, index) => {
      const sku = line.sku.trim();
      return [
        `<cac:InvoiceLine>`,
        `<cbc:ID>${index + 1}</cbc:ID>`,
        `<cbc:InvoicedQuantity unitCode="${UNIT_CODE[line.unit]}">${quantityText(line.quantity)}</cbc:InvoicedQuantity>`,
        `<cbc:LineExtensionAmount currencyID="RSD">${amount(line.lineTotalPara)}</cbc:LineExtensionAmount>`,
        `<cac:Item>`,
        `<cbc:Name>${escapeXml(line.name.trim() || "Stavka")}</cbc:Name>`,
        sku ? `<cac:SellersItemIdentification><cbc:ID>${escapeXml(sku)}</cbc:ID></cac:SellersItemIdentification>` : "",
        `<cac:ClassifiedTaxCategory><cbc:ID>O</cbc:ID><cbc:Percent>0</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory>`,
        `</cac:Item>`,
        `<cac:Price><cbc:PriceAmount currencyID="RSD">${amount(line.unitPricePara)}</cbc:PriceAmount></cac:Price>`,
        `</cac:InvoiceLine>`,
      ]
        .filter(Boolean)
        .join("");
    })
    .join("");

  return [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">`,
    `<cbc:CustomizationID>${SEF_CUSTOMIZATION_ID}</cbc:CustomizationID>`,
    `<cbc:ID>${escapeXml(draft.number.trim())}</cbc:ID>`,
    `<cbc:IssueDate>${draft.issueDate}</cbc:IssueDate>`,
    `<cbc:DueDate>${draft.dueDate}</cbc:DueDate>`,
    `<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>`,
    `<cbc:Note>PDV nije obračunat.</cbc:Note>`,
    `<cbc:DocumentCurrencyCode>RSD</cbc:DocumentCurrencyCode>`,
    `<cac:AccountingSupplierParty>${partyXml(draft.supplier, "NO-VAT")}</cac:AccountingSupplierParty>`,
    `<cac:AccountingCustomerParty>${partyXml(draft.customer, null)}</cac:AccountingCustomerParty>`,
    `<cac:Delivery><cbc:ActualDeliveryDate>${draft.deliveryDate}</cbc:ActualDeliveryDate></cac:Delivery>`,
    `<cac:PaymentMeans><cbc:PaymentMeansCode>30</cbc:PaymentMeansCode></cac:PaymentMeans>`,
    `<cac:TaxTotal><cbc:TaxAmount currencyID="RSD">0.00</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="RSD">${total}</cbc:TaxableAmount><cbc:TaxAmount currencyID="RSD">0.00</cbc:TaxAmount>${taxCategory()}</cac:TaxSubtotal></cac:TaxTotal>`,
    `<cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="RSD">${total}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="RSD">${total}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="RSD">${total}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="RSD">${total}</cbc:PayableAmount></cac:LegalMonetaryTotal>`,
    lines,
    `</Invoice>`,
  ].join("");
}
