import { useAuthClient } from "@dfinity/use-auth-client";
import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import { Principal } from "@icp-sdk/core/principal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { Backend, ExternalBlob } from "../backend";
import type { _SERVICE } from "../declarations/backend.did";
import { idlFactory } from "../declarations/backend.did.js";
import {
  BACKEND_CANISTER_ID,
  IC_HOST,
  II_DERIVATION_ORIGIN,
  II_PROVIDER,
} from "../lib/auth-config";

async function uploadFile(file: ExternalBlob): Promise<Uint8Array> {
  return file.getBytes();
}

async function downloadFile(bytes: Uint8Array): Promise<ExternalBlob> {
  return ExternalBlob.fromBytes(bytes as Uint8Array<ArrayBuffer>);
}

export interface AuthState {
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: () => void;
  logout: () => void;
  actor: Backend | null;
  identity: Identity | null;
  principal: Principal | undefined;
}

const AuthContext = createContext<AuthState | null>(null);

export function ICSpicyAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    isAuthenticated,
    login: authLogin,
    logout: authLogout,
    identity,
    authClient,
  } = useAuthClient({
    createOptions: {
      idleOptions: {
        disableIdle: true,
        disableDefaultIdleCallback: true,
      },
    },
    loginOptions: {
      identityProvider: II_PROVIDER,
      derivationOrigin: II_DERIVATION_ORIGIN,
    },
  });

  const principal = useMemo(() => {
    if (!identity) return undefined;
    const p = identity.getPrincipal();
    if (p.isAnonymous()) return undefined;
    return Principal.fromText(p.toText());
  }, [identity]);

  const principalText = principal?.toText() ?? "anon";

  const actorQuery = useQuery({
    queryKey: ["auth-backend-actor", principalText],
    queryFn: async () => {
      const agent = await HttpAgent.create({
        host: IC_HOST,
        identity: identity ?? undefined,
      });

      if (import.meta.env.DEV) {
        await agent.fetchRootKey();
      }

      const rawActor = Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      return new Backend(rawActor, uploadFile, downloadFile);
    },
    enabled: authClient != null,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!actorQuery.data) return;
    queryClient.invalidateQueries({
      predicate: (q) => !q.queryKey.includes("auth-backend-actor"),
    });
  }, [actorQuery.data, queryClient]);

  const isInitializing =
    authClient == null || actorQuery.isFetching || actorQuery.isPending;

  const login = useCallback(() => {
    void authLogin();
  }, [authLogin]);

  const logout = useCallback(() => {
    void authLogout().then(() => {
      queryClient.clear();
    });
  }, [authLogout, queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated: isAuthenticated && !!principal,
      isInitializing,
      login,
      logout,
      actor: actorQuery.data ?? null,
      identity: identity as Identity | null,
      principal,
    }),
    [
      isAuthenticated,
      principal,
      isInitializing,
      login,
      logout,
      actorQuery.data,
      identity,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within ICSpicyAuthProvider");
  }
  return ctx;
}

/** @internal canister id used by auth setup */
export { BACKEND_CANISTER_ID };
