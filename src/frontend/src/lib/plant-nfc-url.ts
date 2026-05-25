/** NFC / QR plant tag URL — matches on-canister external_url pattern. */
export const PLANT_NFC_BASE = "https://www.icspicy.app/plant";

export function plantNfcUrl(plantId: bigint | number | string): string {
  return `${PLANT_NFC_BASE}/${plantId.toString()}`;
}

export function plantTagLinksCsv(
  rows: ReadonlyArray<{ plantId: bigint; variety?: string }>,
): string {
  const header = "plantId,url,variety";
  const lines = rows.map((r) => {
    const url = plantNfcUrl(r.plantId);
    const variety = (r.variety ?? "").replace(/"/g, '""');
    return `${r.plantId.toString()},${url},"${variety}"`;
  });
  return [header, ...lines].join("\n");
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
