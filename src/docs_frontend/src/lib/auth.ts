// Internet Identity authentication flow for the admin panel.
// Uses @dfinity/auth-client with a delegation cached in localStorage.

import { Actor, HttpAgent } from "@dfinity/agent";
import type { Identity } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { type DocsBackendActor, idlFactory } from "./idl";

// Internet Identity URL — local dev uses the locally-deployed II canister.
function resolveIIUrl(): string {
  const hostname = window.location.hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    // Local replica: II is available at a specific canister address.
    // Fallback to mainnet II if local isn't deployed.
    const localIICanisterId = process.env.CANISTER_ID_INTERNET_IDENTITY ?? "";
    if (localIICanisterId) {
      return `http://${localIICanisterId}.localhost:4943`;
    }
  }
  return "https://identity.ic0.app";
}

function resolveHost(): string {
  const { protocol, hostname, port } = window.location;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    return `${protocol}//127.0.0.1:${port || "4943"}`;
  }
  return "https://icp-api.io";
}

function isLocalNetwork(): boolean {
  return (process.env.DFX_NETWORK ?? "local") === "local";
}

function resolveCanisterId(): string {
  return (process.env.CANISTER_ID_DOCS_BACKEND ?? "").trim();
}

let _authClient: AuthClient | null = null;

export async function getAuthClient(): Promise<AuthClient> {
  if (!_authClient) {
    _authClient = await AuthClient.create({
      idleOptions: {
        // Auto-logout after 30 minutes idle.
        idleTimeout: 30 * 60 * 1000,
        onIdle: () => {
          _authClient = null;
          _authenticatedActor = null;
          window.dispatchEvent(new CustomEvent("auth:idle-logout"));
        },
      },
    });
  }
  return _authClient;
}

export async function login(): Promise<boolean> {
  const client = await getAuthClient();
  return new Promise((resolve) => {
    client.login({
      identityProvider: resolveIIUrl(),
      maxTimeToLive: BigInt(8 * 60 * 60 * 1e9), // 8 hours in nanoseconds
      onSuccess: () => {
        _authenticatedActor = null; // invalidate cached actor
        resolve(true);
      },
      onError: () => resolve(false),
    });
  });
}

export async function logout(): Promise<void> {
  const client = await getAuthClient();
  await client.logout();
  _authenticatedActor = null;
}

export async function isAuthenticated(): Promise<boolean> {
  const client = await getAuthClient();
  return client.isAuthenticated();
}

export async function getIdentity(): Promise<Identity> {
  const client = await getAuthClient();
  return client.getIdentity();
}

// ── Authenticated actor ────────────────────────────────────────────────────

let _authenticatedActor: DocsBackendActor | null = null;

export async function getAuthenticatedActor(): Promise<DocsBackendActor | null> {
  if (_authenticatedActor) return _authenticatedActor;

  const canisterId = resolveCanisterId();
  if (!canisterId) return null;

  const client = await getAuthClient();
  if (!(await client.isAuthenticated())) return null;

  const identity = client.getIdentity();
  const agent = HttpAgent.createSync({ identity, host: resolveHost() });
  if (isLocalNetwork()) {
    agent.fetchRootKey().catch(() => {});
  }

  _authenticatedActor = Actor.createActor<DocsBackendActor>(idlFactory, {
    agent,
    canisterId,
  });
  return _authenticatedActor;
}

export async function getPrincipal(): Promise<string | null> {
  const client = await getAuthClient();
  if (!(await client.isAuthenticated())) return null;
  return client.getIdentity().getPrincipal().toText();
}
