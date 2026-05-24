import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Principal } from "@icp-sdk/core/principal";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";
import type {
  AddPlantResult,
  ContainerSize,
  PaymentToken,
  PlantCountStats,
  PlantId,
  PlantLifecycle,
  PlantStage,
  PurchasePlantResult,
  TrayId,
  VarietyPublic,
} from "../declarations/backend.did";
import {
  callRemovePlant,
  callTransplantPlant,
} from "../lib/nims-backend-calls";
import { getNftImageUrl } from "../lib/nft-config";
import {
  refreshAllTrayGrids,
  refreshNimsDashboardStats,
} from "../lib/nims-query";

import type { Backend } from "../backend";

function useNimsActor() {
  const { actor } = useActor<Backend>();
  return actor;
}

export function useVarieties() {
  const actor = useNimsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["varieties", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listVarieties();
    },
    enabled: actorReady,
  });
}

export function usePlantCount() {
  const actor = useNimsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["plantCount", actorReady],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPlantCount();
    },
    enabled: actorReady,
  });
}

export function usePlantsForSale(stage?: PlantStage, varietyId?: bigint) {
  const actor = useNimsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["plantsForSale", stage, varietyId?.toString(), actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlantsForSale(stage ?? null, varietyId ?? null);
    },
    enabled: actorReady,
  });
}

export function usePlantLifecycle(plantId: PlantId | undefined) {
  const actor = useNimsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["plantLifecycle", plantId?.toString(), actorReady],
    queryFn: async () => {
      if (!actor || plantId === undefined) return null;
      return actor.getPlantLifecycle(plantId);
    },
    enabled: actorReady && plantId !== undefined,
  });
}

export function usePlantByNft(nftTokenId: bigint | null | undefined) {
  const actor = useNimsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["plantByNft", nftTokenId?.toString(), actorReady],
    queryFn: async () => {
      if (!actor || nftTokenId == null) return null;
      return actor.getPlantByNft(nftTokenId);
    },
    enabled: actorReady && nftTokenId != null,
    staleTime: 60_000,
  });
}

export function useMyPlantsNims() {
  const actor = useNimsActor();
  const { isAuthenticated } = useAuth();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["myPlantsNims", actorReady, isAuthenticated],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyPlantsNims();
    },
    enabled: actorReady && isAuthenticated,
  });
}

export function useAdminInventory(
  stage?: PlantStage,
  varietyId?: bigint,
  forSale?: boolean,
) {
  const actor = useNimsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["adminInventory", stage, varietyId?.toString(), forSale, actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAdminInventory(
        stage ?? null,
        varietyId ?? null,
        forSale ?? null,
      );
    },
    enabled: actorReady,
  });
}

export function useAddVariety() {
  const actor = useNimsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      species: string;
      scovilleMin: number;
      scovilleMax: number;
      description: string;
      imageUrl?: string;
      daysToGerm?: number;
      daysToMature?: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addVariety(
        input.name,
        input.species,
        BigInt(input.scovilleMin),
        BigInt(input.scovilleMax),
        input.description,
        input.imageUrl ?? null,
        input.daysToGerm !== undefined ? BigInt(input.daysToGerm) : null,
        input.daysToMature !== undefined ? BigInt(input.daysToMature) : null,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["varieties"] });
    },
  });
}

export function useAddPlant() {
  const actor = useNimsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      varietyId: bigint;
      stage: PlantStage;
      trayId?: bigint;
      cellPosition?: bigint;
      priceCents?: bigint;
      container?: import("../declarations/backend.did").ContainerSize;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addPlant(
        input.varietyId,
        input.stage,
        input.trayId ?? null,
        input.cellPosition ?? null,
        input.priceCents ?? null,
        input.container ?? null,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminInventory"] });
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
      qc.invalidateQueries({ queryKey: ["plantCount"] });
    },
  });
}

export function useListPlantForSale() {
  const actor = useNimsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      priceCents,
    }: {
      plantId: PlantId;
      priceCents?: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.listPlantForSale(plantId, priceCents ?? null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminInventory"] });
      qc.invalidateQueries({ queryKey: ["plantsForSale"] });
      qc.invalidateQueries({ queryKey: ["plantCount"] });
    },
  });
}

