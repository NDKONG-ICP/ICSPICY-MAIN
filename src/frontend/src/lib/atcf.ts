/**
 * ATCF a-deck parser — decompresses the gzipped model-guidance files the
 * backend canister mirrors from ftp.nhc.noaa.gov and extracts per-model
 * forecast tracks ("spaghetti models") for the latest synoptic cycle.
 *
 * Line format (comma-separated, fixed field order):
 *   BASIN, CY, YYYYMMDDHH, TECHNUM, TECH, TAU, LatN/S, LonE/W, VMAX, ...
 * Latitude/longitude are in tenths of a degree ("143N" → 14.3, "1272W" → -127.2).
 */
import { gunzipSync } from "fflate";

export type AdeckPoint = {
  tau: number;
  lat: number;
  lng: number;
  maxWindKt: number;
};

export type AdeckModelTrack = {
  tech: string;
  label: string;
  color: string;
  isEnsembleMember: boolean;
  initTime: string; // YYYYMMDDHH
  points: AdeckPoint[];
};

export type ParsedAdeck = {
  wallet: string;
  stormName: string;
  initTime: string;
  models: AdeckModelTrack[];
};

/** Headline dynamical/consensus models worth naming in a legend. */
export const ADECK_MODEL_STYLES: Record<
  string,
  { label: string; color: string }
> = {
  OFCL: { label: "NHC Official", color: "#ffffff" },
  AVNO: { label: "GFS", color: "#22c55e" },
  EMXI: { label: "ECMWF", color: "#f97316" },
  EMX2: { label: "ECMWF (prev)", color: "#fb923c" },
  HFSA: { label: "HAFS-A", color: "#38bdf8" },
  HFSB: { label: "HAFS-B", color: "#818cf8" },
  HWRF: { label: "HWRF", color: "#ef4444" },
  HMON: { label: "HMON", color: "#f43f5e" },
  CMC: { label: "Canadian", color: "#eab308" },
  UKX: { label: "UKMET", color: "#c026d3" },
  NVGM: { label: "NAVGEM", color: "#14b8a6" },
  CTCX: { label: "COAMPS-TC", color: "#a3e635" },
  TVCN: { label: "Consensus", color: "#fbbf24" },
};

const ENSEMBLE_TECH = /^AP\d{2}$/; // GFS ensemble members AP01–AP30
const ENSEMBLE_COLOR = "#94a3b8";

/** Max cycle lag (hours) vs the newest init before a model is dropped. */
const MAX_INIT_LAG_HOURS = 12;

function parseAtcfLatLng(latRaw: string, lonRaw: string): [number, number] | null {
  const latM = /^(\d+)([NS])$/.exec(latRaw);
  const lonM = /^(\d+)([EW])$/.exec(lonRaw);
  if (!latM || !lonM) return null;
  let lat = parseInt(latM[1], 10) / 10;
  let lng = parseInt(lonM[1], 10) / 10;
  if (latM[2] === "S") lat = -lat;
  if (lonM[2] === "W") lng = -lng;
  if (lat === 0 && lng === 0) return null;
  return [lat, lng];
}

function initToMillis(init: string): number {
  if (init.length !== 10) return 0;
  const y = Number(init.slice(0, 4));
  const mo = Number(init.slice(4, 6));
  const d = Number(init.slice(6, 8));
  const h = Number(init.slice(8, 10));
  return Date.UTC(y, mo - 1, d, h);
}

/**
 * Parse a gzipped a-deck. Keeps the latest run per model, drops models whose
 * newest run lags the freshest init by more than MAX_INIT_LAG_HOURS, and
 * dedupes wind-radii repeat lines (same TAU appears once per threshold).
 */
export function parseAdeckGz(
  gz: Uint8Array,
  wallet: string,
  stormName: string,
): ParsedAdeck | null {
  let text: string;
  try {
    text = new TextDecoder().decode(gunzipSync(gz));
  } catch {
    return null;
  }

  // tech → init → tau → point
  const byTech = new Map<string, Map<string, Map<number, AdeckPoint>>>();
  let latestInit = "";

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const f = line.split(",").map((s) => s.trim());
    if (f.length < 9) continue;
    const init = f[2];
    const tech = f[4];
    const tau = parseInt(f[5], 10);
    if (!init || !tech || Number.isNaN(tau) || tau < 0) continue;
    if (tech === "CARQ" || tech === "XTRP") continue; // analysis/extrapolation
    const known = tech in ADECK_MODEL_STYLES || ENSEMBLE_TECH.test(tech);
    if (!known) continue;
    const coords = parseAtcfLatLng(f[6], f[7]);
    if (!coords) continue;
    const vmax = parseInt(f[8], 10);

    if (init > latestInit) latestInit = init;
    let inits = byTech.get(tech);
    if (!inits) {
      inits = new Map();
      byTech.set(tech, inits);
    }
    let taus = inits.get(init);
    if (!taus) {
      taus = new Map();
      inits.set(init, taus);
    }
    if (!taus.has(tau)) {
      taus.set(tau, {
        tau,
        lat: coords[0],
        lng: coords[1],
        maxWindKt: Number.isNaN(vmax) ? 0 : vmax,
      });
    }
  }

  if (!latestInit) return null;
  const latestMs = initToMillis(latestInit);

  const models: AdeckModelTrack[] = [];
  for (const [tech, inits] of byTech) {
    let bestInit = "";
    for (const init of inits.keys()) {
      if (init > bestInit) bestInit = init;
    }
    const lagHours = (latestMs - initToMillis(bestInit)) / 3_600_000;
    if (lagHours > MAX_INIT_LAG_HOURS) continue;
    const taus = inits.get(bestInit);
    if (!taus) continue;
    const points = [...taus.values()].sort((a, b) => a.tau - b.tau);
    if (points.length < 2) continue;
    const isMember = ENSEMBLE_TECH.test(tech);
    const style = ADECK_MODEL_STYLES[tech];
    models.push({
      tech,
      label: style?.label ?? tech,
      color: isMember ? ENSEMBLE_COLOR : (style?.color ?? "#94a3b8"),
      isEnsembleMember: isMember,
      initTime: bestInit,
      points,
    });
  }

  if (models.length === 0) return null;
  // Named models render above ensemble members; OFCL drawn last (on top).
  models.sort((a, b) => {
    if (a.isEnsembleMember !== b.isEnsembleMember) {
      return a.isEnsembleMember ? -1 : 1;
    }
    if (a.tech === "OFCL") return 1;
    if (b.tech === "OFCL") return -1;
    return a.tech.localeCompare(b.tech);
  });

  return { wallet, stormName, initTime: latestInit, models };
}

/** Human-readable init like "2026-08-11 18Z". */
export function formatInitTime(init: string): string {
  if (init.length !== 10) return init;
  return `${init.slice(0, 4)}-${init.slice(4, 6)}-${init.slice(6, 8)} ${init.slice(8, 10)}Z`;
}
