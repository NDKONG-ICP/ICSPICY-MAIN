// NIMS utility helpers and shared types
import type { ContainerSize, PlantPublic } from "../backend";
import { PlantStage } from "../backend";

export function formatDate(ts: bigint | undefined | null): string {
  if (!ts) return "—";
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateInput(ts: bigint | undefined | null): string {
  if (!ts) return "";
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  return d.toISOString().split("T")[0];
}

export function dateInputToTimestamp(val: string): bigint {
  const ms = new Date(val).getTime();
  return BigInt(ms * 1_000_000);
}

export function stageName(stage: PlantStage): string {
  switch (stage) {
    case PlantStage.Seed:
      return "Seed";
    case PlantStage.Seedling:
      return "Seedling";
    case PlantStage.Mature:
      return "Mature";
    default:
      return "Unknown";
  }
}

export function containerSizeLabel(cs: ContainerSize | undefined): string {
  if (!cs) return "—";
  switch (cs.__kind__) {
    // New expanded variants
    case "Cell72":
      return "72 Cell Tray";
    case "Cell128":
      return "128 Cell Tray";
    case "Pot4Inch":
      return "4 Inch Pot";
    case "Pot6Inch":
      return "6 Inch Pot";
    case "Gal1New":
      return "1 Gallon";
    case "Gal3New":
      return "3 Gallon";
    case "Gal5Bucket":
      return "5 Gallon (Bucket)";
    case "Gal5GrowBag":
      return "5 Gallon (Grow Bag)";
    case "Gal7Pot":
      return "7 Gallon Pot";
    case "Gal7GrowBag":
      return "7 Gallon Grow Bag";
    case "Gal10GrowBag":
      return "10 Gallon Grow Bag";
    case "Gal15GrowBag":
      return "15 Gallon Grow Bag";
    case "InGround":
      return "In Ground";
    case "Other":
      return cs.Other ? `Other: ${cs.Other}` : "Other (specify)";
    // Legacy aliases kept for backward compatibility
    case "Oz16":
      return "16 oz";
    case "Gal1":
      return "1 Gallon";
    case "Gal3":
      return "3 Gallon";
    case "Gal5":
      return "5 Gallon";
    default:
      return "—";
  }
}

// All 14 container size options for dropdowns
export const CONTAINER_SIZE_OPTIONS = [
  { value: "cell72", label: "72 Cell Tray" },
  { value: "cell128", label: "128 Cell Tray" },
  { value: "pot4inch", label: "4 Inch Pot" },
  { value: "pot6inch", label: "6 Inch Pot" },
  { value: "1gal", label: "1 Gallon" },
  { value: "3gal", label: "3 Gallon" },
  { value: "5galbucket", label: "5 Gallon (Bucket)" },
  { value: "5galgrowbag", label: "5 Gallon (Grow Bag)" },
  { value: "7galpot", label: "7 Gallon Pot" },
  { value: "7galgrowbag", label: "7 Gallon Grow Bag" },
  { value: "10galgrowbag", label: "10 Gallon Grow Bag" },
  { value: "15galgrowbag", label: "15 Gallon Grow Bag" },
  { value: "inground", label: "In Ground" },
  { value: "other", label: "Other (specify)" },
] as const;

export type ContainerSizeOption =
  (typeof CONTAINER_SIZE_OPTIONS)[number]["value"];

export function buildContainerSize(
  option: string,
  otherText: string,
): ContainerSize {
  switch (option) {
    case "cell72":
      return { __kind__: "Cell72", Cell72: null };
    case "cell128":
      return { __kind__: "Cell128", Cell128: null };
    case "pot4inch":
      return { __kind__: "Pot4Inch", Pot4Inch: null };
    case "pot6inch":
      return { __kind__: "Pot6Inch", Pot6Inch: null };
    case "1gal":
      return { __kind__: "Gal1New", Gal1New: null };
    case "3gal":
      return { __kind__: "Gal3New", Gal3New: null };
    case "5galbucket":
      return { __kind__: "Gal5Bucket", Gal5Bucket: null };
    case "5galgrowbag":
      return { __kind__: "Gal5GrowBag", Gal5GrowBag: null };
    case "7galpot":
      return { __kind__: "Gal7Pot", Gal7Pot: null };
    case "7galgrowbag":
      return { __kind__: "Gal7GrowBag", Gal7GrowBag: null };
    case "10galgrowbag":
      return { __kind__: "Gal10GrowBag", Gal10GrowBag: null };
    case "15galgrowbag":
      return { __kind__: "Gal15GrowBag", Gal15GrowBag: null };
    case "inground":
      return { __kind__: "InGround", InGround: null };
    case "other":
      return { __kind__: "Other", Other: otherText };
    // Legacy aliases
    case "16oz":
      return { __kind__: "Oz16", Oz16: null };
    default:
      return { __kind__: "Gal1New", Gal1New: null };
  }
}

export function getCellClass(plant: PlantPublic | undefined): string {
  if (!plant) return "tray-cell tray-cell-available cursor-pointer";
  if (plant.is_cooked)
    return "tray-cell cursor-pointer border-red-900 bg-black";
  if (plant.is_transplanted)
    return "tray-cell cursor-pointer bg-muted/20 border-muted/40 opacity-60";
  switch (plant.stage) {
    case PlantStage.Seed:
      return "tray-cell cursor-pointer bg-emerald-950/60 border-emerald-700/60";
    case PlantStage.Seedling:
      return "tray-cell cursor-pointer bg-cyan-950/60 border-cyan-600/50";
    case PlantStage.Mature:
      return "tray-cell cursor-pointer bg-primary/20 border-primary/50";
    default:
      return "tray-cell tray-cell-available cursor-pointer";
  }
}

// Client-side image compression using canvas API
export async function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.7,
  maxBytes = 200_000,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      let q = quality;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compression failed"));
              return;
            }
            if (blob.size <= maxBytes || q <= 0.3) {
              resolve(blob);
              return;
            }
            q -= 0.1;
            tryCompress();
          },
          "image/jpeg",
          q,
        );
      };
      tryCompress();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

