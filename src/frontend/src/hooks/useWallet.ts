// src/hooks/useWallet.ts
//
// Phase 4 wallet integration: OISY (popup signer) and Plug (browser extension).
//
// User explicitly picks wallet type in UI — no auto-detection.
// The hook manages connection state and provides icrc2Approve for payment flows.
//
// OISY: @dfinity/oisy-wallet-signer (popup handshake + ICRC-25/27/49)
// Plug: window.ic.plug (browser extension — connect + agent-based approve)

import { IcrcWallet } from "@dfinity/oisy-wallet-signer/icrc-wallet";
import { Principal } from "@icp-sdk/core/principal";
import type { TxStatus, TxType } from "../backend";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

// Production OISY signer URL (per oisy-wallet-signer README)
const OISY_SIGNER_URL = "https://oisy.com/sign";

// ICP ledger canister ID (mainnet + local replica share the same ID)
export const ICP_LEDGER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
export const CKBTC_LEDGER_ID = "mxzaz-hqaaa-aaaar-qaada-cai";
export const CKETH_LEDGER_ID = "ss2fx-dyaaa-aaaar-qacoq-cai";
export const CKUSDC_LEDGER_ID = "xevnm-gaaaa-aaaar-qafnq-cai";
export const CKUSDT_LEDGER_ID = "cngnf-vqaaa-aaaar-qag4q-cai";

export type WalletType = "oisy" | "plug";

export interface WalletAccount {
  /** Principal text (e.g. "aaaaa-aa...") */
  owner: string;
}

export interface WalletState {
  walletType: WalletType | null;
  account: WalletAccount | null;
  isConnecting: boolean;
  isConnected: boolean;
}

