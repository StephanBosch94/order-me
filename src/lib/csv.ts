import { UNIT_ALIASES } from "@/lib/constants";
import { parseRsdToPara } from "@/lib/format";
import { fold } from "@/lib/text";
import type { Unit } from "@/lib/data/types";

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