// ─── Printable Tray Map ───────────────────────────────────────────────────────

export interface PrintPlant {
  cellIndex: number;
  commonName: string;
  stage: string;
  isCooked: boolean;
  isTransplanted: boolean;
}

export function printTrayMap(trayName: string, plants: PrintPlant[]): void {
  const plantMap = new Map<number, PrintPlant>();
  for (const p of plants) plantMap.set(p.cellIndex, p);

  const COLS = 12;
  const ROWS = 6;
  const TOTAL = COLS * ROWS;
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const cells = Array.from({ length: TOTAL }, (_, i) => {
    const p = plantMap.get(i);
    if (!p) {
      return `<div class="cell empty"><span class="cellnum">${i + 1}</span></div>`;
    }
    let statusClass = "active";
    let statusMark = "";
    let stageBadge = `<span class="stage">${p.stage}</span>`;
    if (p.isCooked) {
      statusClass = "cooked";
      statusMark = `<span class="mark">✕ Cooked</span>`;
      stageBadge = "";
    } else if (p.isTransplanted) {
      statusClass = "transplanted";
      statusMark = `<span class="mark">✓ Moved</span>`;
    }
    return `<div class="cell ${statusClass}">
      <span class="cellnum">${i + 1}</span>
      <span class="name">${p.commonName || "—"}</span>
      ${stageBadge}
      ${statusMark}
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>IC SPICY — Tray Map: ${trayName}</title>
<style>
  @media print { @page { margin: 0.5in; size: landscape; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; }
  .print-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a6b2b; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { display: flex; flex-direction: column; }
  .brand-name { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #1a6b2b; }
  .brand-sub { font-size: 12px; color: #555; margin-top: 2px; }
  .tray-info { text-align: right; }
  .tray-name { font-size: 18px; font-weight: 700; color: #111; }
  .tray-date { font-size: 11px; color: #777; margin-top: 3px; }
  /* Grid */
  .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; margin-bottom: 16px; }
  .cell { border: 1.5px solid #ccc; border-radius: 4px; padding: 4px 3px; min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; font-size: 9px; }
  .cell.empty { border-style: dashed; border-color: #ddd; background: #fafafa; }
  .cell.active { border-color: #2d8a45; background: #f0fdf4; }
  .cell.transplanted { border-color: #aaa; background: #f5f5f5; opacity: 0.7; }
  .cell.cooked { border-color: #c0392b; background: #fff5f5; }
  .cellnum { position: absolute; top: 2px; left: 3px; font-size: 8px; color: #aaa; font-variant-numeric: tabular-nums; }
  .name { font-size: 9.5px; font-weight: 700; color: #111; line-height: 1.2; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .stage { font-size: 8px; color: #2d8a45; background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 3px; padding: 1px 3px; margin-top: 2px; }
  .mark { font-size: 8px; color: inherit; margin-top: 2px; font-weight: 700; }
  .cell.cooked .mark { color: #c0392b; }
  .cell.transplanted .mark { color: #888; }
  /* Legend */
  .legend { display: flex; gap: 18px; flex-wrap: wrap; font-size: 11px; color: #444; border-top: 1px solid #e5e5e5; padding-top: 12px; }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .legend-dot { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid; flex-shrink: 0; }
  /* Footer */
  .footer { margin-top: 18px; font-size: 10px; color: #888; border-top: 1px solid #e5e5e5; padding-top: 10px; display: flex; justify-content: space-between; }
  .footer a { color: #1a6b2b; text-decoration: none; }
  @media print { .no-print { display: none !important; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  /* Print button */
  .print-btn { background: #1a6b2b; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: 700; border-radius: 6px; cursor: pointer; margin-bottom: 20px; }
  .print-btn:hover { background: #155123; }
</style>
</head>
<body>
<div class="print-page">
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print Tray Map</button>
  <div class="header">
    <div class="brand">
      <span class="brand-name">🌶️ IC SPICY Nursery</span>
      <span class="brand-sub">Port Charlotte, FL · FDACS Registered Nursery</span>
    </div>
    <div class="tray-info">
      <div class="tray-name">${trayName}</div>
      <div class="tray-date">Printed: ${dateStr}</div>
    </div>
  </div>
  <div class="grid">${cells}</div>
  <div class="legend">
    <span class="legend-item"><span class="legend-dot" style="background:#f0fdf4;border-color:#2d8a45"></span>Active</span>
    <span class="legend-item"><span class="legend-dot" style="background:#f5f5f5;border-color:#aaa;opacity:0.7"></span>Transplanted</span>
    <span class="legend-item"><span class="legend-dot" style="background:#fff5f5;border-color:#c0392b"></span>Cooked</span>
    <span class="legend-item"><span class="legend-dot" style="background:#fafafa;border-color:#ddd;border-style:dashed"></span>Empty</span>
  </div>
  <div class="footer">
    <span>IC SPICY Nursery Management System · <a href="https://caffeine.ai" target="_blank">caffeine.ai</a></span>
    <span>Generated ${dateStr}</span>
  </div>
</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ─── Garden-Wide Print ────────────────────────────────────────────────────────

interface GardenTray {
  name: string;
  plants: PrintPlant[];
}

export function printGardenLayout(
  trays: GardenTray[],
  inGroundNames: string[],
): void {
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const COLS = 12;
  const ROWS = 6;
  const TOTAL = COLS * ROWS;

  function renderTray(tray: GardenTray): string {
    const plantMap = new Map<number, PrintPlant>();
    for (const p of tray.plants) plantMap.set(p.cellIndex, p);

    const cells = Array.from({ length: TOTAL }, (_, i) => {
      const p = plantMap.get(i);
      if (!p)
        return `<div class="gcell empty"><span class="cn">${i + 1}</span></div>`;
      let cls = "active";
      let mark = "";
      if (p.isCooked) {
        cls = "cooked";
        mark = `<span class="gmark">✕</span>`;
      } else if (p.isTransplanted) {
        cls = "transplanted";
        mark = `<span class="gmark">✓</span>`;
      }
      const short = (p.commonName || "—").slice(0, 8);
      return `<div class="gcell ${cls}"><span class="cn">${i + 1}</span><span class="gname">${short}</span>${mark}</div>`;
    }).join("");

    return `
      <div class="tray-zone">
        <div class="zone-label">${tray.name}</div>
        <div class="tray-grid">${cells}</div>
      </div>`;
  }

  const trayHtml = trays.map(renderTray).join("");

  const inGroundHtml =
    inGroundNames.length > 0
      ? `<div class="tray-zone inground-zone">
          <div class="zone-label" style="color:#b45309">In Ground Crops</div>
          <div class="inground-list">${inGroundNames.map((n) => `<span class="ig-chip">${n}</span>`).join("")}</div>
        </div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>IC SPICY — Garden Layout</title>
<style>
  @media print {
    @page { margin: 0.4in; size: landscape; }
    .no-print { display: none !important; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; }
  .page { max-width: 1200px; margin: 0 auto; padding: 24px; }
  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a6b2b; padding-bottom: 14px; margin-bottom: 20px; }
  .brand-name { font-size: 22px; font-weight: 900; color: #1a6b2b; }
  .brand-sub { font-size: 11px; color: #555; margin-top: 3px; }
  .page-meta { text-align: right; }
  .page-meta strong { display: block; font-size: 15px; font-weight: 700; color: #111; }
  .page-meta span { font-size: 11px; color: #777; }
  /* Print button */
  .print-btn { background: #1a6b2b; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: 700; border-radius: 6px; cursor: pointer; margin-bottom: 20px; }
  .print-btn:hover { background: #155123; }
  /* Zone layout */
  .zones { display: flex; flex-direction: column; gap: 24px; }
  .tray-zone { break-inside: avoid; }
  .zone-label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #2d8a45; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 3px 10px; display: inline-block; margin-bottom: 8px; }
  /* Tray grid */
  .tray-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px; border: 1.5px solid #d1fae5; border-radius: 6px; padding: 6px; background: #f8fffe; }
  .gcell { border: 1px solid #ccc; border-radius: 3px; min-height: 48px; padding: 3px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; font-size: 8px; }
  .gcell.empty { border-style: dashed; border-color: #e5e5e5; background: #fafafa; }
  .gcell.active { border-color: #2d8a45; background: #f0fdf4; }
  .gcell.transplanted { border-color: #aaa; background: #f5f5f5; opacity: 0.7; }
  .gcell.cooked { border-color: #c0392b; background: #fff5f5; }
  .cn { position: absolute; top: 2px; left: 3px; font-size: 7px; color: #aaa; }
  .gname { font-size: 8.5px; font-weight: 700; color: #111; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gmark { font-size: 8px; font-weight: 700; color: #888; }
  .gcell.cooked .gmark { color: #c0392b; }
  /* In-ground zone */
  .inground-zone .zone-label { color: #b45309; background: #fffbeb; border-color: #fde68a; }
  .inground-list { display: flex; flex-wrap: wrap; gap: 6px; border: 1.5px solid #fde68a; border-radius: 6px; padding: 10px; background: #fffbeb; min-height: 48px; }
  .ig-chip { font-size: 10px; font-weight: 700; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; padding: 3px 8px; }
  /* Legend */
  .legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 10px; color: #444; border-top: 1px solid #e5e5e5; padding-top: 12px; margin-top: 18px; }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .ldot { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid; flex-shrink: 0; }
  /* Footer */
  .footer { margin-top: 16px; font-size: 10px; color: #888; border-top: 1px solid #e5e5e5; padding-top: 10px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="page">
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print Garden Layout</button>
  <div class="header">
    <div>
      <div class="brand-name">🌶️ IC SPICY Nursery</div>
      <div class="brand-sub">Port Charlotte, FL · FDACS Registered Nursery</div>
    </div>
    <div class="page-meta">
      <strong>Garden Layout</strong>
      <span>${dateStr}</span>
    </div>
  </div>
  <div class="zones">${trayHtml}${inGroundHtml}</div>
  <div class="legend">
    <span class="legend-item"><span class="ldot" style="background:#f0fdf4;border-color:#2d8a45"></span>Active</span>
    <span class="legend-item"><span class="ldot" style="background:#f5f5f5;border-color:#aaa;opacity:0.7"></span>Transplanted</span>
    <span class="legend-item"><span class="ldot" style="background:#fff5f5;border-color:#c0392b"></span>Cooked</span>
    <span class="legend-item"><span class="ldot" style="background:#fafafa;border-color:#ddd;border-style:dashed"></span>Empty</span>
  </div>
  <div class="footer">
    <span>IC SPICY Nursery Management System · caffeine.ai</span>
    <span>Generated ${dateStr}</span>
  </div>
</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ─── Garden Layout PNG Export ─────────────────────────────────────────────────

/**
 * Captures the garden layout element as a PNG download.
 * Uses html2canvas if available; falls back to window.print() with
 * print-friendly CSS injected into the popup.
 */
export async function exportGardenLayoutPng(
  element: HTMLElement,
): Promise<void> {
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `garden-layout-${dateStr}.png`;

  // Attempt html2canvas dynamic import (non-blocking)
  // We use Function constructor to bypass TypeScript module resolution
  // while keeping proper async/await flow.
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const loadHtml2Canvas = new Function(
      'return import("html2canvas")',
    ) as () => Promise<{
      default: (
        el: HTMLElement,
        opts: Record<string, unknown>,
      ) => Promise<HTMLCanvasElement>;
    }>;
    const mod = await loadHtml2Canvas();
    const html2canvas = mod.default;
    const canvas = await html2canvas(element, {
      backgroundColor: "#111",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    canvas.toBlob((blob) => {
      if (!blob) throw new Error("Canvas blob failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  } catch {
    // html2canvas not available — trigger print as fallback
    window.print();
  }
}
export function exportNIMSCsv(
  plants: PlantPublic[],
  trays: Array<{ id: bigint; name: string }>,
): void {
  const trayMap = new Map(trays.map((t) => [t.id.toString(), t.name]));

  const headers = [
    "Tray Name",
    "Cell Number",
    "Common Name",
    "Latin Name",
    "Origin",
    "Stage",
    "Container Size",
    "Date Seeded",
    "Date Germinated",
    "Date Transplanted",
    "Watering Schedule",
    "Feeding Schedule",
    "Pest Notes",
    "Additional Notes",
    "Photo Count",
    "For Sale",
    "Is Cooked",
  ];

  const rows = plants.map((p) => [
    trayMap.get(p.tray_id.toString()) ?? `Tray ${p.tray_id}`,
    p.cell_position.toString(),
    p.common_name ?? "",
    p.latin_name ?? "",
    p.origin ?? "",
    stageName(p.stage),
    containerSizeLabel(p.container_size),
    formatDate(p.planting_date),
    formatDate(p.germination_date),
    formatDate(p.transplant_date),
    p.watering_schedule ?? "",
    p.notes ?? "",
    p.pest_notes ?? "",
    p.additional_notes ?? "",
    p.photo_keys.length.toString(),
    p.for_sale ? "Yes" : "No",
    p.is_cooked ? "Yes" : "No",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nims-export-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