// Module-level singleton so the OISY wallet connection survives re-renders.
let oisyWallet: IcrcWallet | null = null;

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    walletType: null,
    account: null,
    isConnecting: false,
    isConnected: false,
  });

  const busyRef = useRef(false);

  // ── OISY connect ─────────────────────────────────────────────────────────

  const connectOISY = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setState((s) => ({ ...s, isConnecting: true }));

    try {
      if (oisyWallet) {
        await oisyWallet.disconnect();
        oisyWallet = null;
      }

      oisyWallet = await IcrcWallet.connect({
        url: OISY_SIGNER_URL,
        onDisconnect: () => {
          setState({
            walletType: null,
            account: null,
            isConnecting: false,
            isConnected: false,
          });
          oisyWallet = null;
        },
      });

      const { allPermissionsGranted } =
        await oisyWallet.requestPermissionsNotGranted();
      if (!allPermissionsGranted) {
        toast.error("OISY wallet: not all permissions granted");
        await oisyWallet.disconnect();
        oisyWallet = null;
        setState((s) => ({ ...s, isConnecting: false }));
        return;
      }

      const accounts = await oisyWallet.accounts();
      const first = accounts?.[0];
      if (!first) {
        toast.error("OISY wallet: no accounts found");
        await oisyWallet.disconnect();
        oisyWallet = null;
        setState((s) => ({ ...s, isConnecting: false }));
        return;
      }

      setState({
        walletType: "oisy",
        account: { owner: first.owner },
        isConnecting: false,
        isConnected: true,
      });
      toast.success("OISY wallet connected");
    } catch (err) {
      console.error("[useWallet] OISY connect error:", err);
      toast.error("Failed to connect OISY wallet");
      setState((s) => ({ ...s, isConnecting: false, isConnected: false }));
    } finally {
      busyRef.current = false;
    }
  }, []);

  // ── Plug connect ──────────────────────────────────────────────────────────

  const connectPlug = useCallback(async (canisterWhitelist: string[]) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setState((s) => ({ ...s, isConnecting: true }));

    try {
      const plug = (window as any).ic?.plug; // eslint-disable-line
      if (!plug) {
        toast.error("Plug wallet not installed — get it at plugwallet.ooo");
        setState((s) => ({ ...s, isConnecting: false }));
        return;
      }

      const connected = await plug.requestConnect({
        whitelist: canisterWhitelist,
      });
      if (!connected) {
        toast.error("Plug wallet connection refused");
        setState((s) => ({ ...s, isConnecting: false }));
        return;
      }

      const principalObj = await plug.getPrincipal();
      setState({
        walletType: "plug",
        account: { owner: principalObj.toString() },
        isConnecting: false,
        isConnected: true,
      });
      toast.success("Plug wallet connected");
    } catch (err) {
      console.error("[useWallet] Plug connect error:", err);
      toast.error("Failed to connect Plug wallet");
      setState((s) => ({ ...s, isConnecting: false, isConnected: false }));
    } finally {
      busyRef.current = false;
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    if (oisyWallet) {
      await oisyWallet.disconnect().catch(() => {});
      oisyWallet = null;
    }
    setState({
      walletType: null,
      account: null,
      isConnecting: false,
      isConnected: false,
    });
  }, []);

  // ── ICRC-2 approve ────────────────────────────────────────────────────────

  /**
   * Approve `spenderCanisterId` to spend `amount` base-units of `ledgerId`
   * on behalf of the connected wallet owner.
   *
   * OISY: routes through the popup signer's approve method.
   * Plug: uses Plug's agent to call icrc2_approve directly on the ledger.
   *
   * Returns true on success, false on failure (toast already shown).
   */
  const approvePayment = useCallback(
    async (opts: {
      ledgerCanisterId: string;
      spenderCanisterId: string;
      amount: bigint;
    }): Promise<boolean> => {
      const { ledgerCanisterId, spenderCanisterId, amount } = opts;

      if (!state.account) {
        toast.error("No wallet connected");
        return false;
      }

      // OISY path
      if (state.walletType === "oisy" && oisyWallet) {
        try {
          await (oisyWallet as any).approve({
            params: {
              spender: {
                owner: Principal.fromText(spenderCanisterId),
                subaccount: [],
              },
              amount,
            },
            owner: state.account.owner,
            ledgerCanisterId,
          });
          return true;
        } catch (err) {
          console.error("[useWallet] OISY approve error:", err);
          toast.error("OISY approval failed or was rejected");
          return false;
        }
      }

      // Plug path: use Plug's createActor to call icrc2_approve
      if (state.walletType === "plug") {
        try {
          const plug = (window as any).ic?.plug;
          if (!plug) {
            toast.error("Plug wallet not found");
            return false;
          }

          // Minimal ICRC-2 approve IDL for Plug actor creation.
          // Build with the @dfinity/candid IDL factory pattern.
          const { IDL } = await import("@dfinity/candid");
          const Subaccount = IDL.Vec(IDL.Nat8);
          const Account = IDL.Record({
            owner: IDL.Principal,
            subaccount: IDL.Opt(Subaccount),
          });
          const approveIdl = ({ IDL: I }: { IDL: typeof IDL }) =>
            I.Service({
              icrc2_approve: I.Func(
                [
                  I.Record({
                    spender: Account,
                    fee: I.Opt(I.Nat),
                    memo: I.Opt(I.Vec(I.Nat8)),
                    from_subaccount: I.Opt(Subaccount),
                    created_at_time: I.Opt(I.Nat64),
                    amount: I.Nat,
                    expected_allowance: I.Opt(I.Nat),
                    expires_at: I.Opt(I.Nat64),
                  }),
                ],
                [
                  I.Variant({
                    Ok: I.Nat,
                    Err: I.Variant({
                      GenericError: I.Record({
                        message: I.Text,
                        error_code: I.Nat,
                      }),
                      TemporarilyUnavailable: I.Null,
                      Duplicate: I.Record({ duplicate_of: I.Nat }),
                      BadFee: I.Record({ expected_fee: I.Nat }),
                      AllowanceChanged: I.Record({ current_allowance: I.Nat }),
                      CreatedInFuture: I.Record({ ledger_time: I.Nat64 }),
                      TooOld: I.Null,
                      Expired: I.Record({ ledger_time: I.Nat64 }),
                      InsufficientFunds: I.Record({ balance: I.Nat }),
                    }),
                  }),
                ],
                ["update"],
              ),
            });

          const ledgerActor = await plug.createActor({
            canisterId: ledgerCanisterId,
            interfaceFactory: approveIdl,
          });

          const result = await ledgerActor.icrc2_approve({
            spender: {
              owner: Principal.fromText(spenderCanisterId),
              subaccount: [],
            },
            amount,
            fee: [],
            memo: [],
            from_subaccount: [],
            created_at_time: [],
            expected_allowance: [],
            expires_at: [],
          });

          if (result && typeof result === "object" && "Err" in result) {
            toast.error(`Plug approval failed: ${JSON.stringify(result.Err)}`);
            return false;
          }
          return true;
        } catch (err) {
          console.error("[useWallet] Plug approve error:", err);
          toast.error("Plug approval failed");
          return false;
        }
      }

      toast.error("No wallet connected");
      return false;
    },
    [state.walletType, state.account],
  );

  return {
    ...state,
    connectOISY,
    connectPlug,
    disconnect,
    approvePayment,
  };
}

// ── Phase 4 migration stubs ───────────────────────────────────────────────────
// The simulated wallet (wallet.mo) was deleted in Phase 4.0.
// Wallet.tsx still imports these; they are no-ops until the page is rewritten
// in a future phase to use real ICRC-2 balances.

export function useWalletAddress() {
  return { data: "" };
}

export function useWalletBalances() {
  return {
    data: [] as Array<{
      symbol: string;
      balance: bigint;
      decimals: number;
      name: string;
      usdValue: number;
    }>,
    isLoading: false,
  };
}

export function useWalletTransactions() {
  return {
    data: [] as Array<{
      id: string;
      status: TxStatus;
      counterparty: string;
      tokenSymbol: string;
      timestamp: bigint;
      txType: TxType;
      amount: bigint;
    }>,
    isLoading: false,
  };
}

export function useSendToken(): {
  mutate: (...args: any[]) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
} {
  return {
    mutate: (..._args: any[]) => {},
    isPending: false,
    isError: false,
    error: null,
  };
}
