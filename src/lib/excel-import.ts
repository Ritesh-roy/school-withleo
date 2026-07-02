// Excel import helpers for Bulk Entry — parse, validate, template, export failed rows.
import * as XLSX from "xlsx";

export const EXCEL_COLUMNS = [
  "Book Type",
  "Category",
  "ISBN",
  "Title",
  "Author",
  "Publisher",
  "Language",
  "Edition",
  "Price",
  "MRP",
  "Pages",
  "Copies",
  "Location",
  "Rack",
] as const;

export type ExcelColumn = (typeof EXCEL_COLUMNS)[number];

export interface RawExcelRow {
  [key: string]: string | number | undefined;
}



export interface ParsedRow {
  index: number; // 1-based row number for user display
  raw: RawExcelRow;
  bookType: string;
  category: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  language: string;
  edition: string;
  price: number | null;
  mrp: number | null;
  pages: number | null;
  copies: number;
  location: string;
  rack: string;

  errors: string[];
  status: "valid" | "invalid" | "duplicate";
}

export function normalizeIsbn(v: string | number | null | undefined): string {
  return String(v ?? "").replace(/[-\s]/g, "").trim();
}

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string => String(v ?? "").trim();

export function downloadSampleTemplate() {
  const sample: Record<ExcelColumn, string | number>[] = [
    {
      "Book Type": "Reference",
      Category: "Science",
      ISBN: "9780132350884",
      Title: "Clean Code",
      Author: "Robert C. Martin",
      Publisher: "Prentice Hall",
      Language: "English",
      Edition: "1st",
      Price: 450,
      MRP: 500,
      Pages: 464,
      Copies: 3,
      Location: "Main Campus",
      Rack: "R1",
      Shelf: "S2",
    },
    {
      "Book Type": "Textbook",
      Category: "Mathematics",
      ISBN: "9780262033848",
      Title: "Introduction to Algorithms",
      Author: "Cormen",
      Publisher: "MIT Press",
      Language: "English",
      Edition: "3rd",
      Price: 800,
      MRP: 900,
      Pages: 1312,
      Copies: 5,
      Location: "Main Campus",
      Rack: "R2",
      Shelf: "S1",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample, { header: [...EXCEL_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Books");
  XLSX.writeFile(wb, "books-import-template.xlsx");
}

export async function parseExcelFile(file: File): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<RawExcelRow>(ws, { defval: "" });
  return rows.map((r, i) => validateRow(r, i + 2));
}

function validateRow(raw: RawExcelRow, rowNo: number): ParsedRow {
  const bookType = str(raw["Book Type"]);
  const category = str(raw["Category"]);
  const title = str(raw["Title"]);
  const isbn = normalizeIsbn(raw["ISBN"] as string);
  const copiesN = num(raw["Copies"]) ?? 1;
  const errors: string[] = [];
  if (!bookType) errors.push("Book Type required");
  if (!category) errors.push("Category required");
  if (!title) errors.push("Title required");
  if (isbn && !/^\d{10}(\d{3})?$/.test(isbn))
    errors.push("ISBN must be 10 or 13 digits");
  if (copiesN < 1) errors.push("Copies must be ≥ 1");
  const price = num(raw["Price"]);
  const mrp = num(raw["MRP"]);
  const pages = num(raw["Pages"]);
  if (price !== null && price < 0) errors.push("Price cannot be negative");
  if (mrp !== null && mrp < 0) errors.push("MRP cannot be negative");
  if (pages !== null && pages < 0) errors.push("Pages cannot be negative");
  return {
    index: rowNo,
    raw,
    bookType,
    category,
    isbn,
    title,
    author: str(raw["Author"]),
    publisher: str(raw["Publisher"]),
    language: str(raw["Language"]),
    edition: str(raw["Edition"]),
    price,
    mrp,
    pages,
    copies: Math.max(1, Math.floor(copiesN)),
    location: str(raw["Location"]),
    rack: str(raw["Rack"]),
    shelf: str(raw["Shelf"]),
    errors,
    status: errors.length ? "invalid" : "valid",
  };
}

export function markDuplicatesInFile(rows: ParsedRow[]): ParsedRow[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    if (!r.isbn || r.status === "invalid") return r;
    const first = seen.get(r.isbn);
    if (first !== undefined) {
      return {
        ...r,
        status: "duplicate",
        errors: [...r.errors, `Duplicate ISBN in file (also on row ${first})`],
      };
    }
    seen.set(r.isbn, r.index);
    return r;
  });
}

export function markDuplicatesInDb(
  rows: ParsedRow[],
  existingIsbns: Set<string>,
): ParsedRow[] {
  return rows.map((r) => {
    if (!r.isbn || r.status !== "valid") return r;
    if (existingIsbns.has(r.isbn)) {
      return {
        ...r,
        status: "duplicate",
        errors: [...r.errors, "ISBN already exists in database"],
      };
    }
    return r;
  });
}

export function exportFailedRows(rows: ParsedRow[]) {
  const failed = rows.filter((r) => r.status !== "valid");
  if (!failed.length) return;
  const data = failed.map((r) => ({
    Row: r.index,
    ...Object.fromEntries(EXCEL_COLUMNS.map((c) => [c, r.raw[c] ?? ""])),
    Error: r.errors.join("; "),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Failed Rows");
  XLSX.writeFile(wb, "books-import-failed.xlsx");
}
