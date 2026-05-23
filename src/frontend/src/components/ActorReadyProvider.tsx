import type { ReactNode } from "react";
import { ActorReadyContext } from "../hooks/useActorReady";
import { useAuth } from "../hooks/useAuth";

/**
 * Actor is ready when the backend actor exists (anonymous or authenticated).
 * Public pages (Shop, Cookbook, NFT detail, home) query via the anon actor.
 */
export function ActorReadyProvider({ children }: { children: ReactNode }) {
  const { actor, isInitializing } = useAuth();

  return (
    <ActorReadyContext.Provider
      value={{
        actorReady: !!actor && !isInitializing,
        probeError: false,
      }}
    >
      {children}
    </ActorReadyContext.Provider>
  );
}
