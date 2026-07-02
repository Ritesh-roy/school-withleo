import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn {
  header: string;
  key: string;
}

export function exportToExcel(
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
) {
  const data = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c) => (obj[c.header] = row[c.key] ?? ""));
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCsv(
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
) {
  const data = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c) => (obj[c.header] = row[c.key] ?? ""));
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  // Prepend UTF-8 BOM so Excel/other spreadsheets render ₹ and other
  // multibyte characters correctly instead of mojibake like "â‚¹".
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// jsPDF's built-in Helvetica font lacks the Rupee glyph (₹), so it renders
// as a blank / wrong character in exported PDFs. Swap it for "Rs." which
// every standard PDF font supports. Other non-ASCII currencies fall back
// the same way.
function pdfSafe(v: unknown): string {
  return String(v ?? "")
    .replace(/₹/g, "Rs. ")
    .replace(/[\u20A8]/g, "Rs. ");
}

export function exportToPdf(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(pdfSafe(title), 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
  autoTable(doc, {
    startY: 26,
    head: [columns.map((c) => pdfSafe(c.header))],
    body: rows.map((row) => columns.map((c) => pdfSafe(row[c.key]))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [49, 89, 184] },
  });
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}


export function printRows(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
) {
  const win = window.open("", "_blank");
  if (!win) return;
  const head = columns.map((c) => `<th>${c.header}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${row[c.key] ?? ""}</td>`).join("")}</tr>`,
    )
    .join("");
  win.document.write(`
    <html><head><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}
      h1{font-size:18px}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
      th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left}
      th{background:#3159b8;color:#fff}
      tr:nth-child(even){background:#f3f4f6}
    </style></head>
    <body><h1>${title}</h1><p>${new Date().toLocaleString()}</p>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}