export function useDelistPlant() {
  const actor = useNimsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plantId: PlantId) => {
      if (!actor) throw new Error("Not connected");
      return actor.delistPlant(plantId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminInventory"] });
      qc.invalidateQueries({ queryKey: ["plantsForSale"] });
    },
  });
}

export function useUpdateNimsPlantStage() {
  const actor = useNimsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      stage,
    }: {
      plantId: PlantId;
      stage: PlantStage;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateNimsPlantStage(plantId, stage);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminInventory"] });
      qc.invalidateQueries({ queryKey: ["plantLifecycle"] });
    },
  });
}

export function usePurchasePlant() {
  const actor = useNimsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      token,
      amount,
    }: {
      plantId: PlantId;
      token: PaymentToken;
      amount: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.purchasePlant(plantId, token, amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantsForSale"] });
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
    },
  });
}

export function usePurchasePlantICPay() {
  const actor = useNimsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      paymentId,
    }: {
      plantId: PlantId;
      paymentId: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.purchasePlantICPay(plantId, paymentId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantsForSale"] });
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
    },
  });
}

export function useAddPlantNote() {
  const actor = useNimsActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ plantId, text }: { plantId: PlantId; text: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addPlantNote(plantId, text);
    },
    onSuccess: (_, { plantId }) => {
      qc.invalidateQueries({ queryKey: ["plantLifecycle", plantId.toString()] });
    },
  });
}

export function useRemovePlant() {
  const { identity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plantId: PlantId) => {
      if (!identity) throw new Error("Not connected");
      return callRemovePlant(identity, plantId);
    },
    onSettled: async () => {
      await refreshAllTrayGrids(qc);
      await refreshNimsDashboardStats(qc);
      qc.invalidateQueries({ queryKey: ["adminInventory"] });
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
      qc.invalidateQueries({ queryKey: ["plantCount"] });
      qc.invalidateQueries({ queryKey: ["plantsForSale"] });
      qc.invalidateQueries({ queryKey: ["plantLifecycle"] });
    },
  });
}

export function useTransplantPlant() {
  const { identity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      plantId: PlantId;
      container: ContainerSize;
      locationNotes?: string;
    }) => {
      if (!identity) throw new Error("Not connected");
      return callTransplantPlant(
        identity,
        args.plantId,
        args.container,
        args.locationNotes ?? null,
      );
    },
    onSettled: async (_, __, vars) => {
      await refreshAllTrayGrids(qc);
      await refreshNimsDashboardStats(qc);
      qc.invalidateQueries({ queryKey: ["adminInventory"] });
      qc.invalidateQueries({ queryKey: ["myPlantsNims"] });
      qc.invalidateQueries({ queryKey: ["plantLifecycle", vars.plantId.toString()] });
    },
  });
}

export function useNftPoolStatus() {
  const actor = useNimsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["nftPoolStatus", actorReady],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getNftPoolStatus();
    },
    enabled: actorReady,
  });
}

export function usePepperHeadAvailable() {
  const actor = useNimsActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["pepperHeadAvailable", actorReady],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.isPepperHeadAvailable();
    },
    enabled: actorReady,
  });
}

export type { PlantLifecycle, VarietyPublic, PlantCountStats, PurchasePlantResult };

export function stageLabel(stage: PlantStage): string {
  if ("Seed" in stage) return "Germinated";
  if ("Seedling" in stage) return "Seedling (1 gal)";
  if ("Mature" in stage) return "Mature (5 gal)";
  return "Unknown";
}

export function stageDefaultPrice(stage: PlantStage): number {
  if ("Seed" in stage) return 5;
  if ("Seedling" in stage) return 25;
  if ("Mature" in stage) return 45;
  return 0;
}

export function formatCents(cents: bigint | undefined): string {
  if (cents === undefined) return "—";
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

export function nftImageUrl(tokenId: bigint | undefined): string {
  if (tokenId === undefined) return "/placeholder-plant.png";
  return getNftImageUrl(tokenId);
}

export function opt<T>(v: T | undefined): [] | [T] {
  return v === undefined ? [] : [v];
}

export function unwrapOpt<T>(v: [] | [T] | undefined): T | undefined {
  if (!v || v.length === 0) return undefined;
  return v[0];
}

export function centsToStablecoinBase(cents: bigint): bigint {
  return cents * 10_000n;
}
