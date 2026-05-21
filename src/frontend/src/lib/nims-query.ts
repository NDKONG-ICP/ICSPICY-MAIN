import type { QueryClient } from "@tanstack/react-query";

/** Canonical React Query key for a tray grid fetch. */
export function trayGridQueryKey(trayId: bigint | null | undefined): readonly [string, string] {
  return ["trayGrid", trayId?.toString() ?? "none"];
}

/** Invalidate + refetch tray grid data after a tray cell mutation. */
export async function refreshTrayGrid(
  qc: QueryClient,
  trayId: bigint | null | undefined,
): Promise<void> {
  if (trayId == null) {
    await qc.invalidateQueries({ queryKey: ["trayGrid"] });
    return;
  }
  const key = trayGridQueryKey(trayId);
  await qc.invalidateQueries({ queryKey: key });
  await qc.refetchQueries({ queryKey: key, type: "active" });
}

export async function refreshAllTrayGrids(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({ queryKey: ["trayGrid"] });
  await qc.refetchQueries({ queryKey: ["trayGrid"], type: "active" });
}

export async function refreshNimsDashboardStats(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({ queryKey: ["nimsDashboardStats"] });
}
