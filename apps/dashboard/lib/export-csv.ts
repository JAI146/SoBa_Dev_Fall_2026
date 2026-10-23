// Spreadsheet apps treat a cell starting with one of these as a formula, so an
// exported value could run code when the file is opened (CSV injection).
const FORMULA_START = /^[=+\-@\t]/;

export function escapeCsvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/** CSV text with a byte order mark so Excel reads it as UTF-8. */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][],
): void {
  const blob = new Blob([toCsv(headers, rows)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
