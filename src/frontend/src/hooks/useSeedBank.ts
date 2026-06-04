import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import type {
  BreedingCrossPublic,
  PlantId,
  SeedBankStats,
  SeedLotPublic,
  SeedSource,
  SeedVendorPublic,
} from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

function useSeedBankActor(): Backend | null {
  const { actor } = useActor<Backend>();
  return actor;
}

export function useSeedBankStats() {
  const actor = useSeedBankActor();
  const { isAuthenticated } = useAuth();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["seedBankStats", actorReady],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getSeedBankStats();
    },
    enabled: actorReady && isAuthenticated,
  });
}

export function useMySeedBank() {
  const actor = useSeedBankActor();
  const { isAuthenticated } = useAuth();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["mySeedBank", actorReady],
    queryFn: async (): Promise<SeedLotPublic[]> => {
      if (!actor) return [];
      return actor.getMySeedBank();
    },
    enabled: actorReady && isAuthenticated,
  });
}

export function useMyCrosses() {
  const actor = useSeedBankActor();
  const { isAuthenticated } = useAuth();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["myCrosses", actorReady],
    queryFn: async (): Promise<BreedingCrossPublic[]> => {
      if (!actor) return [];
      return actor.getMyCrosses();
    },
    enabled: actorReady && isAuthenticated,
  });
}

export function useMyVendors() {
  const actor = useSeedBankActor();
  const { isAuthenticated } = useAuth();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["myVendors", actorReady],
    queryFn: async (): Promise<SeedVendorPublic[]> => {
      if (!actor) return [];
      return actor.getMyVendors();
    },
    enabled: actorReady && isAuthenticated,
  });
}

function invalidateSeedBank(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["mySeedBank"] });
  qc.invalidateQueries({ queryKey: ["seedBankStats"] });
  qc.invalidateQueries({ queryKey: ["myCrosses"] });
  qc.invalidateQueries({ queryKey: ["myVendors"] });
}

export function useAddSeedLot() {
  const actor = useSeedBankActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      varietyId: bigint;
      source: SeedSource;
      quantity?: bigint;
      vendorId?: bigint;
      notes?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addSeedLot(
        args.varietyId,
        args.source,
        args.quantity ?? null,
        args.vendorId ?? null,
        args.notes ?? null,
      );
    },
    onSuccess: () => invalidateSeedBank(qc),
  });
}

export function useUpdateSeedLot() {
  const actor = useSeedBankActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      quantity?: bigint;
      generation?: string;
      germinationRate?: bigint;
      notes?: string;
      isActive?: boolean;
      vendorId?: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateSeedLot(
        args.id,
        args.quantity ?? null,
        null,
        args.generation ?? null,
        args.germinationRate ?? null,
        args.notes ?? null,
        args.isActive ?? null,
        args.vendorId ?? null,
      );
    },
    onSuccess: () => invalidateSeedBank(qc),
  });
}

export function useRecordCross() {
  const actor = useSeedBankActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      motherVarietyId: bigint;
      fatherVarietyId: bigint;
      motherPlantId?: PlantId;
      fatherPlantId?: PlantId;
      notes?: string;
      expectedTraits?: string;
      generation?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.recordCross(
        args.name,
        args.motherVarietyId,
        args.fatherVarietyId,
        args.motherPlantId ?? null,
        args.fatherPlantId ?? null,
        null,
        args.notes ?? null,
        args.expectedTraits ?? null,
        args.generation ?? null,
      );
    },
    onSuccess: () => invalidateSeedBank(qc),
  });
}

export function useAddVendor() {
  const actor = useSeedBankActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      website?: string;
      notes?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addVendor(
        args.name,
        args.website ?? null,
        args.notes ?? null,
      );
    },
    onSuccess: () => invalidateSeedBank(qc),
  });
}

export function useHarvestSeeds() {
  const actor = useSeedBankActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      plantId: PlantId;
      quantity?: bigint;
      notes?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.harvestSeeds(
        args.plantId,
        args.quantity ?? null,
        args.notes ?? null,
      );
    },
    onSuccess: () => invalidateSeedBank(qc),
  });
}

export function seedSourceLabel(source: SeedSource): string {
  if ("OwnHarvest" in source) return "Own harvest";
  if ("Vendor" in source) return "Vendor";
  if ("Trade" in source) return "Trade";
  if ("Gift" in source) return "Gift";
  if ("Cross" in source) return "Cross";
  return "Unknown";
}

export function unwrapOpt<T>(opt: [] | [T]): T | undefined {
  return opt.length > 0 ? opt[0] : undefined;
}
