import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ClaimRequestStatus,
  PlantClaimRequestPublic,
  PlantClaimStatusPublic,
  PlantId,
} from "../declarations/backend.did";
import type { Backend } from "../backend";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

export function claimStatusKey(
  status: ClaimRequestStatus | undefined,
): "pending" | "approved" | "rejected" | null {
  if (!status) return null;
  if ("pending" in status) return "pending";
  if ("approved" in status) return "approved";
  if ("rejected" in status) return "rejected";
  return null;
}

function mapClaimStatus(
  raw: [] | [ClaimRequestStatus],
): "pending" | "approved" | "rejected" | null {
  const hit = raw[0];
  return hit ? claimStatusKey(hit) : null;
}

export function usePlantClaimStatus(plantId: PlantId | undefined) {
  const { actor } = useActor<Backend>();
  const { actorReady } = useActorReady();
  const { identity } = useAuth();
  const caller =
    identity && !identity.getPrincipal().isAnonymous()
      ? identity.getPrincipal()
      : null;

  return useQuery({
    queryKey: [
      "plantClaimStatus",
      plantId?.toString(),
      caller?.toText() ?? "anon",
      actorReady,
    ],
    queryFn: async (): Promise<PlantClaimStatusPublic | null> => {
      if (!actor || plantId === undefined) return null;
      return actor.getPlantClaimStatus(plantId, caller);
    },
    enabled: actorReady && plantId !== undefined,
    refetchInterval: 30_000,
  });
}

export function useRequestPlantClaim() {
  const { actor } = useActor<Backend>();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      note,
    }: {
      plantId: PlantId;
      note?: string;
    }) => {
      if (!actor) throw new Error("Sign in to request provenance");
      return actor.requestPlantClaim(plantId, note ?? null);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["plantClaimStatus", vars.plantId.toString()],
      });
    },
  });
}

export function useCancelPlantClaimRequest() {
  const { actor } = useActor<Backend>();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plantId: PlantId) => {
      if (!actor) throw new Error("Not connected");
      return actor.cancelMyClaimRequest(plantId);
    },
    onSuccess: (_, plantId) => {
      qc.invalidateQueries({
        queryKey: ["plantClaimStatus", plantId.toString()],
      });
    },
  });
}

export function useAdminClaimRequests(
  filter: "pending" | "all" = "pending",
) {
  const { actor } = useActor<Backend>();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["adminClaimRequests", filter, actorReady],
    queryFn: async (): Promise<PlantClaimRequestPublic[]> => {
      if (!actor) return [];
      if (filter === "pending") {
        return actor.adminListClaimRequests({ pending: null });
      }
      return actor.adminListClaimRequests(null);
    },
    enabled: actorReady,
    refetchInterval: 20_000,
  });
}

export function useAdminApproveClaimRequest() {
  const { actor } = useActor<Backend>();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      requester,
    }: {
      plantId: PlantId;
      requester: Principal;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.adminApproveClaimRequest(plantId, requester);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminClaimRequests"] });
      qc.invalidateQueries({ queryKey: ["plantLifecycle"] });
      qc.invalidateQueries({ queryKey: ["plantClaimStatus"] });
    },
  });
}

export function useAdminRejectClaimRequest() {
  const { actor } = useActor<Backend>();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      requester,
    }: {
      plantId: PlantId;
      requester: Principal;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.adminRejectClaimRequest(plantId, requester);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminClaimRequests"] });
      qc.invalidateQueries({ queryKey: ["plantClaimStatus"] });
    },
  });
}

export function mapClaimStatusPublic(
  raw: PlantClaimStatusPublic | null | undefined,
) {
  if (!raw) return null;
  return {
    pendingCount: Number(raw.pendingCount),
    sold: raw.sold,
    hasNft: raw.hasNft,
    myStatus: mapClaimStatus(raw.myStatus),
  };
}
