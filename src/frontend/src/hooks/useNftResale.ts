import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BuyListedNftResult,
  NftListingPublic,
  PaymentToken,
} from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";
import type { Backend } from "../backend";

function useBackendActor() {
  const { actor } = useActor<Backend>();
  return actor;
}

export function useListedNfts(pepperHeadOnly?: boolean) {
  const actor = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["nftListings", pepperHeadOnly ?? "all", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getListedNfts(
        pepperHeadOnly !== undefined ? [pepperHeadOnly] : [],
      );
    },
    enabled: actorReady,
  });
}

export function useMyNftListings() {
  const actor = useBackendActor();
  const { isAuthenticated } = useAuth();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["myNftListings", actorReady, isAuthenticated],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyNftListings();
    },
    enabled: actorReady && isAuthenticated,
  });
}

export function useListNftForSale() {
  const actor = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tokenId,
      priceUsdCents,
    }: {
      tokenId: bigint;
      priceUsdCents: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.listNftForSale(tokenId, priceUsdCents);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nftListings"] });
      qc.invalidateQueries({ queryKey: ["myNftListings"] });
    },
  });
}

export function useDelistNft() {
  const actor = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.delistNft(tokenId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nftListings"] });
      qc.invalidateQueries({ queryKey: ["myNftListings"] });
    },
  });
}

export function useBuyListedNft() {
  const actor = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tokenId,
      token,
      amount,
    }: {
      tokenId: bigint;
      token: PaymentToken;
      amount: bigint;
    }): Promise<BuyListedNftResult> => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.buyListedNft(tokenId, token, amount);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nftListings"] });
      qc.invalidateQueries({ queryKey: ["myNftListings"] });
      qc.invalidateQueries({ queryKey: ["icrc7_tokens_of"] });
    },
  });
}

export function formatUsdCents(cents: bigint): string {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

export function centsToStablecoinBase(cents: bigint): bigint {
  return cents * 10_000n;
}

export type { NftListingPublic };
