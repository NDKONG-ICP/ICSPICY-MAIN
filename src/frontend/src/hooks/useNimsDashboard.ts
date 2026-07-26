import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import type {
  ActivityEntry,
  ContainerSize,
  DashboardStats,
  DeathCause,
  PlantHealth,
  PlantId,
  PlantLifecycle,
  TrayCellPublic,
  TrayId,
  WeatherSnapshot,
} from "../declarations/backend.did";
import {
  callAddWeatherSnapshot,
  callMarkPlantDead,
  callRevivePlant,
} from "../lib/nims-backend-calls";
import {
  refreshAllTrayGrids,
  refreshNimsDashboardStats,
  refreshTrayGrid,
  trayGridQueryKey,
} from "../lib/nims-query";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

function useNimsOpsActor() {
  const { actor } = useActor<Backend>();
  return actor;
}

export function useNimsDashboardStats() {
  const actor = useNimsOpsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["nimsDashboardStats", actorReady],
    queryFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.getNimsDashboardStats();
    },
    enabled: actorReady,
    refetchInterval: 60_000,
  });
}

export function useActivityFeed(limit = 50) {
  const actor = useNimsOpsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["nimsActivity", limit, actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecentActivity(BigInt(limit));
    },
    enabled: actorReady,
  });
}

export function useTrayGrid(trayId: TrayId | null) {
  const actor = useNimsOpsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: trayGridQueryKey(trayId),
    queryFn: async () => {
      if (!actor || trayId == null) return [];
      return actor.getTrayGrid(trayId);
    },
    enabled: actorReady && trayId != null,
  });
}

export function usePlantHealth(plantId: PlantId | null) {
  const actor = useNimsOpsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["plantHealth", plantId?.toString(), actorReady],
    queryFn: async () => {
      if (!actor || plantId == null) return null;
      return actor.getPlantHealth(plantId);
    },
    enabled: actorReady && plantId != null,
  });
}

export function usePlantsByContainer(container: ContainerSize | null) {
  const actor = useNimsOpsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["plantsByContainer", container, actorReady],
    queryFn: async () => {
      if (!actor || container == null) return [];
      return actor.getPlantsByContainer(container);
    },
    enabled: actorReady && container != null,
  });
}

export function useRegisterPlant() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      sharedData: import("../declarations/backend.did").RegisterPlantSharedData;
      cellIndex: bigint;
      overrides?: import("../declarations/backend.did").RegisterPlantCellOverrides;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.registerPlant(
        args.sharedData,
        args.cellIndex,
        args.overrides ?? null,
      );
    },
    onSettled: async (_data, _err, vars) => {
      await refreshTrayGrid(qc, vars.sharedData.tray_id);
      await refreshNimsDashboardStats(qc);
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
    },
  });
}

export function useRegisterPlantBatch() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      sharedData: import("../declarations/backend.did").RegisterPlantSharedData;
      cellIndices: bigint[];
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.registerPlantBatch(
        args.sharedData,
        args.cellIndices.map((cell_index) => ({
          cell_index,
          overrides: [],
        })),
      );
    },
    onSettled: async (_data, _err, vars) => {
      await refreshTrayGrid(qc, vars.sharedData.tray_id);
      await refreshNimsDashboardStats(qc);
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
    },
  });
}

export function usePlantSeed() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      trayId: TrayId;
      cellPosition: bigint;
      varietyId: bigint;
      datePlanted?: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.plantSeed(
        args.trayId,
        args.cellPosition,
        args.varietyId,
        args.datePlanted ?? null,
      );
    },
    onSettled: async (_data, _err, vars) => {
      await refreshTrayGrid(qc, vars.trayId);
      await refreshNimsDashboardStats(qc);
    },
  });
}

export function useMarkCellGerminated() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      trayId: TrayId;
      cellPosition: bigint;
      date?: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.markCellGerminated(
        args.trayId,
        args.cellPosition,
        args.date ?? null,
      );
    },
    onSettled: async (_data, _err, vars) => {
      await refreshTrayGrid(qc, vars.trayId);
      await refreshNimsDashboardStats(qc);
    },
  });
}

export function useGerminatePlant() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { plantId: PlantId; date?: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.germinatePlant(args.plantId, args.date ?? null);
    },
    onSettled: async (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["plantsAwaitingNft"] });
      qc.invalidateQueries({ queryKey: ["nftPoolStatus"] });
      qc.invalidateQueries({ queryKey: ["plantPoolAvailable"] });
      qc.invalidateQueries({
        queryKey: ["plantLifecycle", vars.plantId.toString()],
      });
      await refreshAllTrayGrids(qc);
      await refreshNimsDashboardStats(qc);
    },
  });
}

export function useGerminatePlantBatch() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { plantIds: PlantId[]; date?: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.germinatePlantBatch(args.plantIds, args.date ?? null);
    },
    onSettled: async () => {
      qc.invalidateQueries({ queryKey: ["plantsAwaitingNft"] });
      qc.invalidateQueries({ queryKey: ["nftPoolStatus"] });
      await refreshNimsDashboardStats(qc);
    },
  });
}

export function usePlantsAwaitingNft() {
  const actor = useNimsOpsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["plantsAwaitingNft", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPlantsAwaitingNft();
    },
    enabled: actorReady,
  });
}

export function usePlantPoolAvailableCount() {
  const actor = useNimsOpsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["plantPoolAvailable", actorReady],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPlantPoolAvailableCount();
    },
    enabled: actorReady,
  });
}

