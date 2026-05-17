import type { Identity } from "@icp-sdk/core/agent";
import { Principal } from "@icp-sdk/core/principal";
import {
  useAuth as useIdentityKitAuth,
  useIdentity,
  useIsInitializing,
} from "@nfid/identitykit/react";

export interface AuthState {
  identity: Identity | undefined;
  principal: Principal | undefined;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: () => void;
  logout: () => void;
}

/** Maps IdentityKit state to the legacy `useAuth` shape used across the app. */
export function useWalletAuth(): AuthState {
  const { user, isConnecting, connect, disconnect } = useIdentityKitAuth();
  const rawIdentity = useIdentity();
  const kitInitializing = useIsInitializing();

  const identity = rawIdentity as Identity | undefined;

  const principalFromUser = user?.principal
    ? Principal.fromText(user.principal.toText())
    : undefined;

  const principalFromIdentity =
    rawIdentity && typeof rawIdentity.getPrincipal === "function"
      ? Principal.fromText(rawIdentity.getPrincipal().toText())
      : undefined;

  const principal = principalFromUser ?? principalFromIdentity;

  const isAuthenticated = Boolean(
    principal && !principal.isAnonymous(),
  );

  return {
    identity,
    principal,
    isAuthenticated,
    isInitializing: kitInitializing || isConnecting,
    login: () => {
      void connect();
    },
    logout: () => {
      void disconnect();
    },
  };
}
