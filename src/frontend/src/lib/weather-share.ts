/** Canvas share card for viral weather snapshots. */
export async function renderWeatherShareCard(opts: {
  locationLabel: string;
  tempF: number;
  condition: string;
  tropicalHeadline?: string;
}): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grd = ctx.createLinearGradient(0, 0, 0, 1080);
  grd.addColorStop(0, "#0a1628");
  grd.addColorStop(1, "#1a1510");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = "#e8a838";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillText("IC SPICY WEATHER", 60, 80);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 120px system-ui, sans-serif";
  ctx.fillText(`${Math.round(opts.tempF)}°`, 60, 280);

  ctx.font = "32px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(opts.condition, 60, 340);
  ctx.fillText(opts.locationLabel, 60, 390);

  if (opts.tropicalHeadline) {
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillText(opts.tropicalHeadline, 60, 480);
  }

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText("icspicy.app/weather · on-chain Florida grower desk", 60, 1000);

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
}

export async function downloadWeatherShareCard(
  opts: Parameters<typeof renderWeatherShareCard>[0],
) {
  const blob = await renderWeatherShareCard(opts);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ic-spicy-weather-${Date.now()}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
