import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import { useOisyWallet } from "../providers/OisyWalletProvider";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

export type NftDiscount = {
  discountPercent: number;
  rarity: string;
  tokenId: bigint | null;
};

const EMPTY: NftDiscount = {
  discountPercent: 0,
  rarity: "none",
  tokenId: null,
};

export function useNftDiscount() {
  const { isAuthenticated } = useAuth();
  const { actor } = useActor<import("../backend").Backend>(createActor);
  const { actorReady } = useActorReady();
  const { isOisyConnected, oisyBackendWrapped } = useOisyWallet();

  // Primary query: II actor (checks II principal + all linked wallets via backend)
  const iiQuery = useQuery({
    queryKey: ["nftDiscount", actorReady],
    queryFn: async (): Promise<NftDiscount> => {
      if (!actor) return EMPTY;
      const result = await actor.getCallerDiscount();
      return {
        discountPercent: Number(result.discountPercent),
        rarity: result.rarity,
        tokenId:
          result.tokenId !== undefined && result.tokenId !== null
            ? BigInt(result.tokenId)
            : null,
      };
    },
    enabled: !!actor && actorReady && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Fallback query: OISY actor — used when II is not authenticated.
  // getCallerDiscount is a query call (no popup needed) with caller = OISY principal.
  // The backend checks the OISY principal's own NFTs directly.
  const oisyQuery = useQuery({
    queryKey: ["nftDiscountOisy", isOisyConnected],
    queryFn: async (): Promise<NftDiscount> => {
      if (!oisyBackendWrapped) return EMPTY;
      try {
        const result = await oisyBackendWrapped.getCallerDiscount();
        return {
          discountPercent: Number(result.discountPercent),
          rarity: result.rarity,
          tokenId:
            result.tokenId !== undefined && result.tokenId !== null
              ? BigInt(result.tokenId)
              : null,
        };
      } catch {
        return EMPTY;
      }
    },
    // Only run when OISY is connected AND II is NOT (avoid double-counting)
    enabled: isOisyConnected && !isAuthenticated && !!oisyBackendWrapped,
    staleTime: 5 * 60 * 1000,
  });

  // Use II result when available; fall back to OISY result for OISY-only users.
  const active = isAuthenticated ? iiQuery : oisyQuery;

  return {
    discountPercent: active.data?.discountPercent ?? 0,
    rarity: active.data?.rarity ?? "none",
    tokenId: active.data?.tokenId ?? null,
    isLoading: active.isLoading,
  };
}
