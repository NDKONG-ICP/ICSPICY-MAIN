import type { ActorSubclass } from "@dfinity/agent";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type { PostId, _SERVICE } from "../declarations/backend.did";
import { sendTokens } from "../lib/ledger-transfer";
import { PAYMENT_LEDGERS, type PaymentTokenSymbol } from "../lib/token-payment";
import { useActor } from "./useActor";
import { useAuth } from "./useAuth";
import { invalidateCommunityFeeds, invalidatePostDetail } from "./usePost";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function useCommunityBackendActor() {
  return useActor<Backend>(createActor);
}

export interface SendCommunityTipVars {
  postId: PostId;
  recipientPrincipalText: string;
  token: PaymentTokenSymbol;
  amount: bigint;
}

/**
 * Sends ICRC-1 transfer to author then calls `recordTip` for feed accounting.
 */
export function useSendTip() {
  const { actor } = useCommunityBackendActor();
  const { identity } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: SendCommunityTipVars) => {
      if (!identity) throw new Error("Sign in to tip");

      const ledgerId = PAYMENT_LEDGERS[vars.token];

      const blockIndex = await sendTokens(
        identity,
        ledgerId,
        vars.recipientPrincipalText,
        vars.amount,
      );

      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");

      const ok = await svc.recordTip({
        post_id: vars.postId,
        block_index: blockIndex,
        ledger_canister_id: ledgerId,
        amount: vars.amount,
      });
      if (!ok) throw new Error("Backend did not record tip");
      return ok;
    },
    onSuccess: (_ok, vars) => {
      invalidateCommunityFeeds(qc);
      invalidatePostDetail(qc, vars.postId);
    },
  });
}
