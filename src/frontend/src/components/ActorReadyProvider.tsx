/**
 * ActorReadyProvider — singleton provider that runs the backend identity probe
 * ONCE per authenticated principal and shares the result via context.
 *
 * CHROME FIX (full-page redirect):
 *   Internet Identity uses a full-page redirect in Chrome (not a popup).
 *   After the redirect, the app restarts completely. IndexedDB restores the
 *   auth state, but there is a critical timing window:
 *
 *   1. Page loads fresh → isInitializing=true, actor may still be anonymous
 *   2. IndexedDB restore completes → isInitializing=false, isAuthenticated=true
 *   3. useActor re-initializes the HttpAgent with the new identity
 *   4. ONLY AFTER step 3 is the actor safe to use for identity-sensitive calls
 *
 *   The previous code could start the probe between steps 2 and 3, sending
 *   the probe with an actor that still had anonymous identity — causing the
 *   backend to return anonymous results and actorReady to be set with stale data.
 *
 * THE FIX:
 *   - Never start the probe while isInitializing=true
 *   - When isAuthenticated=false and isInitializing=false, immediately set
 *     actorReady=false (no probe needed — user is logged out)
 *   - Reset actorReady=false and re-run probe when principal changes
 *   - Use getAdminPrincipals() as the probe (never traps, works for all callers)
 *
 * PROBE STRATEGY:
 *   getAdminPrincipals() — pure query, no state side-effects, works for
 *   anonymous AND authenticated callers, never traps. A successful response
 *   proves the HttpAgent can reach the canister with the current identity.
 *
 *   After probe succeeds, call ensureAdminProfile() / ensureCallerProfile()
 *   to seed roles and profiles so downstream queries work correctly.
 */

import { useActor } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { createActor } from "../backend";
import { ActorReadyContext } from "../hooks/useActorReady";
import { useAuth } from "../hooks/useAuth";

const ADMIN_PIDS = [
  "lgjjr-4bwun-koggr-pornj-ltxia-m4xxo-iy7mg-cct7e-okxub-mbxku-tae",
  "7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh",
  "7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh-qae",
];

function isAdminPrincipal(raw: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (ADMIN_PIDS.includes(raw) || ADMIN_PIDS.includes(trimmed)) return true;
  if (ADMIN_PIDS.some((p) => p.toLowerCase() === lower)) return true;
  if (ADMIN_PIDS.some((p) => trimmed.startsWith(p) || p.startsWith(trimmed)))
    return true;
  return false;
}

// Exponential backoff delays (ms): 500, 1000, 2000, 4000, 4000...
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 4000;
const PROBE_TIMEOUT_MS = 30_000;

