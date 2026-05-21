import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Backend } from "../backend";
import {
  dismissNft,
  filterUndismissedNfts,
} from "../lib/nims-adoption-dismiss";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useMyNftTokenIds } from "./useMyNftIds";

/** Owned IC SPICY NFT token IDs that do not yet have a NIMS plant record. */
export function useUnadoptedNftTokenIds() {
  const { data: tokenIds = [], isLoading: nftsLoading } = useMyNftTokenIds();
  const { actor } = useActor<Backend>();
  const { actorReady } = useActorReady();
  const [dismissedVersion, setDismissedVersion] = useState(0);

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

  const dismissUnadoptedNft = useCallback((tokenId: bigint) => {
    dismissNft(tokenId.toString());
    setDismissedVersion((v) => v + 1);
  }, []);

  const data = useMemo(() => {
    void dismissedVersion;
    return filterUndismissedNfts(query.data ?? []);
  }, [query.data, dismissedVersion]);

  return {
    ...query,
    data,
    dismissUnadoptedNft,
    isLoading: nftsLoading || query.isLoading,
  };
}