export function useListGraveyard() {
  const actor = useNimsOpsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["nimsGraveyard", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listGraveyard();
    },
    enabled: actorReady,
  });
}

export function useMarkCellDead() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      trayId: TrayId;
      cellPosition: bigint;
      cause: DeathCause;
      notes?: string;
      photoUrl?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.markCellDead(
        args.trayId,
        args.cellPosition,
        args.cause,
        args.notes ?? null,
        args.photoUrl ?? null,
      );
    },
    onSettled: async (_data, _err, vars) => {
      await refreshTrayGrid(qc, vars.trayId);
      await refreshNimsDashboardStats(qc);
      qc.invalidateQueries({ queryKey: ["nimsGraveyard"] });
    },
  });
}

export function useWaterEntireTray() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      trayId: TrayId;
      amountMl: bigint;
      phLevel?: number;
      notes?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.waterEntireTray(
        args.trayId,
        args.amountMl,
        args.phLevel ?? null,
        args.notes ?? null,
      );
    },
    onSettled: async (_data, _err, vars) => {
      await refreshTrayGrid(qc, vars.trayId);
      qc.invalidateQueries({ queryKey: ["nimsActivity"] });
    },
  });
}

export function useRevivePlant() {
  const { identity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plantId: PlantId) => {
      if (!identity) throw new Error("Not connected");
      return callRevivePlant(identity, plantId);
    },
    onSuccess: (_, plantId) => {
      qc.invalidateQueries({
        queryKey: ["plantLifecycle", plantId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
      qc.invalidateQueries({ queryKey: ["nimsActivity"] });
      qc.invalidateQueries({ queryKey: ["nimsDashboardStats"] });
    },
  });
}

export function useMarkPlantDead() {
  const { identity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      plantId: PlantId;
      cause: DeathCause;
      notes?: string;
      photoUrl?: string;
    }) => {
      if (!identity) throw new Error("Not connected");
      return callMarkPlantDead(
        identity,
        args.plantId,
        args.cause,
        args.notes ?? null,
        args.photoUrl ?? null,
      );
    },
    onSuccess: (_, { plantId }) => {
      qc.invalidateQueries({
        queryKey: ["plantLifecycle", plantId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
      qc.invalidateQueries({ queryKey: ["nimsActivity"] });
      qc.invalidateQueries({ queryKey: ["nimsGraveyard"] });
      qc.invalidateQueries({ queryKey: ["nimsDashboardStats"] });
    },
  });
}

export function useAddWeatherSnapshot() {
  const { identity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      snapshot,
    }: {
      plantId: PlantId;
      snapshot: WeatherSnapshot;
    }) => {
      if (!identity) throw new Error("Not connected");
      return callAddWeatherSnapshot(identity, plantId, snapshot);
    },
    onSuccess: (_, { plantId }) => {
      qc.invalidateQueries({
        queryKey: ["plantLifecycle", plantId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
    },
  });
}

export function useLogWatering() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      plantId: PlantId;
      amountMl: bigint;
      phLevel?: number;
      notes?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.logWatering(
        args.plantId,
        args.amountMl,
        args.phLevel ?? null,
        args.notes ?? null,
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["nimsActivity"] });
      qc.invalidateQueries({ queryKey: ["plantHealth"] });
      qc.invalidateQueries({
        queryKey: ["plantLifecycle", vars.plantId.toString()],
      });
    },
  });
}

export function useLogFeeding() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      plantId: PlantId;
      productName: string;
      nutrientType: string;
      dosage: string;
      notes?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.logFeeding(
        args.plantId,
        args.productName,
        args.nutrientType,
        args.dosage,
        args.notes ?? null,
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["nimsActivity"] });
      qc.invalidateQueries({
        queryKey: ["plantLifecycle", vars.plantId.toString()],
      });
    },
  });
}

export function useLogPest() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      plantId: PlantId;
      pestName: string;
      severity: string;
      treatment?: string;
      notes?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.logPest(
        args.plantId,
        args.pestName,
        args.severity,
        args.treatment ?? null,
        args.notes ?? null,
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["nimsActivity"] });
      qc.invalidateQueries({
        queryKey: ["plantLifecycle", vars.plantId.toString()],
      });
    },
  });
}

export function useAddNimsPlantPhoto() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      plantId: PlantId;
      path: string;
      caption?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addNimsPlantPhoto(
        args.plantId,
        args.path,
        args.caption ?? null,
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["plantLifecycle", vars.plantId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["nimsActivity"] });
      qc.invalidateQueries({ queryKey: ["nimsPhoto"] });
    },
  });
}

export function useCreateNimsTray() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { name: string; date?: bigint }) => {
      if (!actor) throw new Error("Not connected");
      const ts = args.date ?? BigInt(Date.now()) * 1_000_000n;
      return actor.createNimsTray(args.name, ts, null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myTrays"] });
      qc.invalidateQueries({ queryKey: ["trays"] });
    },
  });
}

export function useAdoptPurchasedPlant() {
  const actor = useNimsOpsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      nftTokenId: bigint;
      container: ContainerSize;
      locationNotes?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addPurchasedPlantToNims(
        args.nftTokenId,
        args.container,
        args.locationNotes ?? null,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
      qc.invalidateQueries({ queryKey: ["unadoptedNfts"] });
    },
  });
}

export type { ActivityEntry, DashboardStats, TrayCellPublic, PlantHealth };
