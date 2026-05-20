import type { ReactNode } from "react";
import { ActorReadyContext } from "../hooks/useActorReady";
import { useAuth } from "../hooks/useAuth";

/**
 * Actor is ready when Internet Identity session and backend actor exist.
 * use-auth-client builds the actor; no probe/backoff needed.
 */
export function ActorReadyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, actor } = useAuth();

  return (
    <ActorReadyContext.Provider
      value={{
        actorReady: isAuthenticated && !!actor,
        probeError: false,
      }}
    >
      {children}
    </ActorReadyContext.Provider>
  );
}
