/**
 * On-chain notification inbox — unread badge polling + fetch/mark-read.
 */
import type { ActorSubclass } from "@dfinity/agent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type {
  AdminUserPage,
  NotificationPublic,
  _SERVICE,
} from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useAuth } from "./useAuth";
import { useActorReady } from "./useActorReady";
import { useIsAdmin } from "./useBackend";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

export function useUnreadNotificationCount() {
  const { isAuthenticated } = useAuth();
  const { actor } = useActor<Backend>(createActor);
  const { actorReady } = useActorReady();
  const svc = rawService(actor);

  return useQuery({
    queryKey: ["notifications", "unread", actorReady],
    queryFn: async (): Promise<number> => {
      if (!svc) return 0;
      const count = await svc.getUnreadCount();
      return Number(count);
    },
    enabled: !!svc && actorReady && isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMyNotifications(enabled: boolean, limit = 30n) {
  const { actor } = useActor<Backend>(createActor);
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const svc = rawService(actor);

  return useQuery({
    queryKey: ["notifications", "inbox", limit.toString()],
    queryFn: async (): Promise<NotificationPublic[]> => {
      if (!svc) return [];
      return svc.getMyNotifications(0n, limit);
    },
    enabled: !!svc && actorReady && isAuthenticated && enabled,
    staleTime: 10_000,
  });
}

export function useMarkNotificationsRead() {
  const { actor } = useActor<Backend>(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (upToId: bigint) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      await svc.markNotificationsRead(upToId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useAdminListUsers(
  search: string,
  offset: bigint,
  limit: bigint,
) {
  const { actor } = useActor<Backend>(createActor);
  const { actorReady } = useActorReady();
  const { data: isAdmin } = useIsAdmin();
  const svc = rawService(actor);
  const trimmed = search.trim();

  return useQuery({
    queryKey: [
      "admin",
      "users",
      trimmed,
      offset.toString(),
      limit.toString(),
      actorReady,
    ],
    queryFn: async (): Promise<AdminUserPage> => {
      if (!svc) throw new Error("Not connected");
      return svc.adminListUsers(offset, limit, trimmed);
    },
    enabled: !!svc && actorReady && isAdmin === true,
    staleTime: 15_000,
  });
}

export function useAdminSendNotification() {
  const { actor } = useActor<Backend>(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipient,
      message,
    }: {
      recipient: import("@icp-sdk/core/principal").Principal;
      message: string;
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.adminSendNotification(recipient, message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
