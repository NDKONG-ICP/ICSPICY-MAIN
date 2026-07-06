/**
 * Hooks for the /u/:principalOrUsername public profile page —
 * principal/username resolution, the composed one-shot profile query,
 * Top 8 mutations, and the public plants list.
 */
import type { ActorSubclass } from "@dfinity/agent";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type {
  PlantPublic,
  PublicProfileFull,
  _SERVICE,
} from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

/** Try to parse the URL param as a principal, else resolve as a username. */
export function useResolvedProfilePrincipal(param: string | undefined) {
  const { actor } = useActor<Backend>(createActor);
  const { actorReady } = useActorReady();
  const svc = rawService(actor);

  const direct: Principal | null = (() => {
    if (!param) return null;
    try {
      return Principal.fromText(param);
    } catch {
      return null;
    }
  })();

  const usernameQuery = useQuery({
    queryKey: ["profile", "resolve", param],
    queryFn: async (): Promise<Principal | null> => {
      if (!svc || !param) return null;
      const r = await svc.resolveUsername(param);
      return r.length === 1 ? r[0]! : null;
    },
    enabled: !!svc && actorReady && !!param && direct === null,
  });

  if (direct) {
    return { principal: direct, isResolving: false, notFound: false };
  }
  return {
    principal: usernameQuery.data ?? undefined,
    isResolving: usernameQuery.isPending && !!param,
    notFound: usernameQuery.isSuccess && usernameQuery.data === null,
  };
}

export function usePublicProfileFull(principal: Principal | undefined) {
  const { actor, isFetching } = useActor<Backend>(createActor);
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["profile", "full", principal?.toText(), actorReady],
    queryFn: async (): Promise<PublicProfileFull | null> => {
      if (!svc || !principal) return null;
      const r = await svc.getPublicProfileFull(principal);
      return r.length === 1 ? r[0]! : null;
    },
    enabled: !!svc && !isFetching && actorReady && principal !== undefined,
  });
}

export function useSetTop8() {
  const { actor } = useActor<Backend>(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friends: Principal[]) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      await svc.setTop8(friends);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile", "full"] });
    },
  });
}

export function useSetProfileBanner() {
  const { actor } = useActor<Backend>(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      await svc.setProfileBanner(key);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile", "full"] });
    },
  });
}

export function useSetProfileWallpaper() {
  const { actor } = useActor<Backend>(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: string) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      await svc.setProfileWallpaper(value);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile", "full"] });
    },
  });
}

export function useUserPlantsPublic(principal: Principal | undefined) {
  const { actor } = useActor<Backend>(createActor);
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["profile", "plants", principal?.toText()],
    queryFn: async (): Promise<PlantPublic[]> => {
      if (!svc || !principal) return [];
      return svc.getUserPlantsPublic(principal, 0n, 24n);
    },
    enabled: !!svc && actorReady && principal !== undefined,
  });
}
