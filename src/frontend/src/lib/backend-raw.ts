import type { ActorSubclass } from "@dfinity/agent";
import type { Backend } from "../backend";
import type { _SERVICE as BackendServiceRaw } from "../declarations/backend.did";

/** Unwrap the candid actor from the hand-maintained Backend wrapper class. */
export function backendRaw(
  actor: Backend | null,
): ActorSubclass<BackendServiceRaw> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<BackendServiceRaw> }).actor;
}

export function requireBackendRaw(
  actor: Backend | null,
): ActorSubclass<BackendServiceRaw> {
  const raw = backendRaw(actor);
  if (!raw) throw new Error("Not connected");
  return raw;
}