export function ActorReadyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isInitializing, principal } = useAuth();
  const { actor, isFetching: actorFetching } = useActor(createActor);
  const queryClient = useQueryClient();

  const [actorReady, setActorReady] = useState(false);
  const [probeError, setProbeError] = useState(false);

  const confirmedPrincipalRef = useRef<string | null>(null);
  const probeRunningRef = useRef(false);
  const prevPrincipalRef = useRef<string>("anon");

  const principalText = principal?.toText() ?? "anon";
  const isAnon = !principal || principal.isAnonymous();

  // ── EFFECT 1: Handle sign-out and principal changes ──────────────────────
  // When the user signs out OR the principal changes, immediately reset
  // actorReady so stale state is never shown for the new identity.
  useEffect(() => {
    // Case A: user signed out (or not yet authenticated)
    if (!isInitializing && (!isAuthenticated || isAnon)) {
      if (actorReady || confirmedPrincipalRef.current !== null) {
        console.log(
          "[ActorReadyProvider] Sign-out detected — resetting actorReady",
        );
        setActorReady(false);
        setProbeError(false);
        confirmedPrincipalRef.current = null;
        probeRunningRef.current = false;
        prevPrincipalRef.current = "anon";

        // Clear all identity-sensitive query cache on sign-out.
        queryClient.clear();
      }
      return;
    }

    // Case B: principal changed (e.g. different II identity used)
    if (!isInitializing && isAuthenticated && !isAnon) {
      if (
        prevPrincipalRef.current !== "anon" &&
        prevPrincipalRef.current !== principalText
      ) {
        console.log(
          "[ActorReadyProvider] Principal changed from",
          prevPrincipalRef.current,
          "to",
          principalText,
          "— resetting for re-probe",
        );
        setActorReady(false);
        setProbeError(false);
        confirmedPrincipalRef.current = null;
        probeRunningRef.current = false;
        queryClient.clear();
      }
      prevPrincipalRef.current = principalText;
    }
  }, [
    isInitializing,
    isAuthenticated,
    isAnon,
    principalText,
    actorReady,
    queryClient,
  ]);

  // ── PROBE FUNCTION ────────────────────────────────────────────────────────
  const runProbe = useCallback(async () => {
    if (!actor) return;

    const probePrincipal = principalText;
    const startTime = Date.now();
    let attempt = 0;

    console.log(
      "[ActorReadyProvider] Starting probe for principal:",
      probePrincipal,
      "| isAdmin?",
      isAdminPrincipal(probePrincipal),
    );

    while (true) {
      // Abort if probe was cancelled (sign-out, principal change)
      if (!probeRunningRef.current) {
        console.log(
          "[ActorReadyProvider] Probe aborted (probeRunningRef=false)",
        );
        return;
      }
      // Abort if principal changed since probe started
      if (principalText !== probePrincipal) {
        console.log(
          "[ActorReadyProvider] Probe aborted (principal changed from",
          probePrincipal,
          "to",
          principalText,
          ")",
        );
        probeRunningRef.current = false;
        return;
      }

      try {
        // Use getAdminPrincipals() as the connectivity probe.
        // Pure query — never traps, works for all callers, proves connectivity.
        await actor.getAdminPrincipals();

        console.log(
          "[ActorReadyProvider] Probe succeeded for principal:",
          probePrincipal,
        );

        // Seed admin profile if this is an admin PID.
        if (isAdminPrincipal(probePrincipal)) {
          try {
            await actor.ensureAdminProfile();
            console.log(
              "[ActorReadyProvider] ensureAdminProfile() succeeded for:",
              probePrincipal,
            );
          } catch (err) {
            console.warn(
              "[ActorReadyProvider] ensureAdminProfile() failed (non-fatal):",
              err,
            );
          }
        }

        // Seed minimal profile for every authenticated caller (idempotent).
        try {
          await actor.ensureCallerProfile();
        } catch {
          // Non-fatal — user can set up profile manually if this fails.
        }

        confirmedPrincipalRef.current = probePrincipal;
        probeRunningRef.current = false;
        setActorReady(true);

        console.log(
          "[ActorReadyProvider] actorReady = true for principal:",
          probePrincipal,
        );

        // Force a fresh load of the profile query now that actor is confirmed.
        await queryClient.invalidateQueries({ queryKey: ["profile"] });
        await queryClient.refetchQueries({
          queryKey: ["profile", probePrincipal],
        });
        return;
      } catch (err) {
        console.warn(
          "[ActorReadyProvider] Probe attempt",
          attempt,
          "failed:",
          err,
        );

        if (Date.now() - startTime >= PROBE_TIMEOUT_MS) {
          console.error(
            "[ActorReadyProvider] Probe timed out after 30s for principal:",
            probePrincipal,
          );
          probeRunningRef.current = false;
          setProbeError(true);
          return;
        }

        const delay = Math.min(
          INITIAL_RETRY_DELAY_MS * 2 ** attempt,
          MAX_RETRY_DELAY_MS,
        );
        attempt++;
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }
  }, [actor, principalText, queryClient]);

  // ── EFFECT 2: Start probe when conditions are met ─────────────────────────
  // CRITICAL: We must NOT start the probe while:
  //   - isInitializing=true (II is still restoring from IndexedDB after redirect)
  //   - actorFetching=true (actor HttpAgent is still re-initializing with new identity)
  //   - isAnon or !isAuthenticated (user is not logged in)
  //   - probe already running for this principal
  //   - probe already confirmed for this principal
  useEffect(() => {
    if (
      isInitializing || // II is restoring from IndexedDB (Chrome redirect case)
      actorFetching || // actor HttpAgent is re-initializing with new identity
      !isAuthenticated ||
      isAnon ||
      !actor ||
      confirmedPrincipalRef.current === principalText ||
      probeRunningRef.current
    ) {
      return;
    }

    console.log(
      "[ActorReadyProvider] All conditions met — starting probe for:",
      principalText,
    );

    setActorReady(false);
    setProbeError(false);
    probeRunningRef.current = true;
    runProbe();
  }, [
    isInitializing,
    actorFetching,
    isAuthenticated,
    isAnon,
    actor,
    principalText,
    runProbe,
  ]);

  return (
    <ActorReadyContext.Provider value={{ actorReady, probeError }}>
      {children}
    </ActorReadyContext.Provider>
  );
}
