import { UNIT_ALIASES } from "@/lib/constants";
import { partyForPib } from "@/lib/customers";
import type { CustomerInput, Unit } from "@/lib/data/types";
import { parseRsdToPara } from "@/lib/format";
import { fold } from "@/lib/text";
import { customerSchema } from "@/lib/validators";

export type CsvProductRow = {
  row: number;
  name: string;
  sku: string;
  category: string;
  unit: Unit;
  pricePara: number;
  description: string;
  minQuantity: number;
  active: boolean;
};

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === "," || char === ";") {
      const delimiter = detectDelimiter(source);
      if (char === delimiter) {
        row.push(cell.trim());
        cell = "";
      } else {
        cell += char;
      }
    } else if (char === "\n") {
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function detectDelimiter(source: string) {
  const header = source.split("\n")[0] ?? "";
  const commas = header.split(",").length;
  const semis = header.split(";").length;
  return semis > commas ? ";" : ",";
}

export function parseProductCsv(text: string): {
  rows: CsvProductRow[];
  errors: { row: number; message: string }[];
} {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], errors: [{ row: 1, message: "CSV fajl je prazan." }] };
  }

  const header = table[0].map((cell) => fold(cell).replace(/\s+/g, "_"));
  const indexOf = (...names: string[]) => header.findIndex((cell) => names.includes(cell));
  const nameIndex = indexOf("naziv", "name");
  const skuIndex = indexOf("sku", "sifra", "šifra");
  const categoryIndex = indexOf("kategorija", "category");
  const unitIndex = indexOf("jedinica", "unit");
  const priceIndex = indexOf("cena", "price");
  const descriptionIndex = indexOf("opis", "description");
  const minIndex = indexOf("min_kolicina", "min_kolicina", "minimalna_kolicina");
  const activeIndex = indexOf("aktivan", "active");

  if (nameIndex < 0 || priceIndex < 0 || unitIndex < 0) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: "Zaglavlje mora sadržati kolone naziv, jedinica i cena.",
        },
      ],
    };
  }

  const rows: CsvProductRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const body = table.slice(1, 501);

  body.forEach((cells, offset) => {
    const rowNumber = offset + 2;
    const name = cells[nameIndex]?.trim() ?? "";
    const unitRaw = fold(cells[unitIndex] ?? "");
    const unit = UNIT_ALIASES[unitRaw];
    const pricePara = parseRsdToPara(cells[priceIndex] ?? "");
    const minRaw = (cells[minIndex] ?? "").trim().replace(",", ".");
    const minQuantity = minRaw ? Number(minRaw) : 1;
    const activeRaw = fold(cells[activeIndex] ?? "da");
    const active = !["ne", "false", "0", "inactive"].includes(activeRaw);

    if (name.length < 2) {
      errors.push({ row: rowNumber, message: "Naziv proizvoda je obavezan." });
      return;
    }
    if (!unit) {
      errors.push({ row: rowNumber, message: "Jedinica mere nije prepoznata." });
      return;
    }
    if (pricePara === null || pricePara <= 0) {
      errors.push({ row: rowNumber, message: "Cena nije ispravna." });
      return;
    }
    if (!Number.isFinite(minQuantity) || minQuantity <= 0) {
      errors.push({ row: rowNumber, message: "Minimalna količina nije ispravna." });
      return;
    }

    rows.push({
      row: rowNumber,
      name,
      sku: skuIndex >= 0 ? (cells[skuIndex] ?? "").trim() : "",
      category: categoryIndex >= 0 ? (cells[categoryIndex] ?? "").trim() : "",
      unit,
      pricePara,
      description: descriptionIndex >= 0 ? (cells[descriptionIndex] ?? "").trim() : "",
      minQuantity,
      active,
    });
  });

  if (table.length > 501) {
    errors.push({ row: 502, message: "Uvezeno je samo prvih 500 redova." });
  }

  return { rows, errors };
}

