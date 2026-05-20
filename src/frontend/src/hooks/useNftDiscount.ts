import { useQuery } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { createActor } from "../backend";
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

  const query = useQuery({
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

  return {
    discountPercent: query.data?.discountPercent ?? 0,
    rarity: query.data?.rarity ?? "none",
    tokenId: query.data?.tokenId ?? null,
    isLoading: query.isLoading,
  };
}
