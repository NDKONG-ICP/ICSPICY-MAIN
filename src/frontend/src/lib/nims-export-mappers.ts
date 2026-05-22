import type {
  AdminOrderPublic,
  Icrc7TokenAdminPublic,
  PlantLifecycle,
  SeedLotPublic,
} from "../declarations/backend.did";
import { datedCsvFilename, exportRowsToCsv } from "./nims-csv-export";

function stageLabel(stage: PlantLifecycle["plant"]["stage"]): string {
  if ("Seed" in stage) return "Seed";
  if ("Seedling" in stage) return "Seedling";
  return "Mature";
}

function containerLabel(
  cs: PlantLifecycle["plant"]["container_size"],
): string {
  if (!cs || cs.length === 0) return "";
  const c = cs[0]!;
  const key = Object.keys(c)[0] ?? "Unknown";
  return key;
}

function tsToDate(ts: bigint | undefined): string {
  if (ts == null) return "";
  return new Date(Number(ts / 1_000_000n)).toISOString().slice(0, 10);
}

export function plantLifecycleToExportRow(
  lc: PlantLifecycle,
  includeOwner: boolean,
): Record<string, unknown> {
  const p = lc.plant;
  const row: Record<string, unknown> = {
    plantId: p.id.toString(),
    nftTokenId: lc.nftTokenId.length === 1 ? lc.nftTokenId[0]!.toString() : "",
    variety: p.variety,
    stage: stageLabel(p.stage),
    container: containerLabel(p.container_size),
    plantedDate: tsToDate(p.planting_date),
    germinatedDate: tsToDate(
      p.germination_date.length === 1 ? p.germination_date[0] : undefined,
    ),
    lastWatered: tsToDate(
      lc.wateringLog.at(-1)?.timestamp,
    ),
    lastFed: tsToDate(lc.feedingLog.at(-1)?.date),
    status: p.sold ? "Sold" : p.for_sale ? "For Sale" : "Active",
    forSale: p.for_sale ? "Yes" : "No",
    price:
      lc.priceCents.length === 1
        ? (Number(lc.priceCents[0]!) / 100).toFixed(2)
        : "",
  };
  if (includeOwner) {
    row.owner = p.created_by.toText();
  }
  return row;
}

export function exportPlantInventoryCsv(
  plants: PlantLifecycle[],
  includeOwner: boolean,
): void {
  exportRowsToCsv(
    plants.map((lc) => plantLifecycleToExportRow(lc, includeOwner)),
    datedCsvFilename("ic-spicy-inventory"),
  );
}

export function exportAdminOrdersCsv(orders: AdminOrderPublic[]): void {
  exportRowsToCsv(
    orders.map((o) => ({
      orderId: o.id.toString(),
      buyer: o.buyer.toText(),
      status: Object.keys(o.status)[0] ?? "",
      isPaid: o.is_paid ? "Yes" : "No",
      total: (Number(o.total_cents) / 100).toFixed(2),
      pickup: o.pickup ? "Yes" : "No",
      created: new Date(Number(o.created_at / 1_000_000n)).toISOString(),
      items: o.items
        .map((i) => `${i.product_name} x${i.quantity}`)
        .join("; "),
    })),
    datedCsvFilename("ic-spicy-orders"),
  );
}

export function exportSeedLotsCsv(lots: SeedLotPublic[]): void {
  exportRowsToCsv(
    lots.map((lot) => ({
      lotId: lot.id.toString(),
      varietyId: lot.varietyId.toString(),
      quantity: lot.quantity.length === 1 ? lot.quantity[0]!.toString() : "",
      source: Object.keys(lot.source)[0] ?? "",
      acquired: tsToDate(lot.acquiredDate),
      notes: lot.notes.length === 1 ? lot.notes[0] : "",
      vendorId: lot.vendorId.length === 1 ? lot.vendorId[0]!.toString() : "",
      active: lot.isActive ? "Yes" : "No",
    })),
    datedCsvFilename("ic-spicy-seed-bank"),
  );
}

export function exportNftPoolCsv(tokens: Icrc7TokenAdminPublic[]): void {
  exportRowsToCsv(
    tokens.map((t) => ({
      tokenId: t.token_id.toString(),
      owner: t.owner,
      rarity: t.rarity_label,
      pepperHead: t.is_pepperhead ? "Yes" : "No",
      pool: t.is_canister_pool ? "Yes" : "No",
      plantId: t.plant_id.length === 1 ? t.plant_id[0]!.toString() : "",
      productId: t.product_id.length === 1 ? t.product_id[0]!.toString() : "",
    })),
    datedCsvFilename("ic-spicy-nft-pool"),
  );
}
