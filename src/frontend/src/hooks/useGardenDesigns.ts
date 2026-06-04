import type { ActorSubclass } from "@dfinity/agent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Backend } from "../backend";
import type { _SERVICE } from "../declarations/backend.did";
import {
  designFromCandid,
  designIdFromCreate,
  designToInput,
} from "../lib/garden-candid";
import type { GardenDesign } from "../lib/garden-types";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

export function useMyGardenDesigns() {
  const { actor } = useActor<Backend>();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["gardenDesigns", "mine", actorReady],
    queryFn: async () => {
      const svc = rawService(actor);
      if (!svc) return [];
      const rows = await svc.getMyDesigns();
      return rows.map(designFromCandid);
    },
    enabled: actorReady && isAuthenticated,
  });
}

export function usePublicGardenDesigns(offset = 0, limit = 50) {
  const { actor } = useActor<Backend>();
  const { actorReady } = useActorReady();

  return useQuery({
    queryKey: ["gardenDesigns", "public", offset, limit, actorReady],
    queryFn: async () => {
      const svc = rawService(actor);
      if (!svc) return [];
      const rows = await svc.getPublicDesigns(BigInt(offset), BigInt(limit));
      return rows.map(designFromCandid);
    },
    enabled: actorReady,
  });
}

export function useGardenDesignLoader() {
  const { actor } = useActor<Backend>();
  const { actorReady } = useActorReady();

  return useCallback(
    async (designId: number): Promise<GardenDesign | null> => {
      const svc = rawService(actor);
      if (!svc || !actorReady) return null;
      const row = await svc.getGardenDesignForUser(BigInt(designId));
      if (!row.length) return null;
      return designFromCandid(row[0]);
    },
    [actor, actorReady],
  );
}

export function useGardenDesignMutations() {
  const { actor } = useActor<Backend>();
  const { actorReady } = useActorReady();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["gardenDesigns"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (design: GardenDesign): Promise<number> => {
      const svc = rawService(actor);
      if (!svc || !actorReady) throw new Error("Not connected");
      const input = designToInput(design);
      if (design.id == null) {
        const result = await svc.createGardenDesign(input);
        return designIdFromCreate(result);
      }
      const ok = await svc.updateGardenDesign(BigInt(design.id), input);
      if (!ok) throw new Error("Update failed — design not found");
      return design.id;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (designId: number) => {
      const svc = rawService(actor);
      if (!svc || !actorReady) throw new Error("Not connected");
      const ok = await svc.deleteGardenDesign(BigInt(designId));
      if (!ok) throw new Error("Delete failed");
    },
    onSuccess: invalidate,
  });

  return { saveMutation, deleteMutation };
}
