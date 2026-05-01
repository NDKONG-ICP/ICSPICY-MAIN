import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type {
  SendTokenInput,
  WalletToken,
  WalletTransaction,
} from "../backend";

function useBackendActor() {
  return useActor(createActor);
}

export function useWalletBalances() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<WalletToken[]>({
    queryKey: ["walletBalances"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWalletBalances();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useWalletTransactions() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<WalletTransaction[]>({
    queryKey: ["walletTransactions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWalletTransactions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSendToken() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendTokenInput) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.sendToken(input);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walletBalances"] });
      qc.invalidateQueries({ queryKey: ["walletTransactions"] });
    },
  });
}

export function useWalletAddress() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<string>({
    queryKey: ["walletAddress"],
    queryFn: async () => {
      if (!actor) return "";
      return actor.getWalletAddress();
    },
    enabled: !!actor && !isFetching,
  });
}
