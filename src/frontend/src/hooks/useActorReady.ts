/**
 * useActorReady — the definitive identity-confirmation gate.
 *
 * ROOT CAUSE (TanStack Query v5 behavioral change):
 *   In TanStack Query v5, `isLoading = isPending && isFetching`.
 *   When a query has `enabled: false`, `isFetching = false`, so `isLoading = false`
 *   even though no data has been fetched. This means UI guards like
 *   `if (isLoading) return <Skeleton />` are BYPASSED while actorReady is false,
 *   causing the onboarding form and missing admin tab to appear prematurely.
 *
 * THE FIX:
 *   1. Expose `actorReady` via React Context so all consumers share ONE
 *      canonical value (no more multiple independent probe instances).
 *   2. Components that check isAdmin/profile must ALSO check actorReady to
 *      distinguish "data confirmed not available" from "data not yet loaded".
 *
 * The underlying mechanism (unchanged):
 *   After authentication conditions appear ready, perform a real backend
 *   round-trip (`getAdminPrincipal`) to CONFIRM the actor is using the
 *   authenticated identity. Only AFTER a successful response do we set
 *   actorReady = true — which unblocks useIsAdmin and useProfile.
 *
 * Sign-out: actorReady immediately resets to false so stale data is never shown.
 *
 * USAGE:
 *   - Wrap your app with <ActorReadyProvider> (from ActorReadyProvider.tsx)
 *   - Call useActorReady() anywhere to get { actorReady }
 *   - In any component that shows/hides UI based on isAdmin or profile:
 *     if (!actorReady && isAuthenticated) => still loading, show skeleton
 *     if (actorReady && !isAdmin) => confirmed not admin
 *     if (actorReady && isAdmin) => confirmed admin, show admin UI
 */

import { createContext, useContext } from "react";

// ─── Context ──────────────────────────────────────────────────────────────────

export interface ActorReadyContextValue {
  actorReady: boolean;
  /** True when the probe timed out after 30s without a confirmed backend response. */
  probeError: boolean;
}

export const ActorReadyContext = createContext<ActorReadyContextValue>({
  actorReady: false,
  probeError: false,
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useActorReady — consumes the shared actorReady value from ActorReadyProvider.
 *
 * CRITICAL: In TanStack Query v5, disabled queries return isLoading=false.
 * Always check actorReady before treating isAdmin=undefined as "not admin".
 *
 * Pattern for loading states:
 *   const { actorReady } = useActorReady();
 *   const { isAuthenticated } = useAuth();
 *   const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
 *
 *   const adminCheckPending = isAuthenticated && (!actorReady || isAdminLoading);
 *   // Use adminCheckPending as the loading guard instead of isAdminLoading alone.
 */
export function useActorReady(): ActorReadyContextValue {
  return useContext(ActorReadyContext);
}
