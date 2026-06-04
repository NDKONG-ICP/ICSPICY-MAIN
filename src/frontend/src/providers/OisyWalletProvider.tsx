/**
 * OisyWalletProvider — OISY-only IdentityKit integration.
 *
 * Wraps @nfid/identitykit so the rest of IC SPICY doesn't depend on IdentityKit
 * internals. Internet Identity login (AuthProvider) is completely independent.
 *
 * OISY uses ACCOUNTS auth type (ICRC-25/49 per-action popups, no delegation).
 * Every call through the IdentityKit agent will have caller = OISY principal.
 */

import { Actor, type HttpAgent } from "@dfinity/agent";
import type { Principal } from "@dfinity/principal";
import { OISY } from "@nfid/identitykit";
import { IdentityKitProvider, IdentityKitTheme } from "@nfid/identitykit/react";
import { useAuth as useIdentityKitAuth } from "@nfid/identitykit/react";
import { useAccounts } from "@nfid/identitykit/react";
import { useAgent } from "@nfid/identitykit/react";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import { Backend, ExternalBlob } from "../backend";
import type { _SERVICE } from "../declarations/backend.did";
import { idlFactory as backendIdlFactory } from "../declarations/backend.did.js";
import { BACKEND_CANISTER_ID, IC_HOST } from "../lib/auth-config";

async function uploadFile(file: ExternalBlob): Promise<Uint8Array> {
  return file.getBytes();
}
async function downloadFile(bytes: Uint8Array): Promise<ExternalBlob> {
  return ExternalBlob.fromBytes(bytes as Uint8Array<ArrayBuffer>);
}

// ─── Context shape ─────────────────────────────────────────────────────────

export interface OisyWalletState {
  /** OISY principal, defined when wallet is connected */
  oisyPrincipal: Principal | undefined;
  /** Human-readable account address string (truncated) */
  oisyAccount: string | undefined;
  /** Whether the OISY wallet is currently connected */
  isOisyConnected: boolean;
  /** True while IdentityKit is initialising */
  isOisyInitializing: boolean;
  /** Trigger the OISY connect flow */
  connectOisy: () => Promise<void>;
  /** Disconnect OISY wallet (does NOT affect II login) */
  disconnectOisy: () => Promise<void>;
  /**
   * IdentityKit agent bound to the OISY identity.
   * Use this to build actors that will have caller = OISY principal.
   * Undefined until OISY is connected.
   */
  oisyAgent: HttpAgent | undefined;
  /**
   * Pre-built backend actor signed by OISY.
   * All calls will show an OISY approval popup and have caller = OISY principal.
   * Undefined until OISY is connected.
   */
  oisyBackendActor: _SERVICE | undefined;
  /**
   * Same actor wrapped in the Backend class (stable reference — memoized).
   * Used by useAuth() to expose OISY as a first-class session without
   * creating a new instance on every render.
   */
  oisyBackendWrapped: Backend | undefined;
}

const OisyWalletContext = createContext<OisyWalletState | null>(null);

// ─── Inner component (must be inside IdentityKitProvider) ───────────────────

function OisyWalletInner({ children }: { children: ReactNode }) {
  const { user, isConnecting, connect, disconnect } = useIdentityKitAuth();
  const accounts = useAccounts();

  // useAgent returns an Agent from @nfid/identitykit but it satisfies the
  // HttpAgent interface well enough for Actor.createActor.
  const rawAgent = useAgent({ host: IC_HOST });

  const oisyPrincipal = user?.principal;
  const isOisyConnected = !!oisyPrincipal;

  const oisyAccount = useMemo(() => {
    if (!oisyPrincipal) return undefined;
    const t = oisyPrincipal.toText();
    if (t.length <= 14) return t;
    return `${t.slice(0, 6)}…${t.slice(-5)}`;
  }, [oisyPrincipal]);

  // accounts[0] reflects global OISY account; log for debug in dev
  void accounts;

  // Cast: IdentityKit's Agent satisfies HttpAgent interface for Actor.createActor
  const oisyAgent = rawAgent as unknown as HttpAgent | undefined;

  const oisyBackendActor = useMemo<_SERVICE | undefined>(() => {
    if (!oisyAgent || !isOisyConnected) return undefined;
    return Actor.createActor<_SERVICE>(backendIdlFactory, {
      agent: oisyAgent,
      canisterId: BACKEND_CANISTER_ID,
    });
  }, [oisyAgent, isOisyConnected]);

  // Stable Backend-wrapped instance for useAuth() — only recreated when the
  // underlying actor changes (i.e. when OISY connects/disconnects).
  const oisyBackendWrapped = useMemo<Backend | undefined>(() => {
    if (!oisyBackendActor) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Backend(oisyBackendActor as any, uploadFile, downloadFile);
  }, [oisyBackendActor]);

  const value = useMemo<OisyWalletState>(
    () => ({
      oisyPrincipal,
      oisyAccount,
      isOisyConnected,
      isOisyInitializing: isConnecting,
      connectOisy: () => connect(OISY.id),
      disconnectOisy: disconnect,
      oisyAgent,
      oisyBackendActor,
      oisyBackendWrapped,
    }),
    [
      oisyPrincipal,
      oisyAccount,
      isOisyConnected,
      isConnecting,
      connect,
      disconnect,
      oisyAgent,
      oisyBackendActor,
      oisyBackendWrapped,
    ],
  );

  return (
    <OisyWalletContext.Provider value={value}>
      {children}
    </OisyWalletContext.Provider>
  );
}

// ─── Public provider (adds IdentityKitProvider + inner) ────────────────────

export function OisyWalletProvider({ children }: { children: ReactNode }) {
  return (
    <IdentityKitProvider
      signers={[OISY]}
      featuredSigner={OISY}
      discoverExtensionSigners={false}
      theme={IdentityKitTheme.DARK}
      signerClientOptions={{
        targets: [BACKEND_CANISTER_ID],
      }}
    >
      <OisyWalletInner>{children}</OisyWalletInner>
    </IdentityKitProvider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useOisyWallet(): OisyWalletState {
  const ctx = useContext(OisyWalletContext);
  if (!ctx) {
    throw new Error("useOisyWallet must be used inside OisyWalletProvider");
  }
  return ctx;
}
