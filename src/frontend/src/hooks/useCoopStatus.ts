import type { ActorSubclass } from "@dfinity/agent";
import { useQuery } from "@tanstack/react-query";
import type { _SERVICE } from "../declarations/backend.did";
import { useAuth } from "./useAuth";
import { useBackendActor } from "./useBackend";
import { useRavenPerks } from "./useRavenPerks";

export type CoopStatus = {
  tokenId: bigint;
  seat: {
    activatedAt: bigint;
    growerName: [] | [string];
    growerLocation: [] | [string];
    licenseInfo: [] | [string];
    revoked: boolean;
  };
};

function rawActor(
  actor: import("../backend").Backend | null,
): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

export function useCoopStatus() {
  const { isAuthenticated } = useAuth();
  const { actor } = useBackendActor();
  const svc = rawActor(actor);

  const query = useQuery({
    queryKey: ["coopStatus", isAuthenticated],
    enabled: isAuthenticated && svc != null,
    queryFn: async (): Promise<CoopStatus | null> => {
      if (!svc) return null;
      const res = await svc.getMyCoopStatus();
      if (res.length === 0) return null;
      const s = res[0]!;
      return {
        tokenId: s.tokenId,
        seat: {
          activatedAt: s.seat.activatedAt,
          growerName: s.seat.growerName,
          growerLocation: s.seat.growerLocation,
          licenseInfo: s.seat.licenseInfo,
          revoked: s.seat.revoked,
        },
      };
    },
    staleTime: 60_000,
  });

  const status = query.data ?? null;
  const growerName =
    status?.seat.growerName.length === 1 ? status.seat.growerName[0] : null;
  const needsOnboarding = status != null && growerName == null;

  return {
    ...query,
    status,
    isSeatHolder: status != null && !status.seat.revoked,
    growerName,
    needsOnboarding,
  };
}

export function useCoopSeatsRemaining() {
  const { actor } = useBackendActor();
  const svc = rawActor(actor);
  return useQuery({
    queryKey: ["coopSeatsRemaining"],
    queryFn: async () => {
      if (!svc) throw new Error("Backend not ready");
      return svc.getCoopSeatsRemaining();
    },
    staleTime: 30_000,
    retry: 2,
  });
}

export function useCoopSeatPrice() {
  const { actor } = useBackendActor();
  const svc = rawActor(actor);
  return useQuery({
    queryKey: ["coopSeatPrice"],
    queryFn: async () => {
      if (!svc) return 25_000n;
      return svc.getCoopSeatPriceCents();
    },
    staleTime: 120_000,
  });
}

export function useGrowerDirectory() {
  const { actor } = useBackendActor();
  const svc = rawActor(actor);
  return useQuery({
    queryKey: ["growerDirectory"],
    queryFn: async () => {
      if (!svc) return [];
      return svc.listGrowerDirectory();
    },
    staleTime: 60_000,
  });
}

/** Seat holders unlock Raven Member NIMS perks (analytics, CSV, weather history). */
export function useEffectiveRavenPerks() {
  const raven = useRavenPerks();
  const { isSeatHolder, isLoading: coopLoading } = useCoopStatus();

  if (coopLoading || raven.isLoading || !isSeatHolder) {
    return raven;
  }

  return {
    ...raven,
    tier: raven.tier === "pro" ? ("pro" as const) : ("member" as const),
    discount: Math.max(raven.discount, 5),
    hasAdvancedAnalytics: true,
    hasCsvExport: true,
    hasUnlimitedWeatherHistory: true,
    hasExpandedGarden: true,
  };
}
