import type { ActorSubclass } from "@dfinity/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Backend } from "../backend";
import { type OrderId, OrderStatus } from "../backend";
import { createActor } from "../backend";
import type {
  Account,
  AdminOrderPublic,
  AdminOrderStatusFilter,
  ClaimTokenAdminPublic,
  Icrc7PoolStats,
  Icrc7TokenAdminPublic,
  Icrc7TokenFilter,
  _SERVICE,
} from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useIsAdmin } from "./useBackend";

export type AdminBatchAirdropRow = {
  recipient: Principal;
  token_id: bigint;
  success: boolean;
  message: string;
};

export type {
  AdminOrderItemPublic,
  AdminOrderPublic,
  AdminOrderStatusFilter,
  ClaimTokenAdminPublic,
  Icrc7PoolStats,
  Icrc7TokenAdminPublic,
  Icrc7TokenFilter,
} from "../declarations/backend.did";

/** Raw `@dfinity` actor behind the `Backend` envelope (methods absent from bindgen wrapper). */
function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function assertTransferOk(result: unknown): { blockIndex: bigint } {
  if (
    typeof result === "object" &&
    result !== null &&
    "Ok" in result &&
    typeof (result as { Ok?: unknown }).Ok === "bigint"
  ) {
    return { blockIndex: (result as { Ok: bigint }).Ok };
  }
  if (
    typeof result === "object" &&
    result !== null &&
    "Err" in result &&
    (result as { Err?: unknown }).Err !== undefined
  ) {
    const errPayload = (result as { Err: unknown }).Err;
    throw new Error(
      typeof errPayload === "object"
        ? JSON.stringify(errPayload)
        : String(errPayload),
    );
  }
  throw new Error("Unexpected transfer response from canister.");
}

/** Re-export — exists in `useBackend`; kept here per admin shop tooling surface. */
export { useAuditLog } from "./useBackend";

function useBackendActor() {
  return useActor<Backend>(createActor);
}

/** Stable key fragment for TanStack Query (ICRC-7 pool token filter variant). */
export function icrc7TokenFilterKey(f: Icrc7TokenFilter): string {
  if ("All" in f) return "All";
  if ("Available" in f) return "Available";
  if ("Assigned" in f) return "Assigned";
  if ("Sold" in f) return "Sold";
  if ("PepperHead" in f) return "PepperHead";
  return "Missing";
}

export function useIcrc7PoolStatsAdmin() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["admin", "icrc7PoolStats", actorReady],
    queryFn: async (): Promise<Icrc7PoolStats> => {
      if (!svc) throw new Error("Backend actor not connected");
      return svc.getIcrc7PoolStatsAdmin();
    },
    enabled: !!svc && actorReady,
  });
}

export function useIcrc7PoolTokensAdmin(
  filter: Icrc7TokenFilter,
  offset: bigint,
  limit: bigint,
) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: [
      "admin",
      "icrc7PoolTokens",
      icrc7TokenFilterKey(filter),
      offset.toString(),
      limit.toString(),
      actorReady,
    ],
    queryFn: async (): Promise<Array<Icrc7TokenAdminPublic>> => {
      if (!svc) throw new Error("Backend actor not connected");
      return svc.listIcrc7PoolTokensAdmin(filter, offset, limit);
    },
    enabled: !!svc && actorReady && limit > 0n,
  });
}

export function useAdminTransferFromPool() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tokenId,
      to,
      subaccount,
    }: {
      tokenId: bigint;
      to: Principal;
      subaccount?: Uint8Array | number[];
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");

      const acct: Account = {
        owner: to as unknown as Account["owner"],
        subaccount: subaccount?.length ? [subaccount] : [],
      };
      const result = await svc.adminTransferFromPool(tokenId, acct);
      const { blockIndex } = assertTransferOk(result);
      return { blockIndex, tokenId, to };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["auditLog"] });
      void qc.invalidateQueries({ queryKey: ["admin", "icrc7PoolStats"] });
      void qc.invalidateQueries({ queryKey: ["admin", "icrc7PoolTokens"] });
      void qc.invalidateQueries({ queryKey: ["icrc7_tokens_of"] });
    },
  });
}

export function useAdminBatchAirdrop() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipients,
      useRandom,
      startTokenId,
    }: {
      recipients: Principal[];
      useRandom: boolean;
      startTokenId?: bigint | null;
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      const startOpt: [] | [bigint] =
        startTokenId !== undefined && startTokenId !== null
          ? [startTokenId]
          : [];
      const rows = await svc.adminBatchAirdrop(recipients, useRandom, startOpt);
      return rows as AdminBatchAirdropRow[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auditLog"] }),
  });
}

export function useAdminReturnToPool() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tokenId }: { tokenId: bigint }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      const result = await svc.adminReturnToPool(tokenId);
      const { blockIndex } = assertTransferOk(result);
      return blockIndex;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["auditLog"] });
      void qc.invalidateQueries({ queryKey: ["admin", "icrc7PoolStats"] });
      void qc.invalidateQueries({ queryKey: ["admin", "icrc7PoolTokens"] });
      void qc.invalidateQueries({ queryKey: ["icrc7_tokens_of"] });
    },
  });
}

