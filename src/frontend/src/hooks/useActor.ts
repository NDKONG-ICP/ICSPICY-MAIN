import type { Backend } from "../backend";
import { useAuth } from "./useAuth";

/**
 * Thin passthrough — backend actor is built in ICSpicyAuthProvider when II session is ready.
 */
export function useActor<T = Backend>(
  _createActorFn?: unknown,
): {
  actor: T | null;
  isFetching: boolean;
} {
  const { actor, isInitializing } = useAuth();
  return {
    actor: (actor as T | null) ?? null,
    isFetching: isInitializing,
  };
}
