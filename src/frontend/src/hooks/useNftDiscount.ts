import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import { useOisyWallet } from "../providers/OisyWalletProvider";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";
import { useNftTokenIdsForPrincipal } from "./useMyNftIds";

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

/**
 * Mirror of lib/nft-discount.mo discountForToken — token ID ranges → discount tier.
 * 1-5000: 5% common, 5001-7838: 7% uncommon,
 * 7839-7888: 15% founder_pepperhead, 7889-8726: 10% rare_pepperhead,
 * 8727-8888: 10% rare, else 0% none.
 */
export function discountForTokenId(tokenId: bigint): { pct: number; rarity: string } {
  const id = Number(tokenId);
  if (id >= 1 && id <= 5000) return { pct: 5, rarity: "common" };
  if (id >= 5001 && id <= 7838) return { pct: 7, rarity: "uncommon" };
  if (id >= 7839 && id <= 7888) return { pct: 15, rarity: "founder_pepperhead" };
  if (id >= 7889 && id <= 8726) return { pct: 10, rarity: "rare_pepperhead" };
  if (id >= 8727 && id <= 8888) return { pct: 10, rarity: "rare" };
  return { pct: 0, rarity: "none" };
}

/** Client-side best discount across an array of token IDs — mirrors backend bestFromTokenIds. */
function bestFromTokenIds(tokenIds: bigint[]): NftDiscount {
  let best: NftDiscount = EMPTY;
  for (const id of tokenIds) {
    const { pct, rarity } = discountForTokenId(id);
    if (pct > best.discountPercent) {
      best = { discountPercent: pct, rarity, tokenId: id };
    }
  }
  return best;
}

export function useNftDiscount() {
  const { isAuthenticated } = useAuth();
  const { actor } = useActor<import("../backend").Backend>(createActor);
  const { actorReady } = useActorReady();
  const { isOisyConnected, oisyPrincipal } = useOisyWallet();

  // Primary query: II actor — backend checks II principal + ALL linked wallets server-side.
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

  // OISY-only fallback: public icrc7_tokens_of query — no OISY signer popup.
  // Discount calculated client-side from token IDs using the same rarity map as the backend.
  const oisyNfts = useNftTokenIdsForPrincipal(
    isOisyConnected && !isAuthenticated
      ? (oisyPrincipal as import("@dfinity/principal").Principal | undefined)
      : undefined,
  );

  if (isAuthenticated) {
    return {
      discountPercent: iiQuery.data?.discountPercent ?? 0,
      rarity: iiQuery.data?.rarity ?? "none",
      tokenId: iiQuery.data?.tokenId ?? null,
      isLoading: iiQuery.isLoading,
    };
  }

  // OISY-only path: derive discount from public NFT query result
  if (isOisyConnected) {
    const computed = oisyNfts.data ? bestFromTokenIds(oisyNfts.data) : EMPTY;
    return {
      discountPercent: computed.discountPercent,
      rarity: computed.rarity,
      tokenId: computed.tokenId,
      isLoading: oisyNfts.isLoading,
    };
  }

  return {
    discountPercent: 0,
    rarity: "none",
    tokenId: null,
    isLoading: false,
  };
}