export type CsvCustomerRow = CustomerInput & { row: number };

export function parseCustomerCsv(text: string): {
  rows: CsvCustomerRow[];
  errors: { row: number; message: string }[];
} {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], errors: [{ row: 1, message: "CSV fajl je prazan." }] };
  }

  const header = table[0].map((cell) => fold(cell).replace(/\s+/g, "_"));
  const indexOf = (...names: string[]) => header.findIndex((cell) => names.includes(cell));
  const nameIndex = indexOf("naziv", "firma", "ime_i_prezime");
  const contactIndex = indexOf("kontakt", "kontakt_osoba");
  const emailIndex = indexOf("email", "e-mail");
  const phoneIndex = indexOf("telefon", "phone", "tel");
  const pibIndex = indexOf("pib");
  const addressIndex = indexOf("adresa", "address");
  const cityIndex = indexOf("grad", "city");
  const notesIndex = indexOf("napomena", "notes", "interna_napomena");
  const partyIndex = indexOf("vrsta", "party", "tip");
  const daysIndex = indexOf("odlozeno_placanje", "rok", "rok_placanja", "dana");
  const codeIndex = indexOf("sifra", "sifra_kupca", "code");

  if (nameIndex < 0 || emailIndex < 0 || phoneIndex < 0) {
    return {
      rows: [],
      errors: [{ row: 1, message: "Zaglavlje mora sadržati kolone naziv, email i telefon." }],
    };
  }

  const rows: CsvCustomerRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const seenEmails = new Set<string>();
  const seenCodes = new Set<string>();
  const cell = (cells: string[], index: number) => (index >= 0 ? (cells[index] ?? "").trim() : "");

  table.slice(1, 501).forEach((cells, offset) => {
    const rowNumber = offset + 2;
    const businessName = cell(cells, nameIndex);
    const pib = cell(cells, pibIndex);
    const party = customerParty(cell(cells, partyIndex), pib);
    if (!party) {
      errors.push({ row: rowNumber, message: "Vrsta kupca nije prepoznata. Unesite Pravno lice ili Fizičko lice." });
      return;
    }
    const parsed = customerSchema.safeParse({
      businessName,
      contactName: cell(cells, contactIndex) || businessName,
      email: cell(cells, emailIndex),
      phone: cell(cells, phoneIndex),
      pib,
      address: cell(cells, addressIndex),
      city: cell(cells, cityIndex),
      notes: cell(cells, notesIndex),
      party,
      paymentTermDays: party === "pravna" ? cell(cells, daysIndex) || "15" : "0",
      code: cell(cells, codeIndex),
    });
    if (!parsed.success) {
      errors.push({ row: rowNumber, message: parsed.error.issues[0]?.message ?? "Red nije ispravan." });
      return;
    }
    const email = parsed.data.email.toLowerCase();
    if (seenEmails.has(email)) {
      errors.push({ row: rowNumber, message: "Email se ponavlja u fajlu." });
      return;
    }
    if (parsed.data.code && seenCodes.has(parsed.data.code)) {
      errors.push({ row: rowNumber, message: "Šifra se ponavlja u fajlu." });
      return;
    }
    seenEmails.add(email);
    if (parsed.data.code) seenCodes.add(parsed.data.code);
    rows.push({ row: rowNumber, ...parsed.data });
  });

  if (table.length > 501) {
    errors.push({ row: 502, message: "Uvezeno je samo prvih 500 redova." });
  }

  return { rows, errors };
}

function customerParty(raw: string, pib: string) {
  const value = fold(raw).replace(/\s+/g, "_");
  if (!value) return partyForPib(pib);
  if (["pravna", "pravno", "pravno_lice", "firma"].includes(value)) return "pravna" as const;
  if (["fizicka", "fizicko", "fizicko_lice", "osoba"].includes(value)) return "fizicka" as const;
  return null;
}
