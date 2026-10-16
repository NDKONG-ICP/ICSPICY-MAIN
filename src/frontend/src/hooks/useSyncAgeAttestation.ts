import type { _SERVICE } from "@/declarations/backend.did";
import { idlFactory } from "@/declarations/backend.did.js";
import { BACKEND_CANISTER_ID, IC_HOST } from "@/lib/auth-config";
import { isAgeAllowed } from "@/lib/age-attestation";
import { useAuthContext } from "@/providers/AuthProvider";
import { Actor, HttpAgent } from "@dfinity/agent";
import { useEffect, useRef } from "react";

/** Mirror browser age attestation to the backend after Internet Identity login. */
export function useSyncAgeAttestation() {
  const { isAuthenticated, identity } = useAuthContext();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !identity || !isAgeAllowed()) {
      if (!isAuthenticated) syncedRef.current = false;
      return;
    }
    if (syncedRef.current) return;
    syncedRef.current = true;

    void (async () => {
      try {
        const agent = await HttpAgent.create({ host: IC_HOST, identity });
        if (import.meta.env.DEV) {
          await agent.fetchRootKey();
        }
        const raw = Actor.createActor<_SERVICE>(idlFactory, {
          agent,
          canisterId: BACKEND_CANISTER_ID,
        });
        const existing = await raw.getMyAgeAttestation();
        if (existing?.length) return;
        await raw.setAgeAttestation();
      } catch {
        syncedRef.current = false;
      }
    })();
  }, [identity, isAuthenticated]);
}
