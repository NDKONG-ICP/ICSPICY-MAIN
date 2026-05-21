import { useQuery } from "@tanstack/react-query";
import type { Backend } from "../backend";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useMyNftTokenIds } from "./useMyNftIds";

/** Owned IC SPICY NFT token IDs that do not yet have a NIMS plant record. */
export function useUnadoptedNftTokenIds() {
  const { data: tokenIds = [], isLoading: nftsLoading } = useMyNftTokenIds();
  const { actor } = useActor<Backend>();
  const { actorReady } = useActorReady();

  const idsKey = tokenIds.map((id) => id.toString()).join(",");

  const query = useQuery({
    queryKey: ["unadoptedNfts", idsKey, actorReady],
    enabled: actorReady && !!actor && tokenIds.length > 0,
    queryFn: async () => {
      if (!actor) return [];
      const unadopted: bigint[] = [];
      for (const id of tokenIds) {
        const lc = await actor.getPlantByNft(id);
        if (lc == null) unadopted.push(id);
      }
      return unadopted;
    },
  });

  return {
    ...query,
    isLoading: nftsLoading || query.isLoading,
  };
}
