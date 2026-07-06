/**
 * agriiTrace-compatible provenance export for co-op grower plants.
 * Field names align with agriiTrace published schema slots.
 */
import type { PlantLifecycle } from "../hooks/useNims";

export type AgriitraceExport = {
  schema: "agriiTrace-compatible";
  version: "1.0";
  generatedAt: string;
  grower: {
    name: string;
    location?: string;
    license?: string;
  };
  plant: {
    id: string;
    variety: string;
    species?: string;
    plantingTime?: string;
    harvestDate?: string;
    nftTokenId?: string;
  };
  inputsApplied: Array<{
    type: string;
    quantity: string;
    date: string;
    notes?: string;
  }>;
  soilWeatherMonitoring: Array<{
    recordedAt: string;
    temperatureF?: number;
    humidityPct?: number;
    rainfallIn?: number;
    windMph?: number;
    uvIndex?: number;
    airQuality?: number;
    moonPhase?: string;
  }>;
  qualityCertification: {
    coa: string | null;
    notes: string;
  };
};

function optText(v: [] | [string] | undefined): string | undefined {
  if (v == null || v.length === 0) return undefined;
  return v[0];
}

function tsToIso(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toISOString();
}

export function buildAgriitraceExport(
  lifecycle: PlantLifecycle,
  grower: { name: string; location?: string; license?: string },
): AgriitraceExport {
  const plant = lifecycle.plant;
  const inputsApplied = lifecycle.feedingLog.map((f) => ({
    type: f.nutrient_type || f.product_name || "feeding",
    quantity: f.dosage_amount,
    date: tsToIso(f.date),
    notes: optText(f.notes),
  }));

  const soilWeatherMonitoring = lifecycle.weatherSnapshots.map((w) => ({
    recordedAt: w.date,
    temperatureF: w.tempHighF,
    humidityPct: w.humidity,
    rainfallIn: w.rainfallInches,
    uvIndex: w.uvIndex,
  }));

  const harvestNote = lifecycle.notes.find((n) => /harvest/i.test(n.text));

  return {
    schema: "agriiTrace-compatible",
    version: "1.0",
    generatedAt: new Date().toISOString(),
    grower,
    plant: {
      id: plant.id.toString(),
      variety: plant.variety,
      species: optText(plant.latin_name),
      plantingTime: tsToIso(plant.planting_date),
      harvestDate: harvestNote ? tsToIso(harvestNote.timestamp) : undefined,
      nftTokenId: lifecycle.nftTokenId.length === 1
        ? lifecycle.nftTokenId[0]!.toString()
        : optText(plant.nft_id as [] | [string]),
    },
    inputsApplied,
    soilWeatherMonitoring,
    qualityCertification: {
      coa: null,
      notes: "Certificate of Analysis slot — attach COA off-chain when available.",
    },
  };
}

export function downloadAgriitraceJson(data: AgriitraceExport, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
