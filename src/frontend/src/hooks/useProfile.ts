/**
 * Phase 7 community profiles — avoids clashing names with `useProfile` exported from `./useBackend`.
 */
import type { ActorSubclass } from "@dfinity/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type {
  SaveProfileInput,
  UserProfilePublic,
  _SERVICE,
} from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";

/** Raw `@dfinity` actor — full Candid types (e.g. `SaveProfileInput` with `location`). */
function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function useCommunityBackendActor() {
  return useActor<Backend>(createActor);
}

export function communityProfilePublicFromOpt(
  value: [] | [UserProfilePublic],
): UserProfilePublic | null {
  return value.length === 0 ? null : value[0]!;
}

export function useMyCommunityProfile() {
  const { actor, isFetching } = useCommunityBackendActor();
  const { actorReady } = useActorReady();

  const svc = rawService(actor);
  const enabled = !!svc && !isFetching && actorReady && actor !== null;

  return useQuery({
    queryKey: ["community", "profile", "me"],
    queryFn: async (): Promise<UserProfilePublic | null> => {
      if (!svc) throw new Error("Backend actor not connected");
      const r = await svc.getCallerUserProfile();
      return communityProfilePublicFromOpt(r);
    },
    enabled,
  });
}

export function usePublicCommunityProfile(principal: Principal | undefined) {
  const { actor, isFetching } = useCommunityBackendActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);

  return useQuery({
    queryKey: ["community", "profile", principal?.toText()],
    queryFn: async (): Promise<UserProfilePublic | null> => {
      if (!svc || !principal) return null;
      const r = await svc.getPublicProfile(principal);
      return communityProfilePublicFromOpt(r);
    },
    enabled: !!svc && !isFetching && actorReady && principal !== undefined,
  });
}

export function useSaveCommunityProfile() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveProfileInput) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.saveCallerUserProfile(input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community", "profile"] });
    },
  });
}

export function useSearchCommunityUsers(search: string, limit = 20n) {
  const { actor } = useCommunityBackendActor();
  const { actorReady } = useActorReady();
  const trimmed = search.trim();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["community", "users", "search", trimmed, limit.toString()],
    queryFn: async (): Promise<UserProfilePublic[]> => {
      if (!svc) throw new Error("Backend actor not connected");
      if (!trimmed.length) return [];
      return svc.searchUsers(trimmed, limit);
    },
    enabled: !!svc && actorReady && trimmed.length > 0,
  });
}
