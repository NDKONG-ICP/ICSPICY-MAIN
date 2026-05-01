import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Identity } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";

export interface AuthState {
  identity: Identity | undefined;
  principal: Principal | undefined;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: () => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const { identity, login, clear, isInitializing } = useInternetIdentity();

  const principal = identity?.getPrincipal();
  const isAuthenticated = Boolean(
    identity && !identity.getPrincipal().isAnonymous(),
  );

  return {
    identity,
    principal,
    isAuthenticated,
    isInitializing,
    login,
    logout: clear,
  };
}
