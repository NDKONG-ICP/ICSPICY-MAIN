import type { ActorSubclass } from "@dfinity/agent";
import { useQuery } from "@tanstack/react-query";
import type { Backend } from "../backend";
import type {
  VarietyProvenancePublic,
  _SERVICE,
} from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function useProvenanceActor() {
  const { actor } = useActor<Backend>();
  return rawService(actor);
}

function unwrapOpt<T>(v: [] | [T] | undefined | null): T | null {
  return v != null && v.length > 0 ? v[0]! : null;
}

export function useVarietyProvenance(varietyId: bigint | undefined) {
  const actor = useProvenanceActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["varietyProvenance", varietyId?.toString(), actorReady],
    queryFn: async () => {
      if (!actor || varietyId === undefined) return null;
      return unwrapOpt(await actor.getVarietyProvenance(varietyId));
    },
    enabled: actorReady && varietyId !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllVarietyProvenance() {
  const actor = useProvenanceActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["allVarietyProvenance", actorReady],
    queryFn: async () => {
      if (!actor) return new Map<bigint, VarietyProvenancePublic>();
      const map = new Map<bigint, VarietyProvenancePublic>();
      let offset = 0n;
      const limit = 500n;
      for (;;) {
        const batch = await actor.listVarietyProvenance(offset, limit);
        for (const entry of batch) {
          map.set(entry.variety_id, entry);
        }
        if (batch.length < Number(limit)) break;
        offset += limit;
      }
      return map;
    },
    enabled: actorReady,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllVarietyIntros() {
  const actor = useProvenanceActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["allVarietyIntros", actorReady],
    queryFn: async () => {
      if (!actor) return new Map<bigint, string>();
      const map = new Map<bigint, string>();
      const batch = await actor.listVarietyIntros();
      for (const [id, intro] of batch) {
        map.set(id, intro);
      }
      return map;
    },
    enabled: actorReady,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVarietyIntro(varietyId: bigint | undefined) {
  const actor = useProvenanceActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["varietyIntro", varietyId?.toString(), actorReady],
    queryFn: async () => {
      if (!actor || varietyId === undefined) return null;
      return unwrapOpt(await actor.getVarietyIntro(varietyId));
    },
    enabled: actorReady && varietyId !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}
