import { getPlantById } from "./garden-plant-catalog";
import type { GardenDesign } from "./garden-types";

const SCALE = 12; // px per meter for print

export function exportLandscapePlanSvg(
  design: GardenDesign,
  zone = "10a",
): string {
  const w = design.widthMeters * SCALE;
  const h = design.depthMeters * SCALE;
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const abbrev = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3);

  const legendMap = new Map<
    string,
    { name: string; qty: number; spacing: string }
  >();
  for (const p of design.plants) {
    const cat = p.catalogId ? getPlantById(p.catalogId) : null;
    const ab = abbrev(p.label);
    const prev = legendMap.get(ab);
    if (prev) prev.qty += 1;
    else
      legendMap.set(ab, {
        name: p.label,
        qty: 1,
        spacing: cat ? `${Math.round(cat.spacing * 39.37)}"` : '24"',
      });
  }

  const grid: string[] = [];
  for (let x = 0; x <= design.widthMeters; x += design.gridSizeMeters) {
    grid.push(
      `<line x1="${x * SCALE}" y1="0" x2="${x * SCALE}" y2="${h}" stroke="#ccc" stroke-width="0.5"/>`,
    );
  }
  for (let y = 0; y <= design.depthMeters; y += design.gridSizeMeters) {
    grid.push(
      `<line x1="0" y1="${y * SCALE}" x2="${w}" y2="${y * SCALE}" stroke="#ccc" stroke-width="0.5"/>`,
    );
  }

  const structures = design.structures
    .map(
      (s) =>
        `<rect x="${s.x * SCALE}" y="${s.y * SCALE}" width="${s.width * SCALE}" height="${s.depth * SCALE}" fill="${s.color}" opacity="0.5" stroke="#333"/><text x="${(s.x + s.width / 2) * SCALE}" y="${(s.y + s.depth / 2) * SCALE}" font-size="8" text-anchor="middle">${s.structureType.slice(0, 12)}</text>`,
    )
    .join("");

  const plants = design.plants
    .map((p) => {
      const ab = abbrev(p.label);
      const r = 8 * p.scale;
      return `<circle cx="${p.x * SCALE}" cy="${p.y * SCALE}" r="${r}" fill="${p.color}" stroke="#fff" stroke-width="1"/><text x="${p.x * SCALE}" y="${p.y * SCALE + 3}" font-size="7" text-anchor="middle" fill="#fff">${ab}</text>`;
    })
    .join("");

  const legendRows = [...legendMap.entries()]
    .map(
      ([ab, v], i) =>
        `<text x="0" y="${i * 14}" font-size="10">${ab} = ${v.name} | ${v.qty} | ${v.spacing}</text>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w + 220}" height="${Math.max(h + 80, 200)}" viewBox="0 0 ${w + 220} ${Math.max(h + 80, 200)}">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <g transform="translate(10,40)">
    <rect width="${w}" height="${h}" fill="#3d6b25" opacity="0.2"/>
    ${grid.join("")}
    ${structures}
    ${plants}
    <text x="${w - 40}" y="15" font-size="10">N ↑</text>
    <line x1="10" y1="${h + 15}" x2="${10 + SCALE * 4}" y2="${h + 15}" stroke="#000" stroke-width="2"/>
    <text x="${10 + SCALE * 2}" y="${h + 28}" font-size="9" text-anchor="middle">4m scale</text>
  </g>
  <g transform="translate(${w + 20},40)">
    <text font-size="11" font-weight="bold">Plant Legend</text>
    ${legendRows}
  </g>
  <g transform="translate(${w - 180},10)">
    <text font-size="12" font-weight="bold">${design.name}</text>
    <text y="14" font-size="9">${date}</text>
    <text y="28" font-size="9">Scale: 1" = 4' | Zone ${zone}</text>
    <text y="42" font-size="9">${design.widthMeters}m × ${design.depthMeters}m</text>
  </g>
  <text x="10" y="${Math.max(h + 70, 190)}" font-size="9" fill="#666">Created with IC SPICY Garden Designer — www.icspicy.app</text>
</svg>`;
}

export function downloadLandscapePlan(design: GardenDesign, zone?: string) {
  const svg = exportLandscapePlanSvg(design, zone);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${design.name.replace(/\s+/g, "-").toLowerCase()}-landscape-plan.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function renderShareCard(
  design: GardenDesign,
  screenshotDataUrl: string | null,
  yieldLbs: number,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 1200, 630);

  if (screenshotDataUrl) {
    const img = await loadImage(screenshotDataUrl);
    ctx.drawImage(img, 0, 0, 1200, 420);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, 1200, 420);
  } else {
    ctx.fillStyle = "#365314";
    ctx.fillRect(0, 0, 1200, 420);
  }

  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px system-ui,sans-serif";
  ctx.fillText("🌶️ IC SPICY Garden Designer", 40, 480);
  ctx.font = "28px system-ui,sans-serif";
  ctx.fillText(`"${design.name}"`, 40, 530);
  ctx.font = "22px system-ui,sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(
    `${design.plants.length} plants · ${design.structures.length} structures · ${yieldLbs.toFixed(0)} lbs/yr est.`,
    40,
    570,
  );
  ctx.fillStyle = "#f97316";
  ctx.font = "20px system-ui,sans-serif";
  ctx.fillText("Design your garden free at icspicy.app/garden", 40, 610);

  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function downloadShareCard(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${name.replace(/\s+/g, "-")}-share.png`;
  a.click();
}
