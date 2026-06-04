export function escapeCsvCell(value: unknown): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportRowsToCsv(
  rows: Record<string, unknown>[],
  filename: string,
): void {
  if (rows.length === 0) {
    const blob = new Blob(["(no data)\n"], { type: "text/csv" });
    triggerDownload(blob, filename);
    return;
  }
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function datedCsvFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}
