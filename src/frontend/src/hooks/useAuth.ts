import type { AuthState } from "../providers/AuthProvider";
import { useAuthContext } from "../providers/AuthProvider";

export type { AuthState };

/** Single auth interface — Internet Identity via @dfinity/use-auth-client. */
export function useAuth(): AuthState {
  return useAuthContext();
}