// ─── Shop orders (admin list + status updates) ───────────────────────────────

function toCandidOrderStatus(
  status: OrderStatus,
): import("../declarations/backend.did").OrderStatus {
  switch (status) {
    case OrderStatus.Pending:
      return { Pending: null };
    case OrderStatus.Shipped:
      return { Shipped: null };
    case OrderStatus.PickedUp:
      return { PickedUp: null };
    case OrderStatus.Cancelled:
      return { Cancelled: null };
  }
}

export function adminFilterKey(f: AdminOrderStatusFilter): string {
  if ("All" in f) return "All";
  if ("Pending" in f) return "Pending";
  if ("Paid" in f) return "Paid";
  if ("PickedUp" in f) return "PickedUp";
  if ("Shipped" in f) return "Shipped";
  return "Cancelled";
}

function computeAdminOrderCounts(orders: AdminOrderPublic[]) {
  let pending = 0;
  let paid = 0;
  let pickedUp = 0;
  let shipped = 0;
  let cancelled = 0;
  for (const o of orders) {
    const isPending = "Pending" in o.status;
    if (isPending) {
      if (o.is_paid) paid += 1;
      else pending += 1;
    } else if ("PickedUp" in o.status) pickedUp += 1;
    else if ("Shipped" in o.status) shipped += 1;
    else if ("Cancelled" in o.status) cancelled += 1;
  }
  return {
    all: orders.length,
    pending,
    paid,
    pickedUp,
    shipped,
    cancelled,
  };
}

export function useAdminOrders(filter: AdminOrderStatusFilter) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  const fk = adminFilterKey(filter);
  return useQuery({
    queryKey: ["adminOrders", fk],
    queryFn: async () => {
      if (!svc) return [];
      return svc.listAllOrdersAdmin(filter);
    },
    enabled: !!svc && actorReady,
  });
}

/** Derives tab counts from `listAllOrdersAdmin(#All)` (shared query with the All filter). */
export function useAdminOrderCounts() {
  const list = useAdminOrders({ All: null });
  const counts = useMemo(
    () => computeAdminOrderCounts(list.data ?? []),
    [list.data],
  );
  return { counts, isLoading: list.isLoading, isPending: list.isPending };
}

export function useUpdateOrderStatusAdmin() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: OrderId;
      status: OrderStatus;
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      await svc.updateOrderStatusAdmin(orderId, toCandidOrderStatus(status));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["adminOrders"] });
      void qc.invalidateQueries({ queryKey: ["admin", "newOrderCount"] });
    },
  });
}

export function useNewOrderCountAdmin() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const { data: isAdmin } = useIsAdmin();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["admin", "newOrderCount", actorReady],
    queryFn: async (): Promise<number> => {
      if (!svc) return 0;
      const count = await svc.getNewOrderCount();
      return Number(count);
    },
    enabled: !!svc && actorReady && isAdmin === true,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMarkOrdersSeenAdmin() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (upToOrderId: OrderId) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      await svc.markOrdersSeen(upToOrderId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "newOrderCount"] });
    },
  });
}

// ─── QR claim tokens (NFT labels tab) ────────────────────────────────────────

/** `listClaimTokensAdmin` optional search (`[]` ⇒ no substring filter). */
export function claimTokenAdminSearchOpt(trimmed: string): [] | [string] {
  return trimmed ? [trimmed] : [];
}

export function useClaimTokensAdmin(search: string) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  const trimmed = search.trim();
  const opt = claimTokenAdminSearchOpt(trimmed);

  return useQuery({
    queryKey: ["admin", "claimTokens", trimmed],
    queryFn: async (): Promise<Array<ClaimTokenAdminPublic>> => {
      if (!svc) return [];
      return svc.listClaimTokensAdmin(opt);
    },
    enabled: !!svc && actorReady,
    staleTime: 15_000,
  });
}

export function useRevokeClaimTokenAdmin() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.revokeClaimTokenAdmin(token);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "claimTokens"] });
      void qc.invalidateQueries({ queryKey: ["auditLog"] });
    },
  });
}

/** Arm a printed QR claim token at the point of sale (default 72h window). */
export function useArmClaimToken() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.armClaimToken(token, []);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "claimTokens"] });
      void qc.invalidateQueries({ queryKey: ["auditLog"] });
    },
  });
}

/** Disarm a claim token (armed by mistake / sale fell through). */
export function useDisarmClaimToken() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.disarmClaimToken(token);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "claimTokens"] });
      void qc.invalidateQueries({ queryKey: ["auditLog"] });
    },
  });
}

export function useGenerateClaimTokens() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      nftTokenIds: bigint[],
    ): Promise<Array<{ tokenId: bigint; claimToken: string }>> => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      if (nftTokenIds.length === 0) return [];
      return svc.generateClaimTokens(nftTokenIds);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "claimTokens"] });
      void qc.invalidateQueries({ queryKey: ["auditLog"] });
    },
  });
}
