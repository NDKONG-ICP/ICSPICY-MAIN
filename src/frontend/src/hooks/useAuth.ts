import type { AuthState } from "../providers/AuthProvider";
import { useAuthContext } from "../providers/AuthProvider";

export type { AuthState };

/**
 * Primary auth hook — returns the Internet Identity session.
 *
 * OISY is a payment-only integration accessed via useOisyWallet().
 * It is not used as a session provider here because:
 *  - OISY's signer-agent upgrades ALL calls (including queries) to signed
 *    update calls routed through ICRC-49, causing a per-call approval popup.
 *  - OISY's legacy signer does not support ICRC-34 delegation, so there is
 *    no way to create a silent session credential for OISY.
 *  - See OisyWalletProvider.tsx for OISY payment utilities.
 */
export function useAuth(): AuthState {
  return useAuthContext();
}
