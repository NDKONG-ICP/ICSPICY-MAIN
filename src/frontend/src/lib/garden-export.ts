let audioCtx: AudioContext | null = null;

export function playPlacementSound() {
  try {
    audioCtx ??= new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(280, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    /* silent fail */
  }
}

export async function captureCanvasScreenshot(canvas: HTMLCanvasElement): Promise<void> {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `garden-design-${Date.now()}.png`;
  a.click();
}

export function exportDesignSvg(
  design: import("@/lib/garden-types").GardenDesign,
  scale = 50,
): string {
  const w = design.widthMeters * scale;
  const h = design.depthMeters * scale;
  const plants = design.plants
    .map(
      (p) =>
        `<circle cx="${p.x * scale}" cy="${p.y * scale}" r="${12 * p.scale}" fill="${p.color}" stroke="#fff"/><text x="${p.x * scale}" y="${p.y * scale + 4}" text-anchor="middle" font-size="10" fill="#fff">${p.label[0] ?? "?"}</text>`,
    )
    .join("");
  const structures = design.structures
    .map(
      (s) =>
        `<rect x="${s.x * scale}" y="${s.y * scale}" width="${s.width * scale}" height="${s.depth * scale}" fill="${s.color}" opacity="0.7" stroke="#fff"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#3d6b25"/>
  ${structures}${plants}
  <text x="8" y="16" fill="#fff" font-size="12">${design.name} — ${design.widthMeters}m × ${design.depthMeters}m</text>
</svg>`;
}

export function downloadSvg(svg: string, name: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
