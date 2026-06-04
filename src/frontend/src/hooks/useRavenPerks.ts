/**
 * useRavenPerks — queries the user's RAVEN balance across their II principal
 * and all linked wallets, then derives their Raven tier and feature gates.
 *
 * Tier thresholds (in base units, 8 decimals):
 *   Member : ≥ 100,000 RAVEN = 10_000_000_000_000 base units
 *   Pro    : ≥ 500,000 RAVEN = 50_000_000_000_000 base units
 */
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { useQuery } from "@tanstack/react-query";
import { useOisyWallet } from "../providers/OisyWalletProvider";
import { useAuth } from "./useAuth";
import { useLinkedWallets } from "./useBackend";

const RAVEN_CANISTER_ID = "4k7jk-vyaaa-aaaam-qcyaa-cai";
const RAVEN_DECIMALS = 8;
const MEMBER_THRESHOLD_UNITS = 100_000n;   // 100K RAVEN
const PRO_THRESHOLD_UNITS    = 500_000n;   // 500K RAVEN
const UNITS_PER_TOKEN = 10n ** BigInt(RAVEN_DECIMALS);
const MEMBER_THRESHOLD = MEMBER_THRESHOLD_UNITS * UNITS_PER_TOKEN;
const PRO_THRESHOLD    = PRO_THRESHOLD_UNITS    * UNITS_PER_TOKEN;

export type RavenTier = "free" | "member" | "pro";

export interface RavenPerks {
  tier: RavenTier;
  /** Total RAVEN balance in base units across all linked principals. */
  totalBalance: bigint;
  /** RAVEN held as whole tokens (base / 10^8). */
  totalUnits: bigint;
  /** Stacking shop discount: 5% for member/pro, 0% for free. */
  discount: number;
  hasAdvancedAnalytics: boolean;
  hasCsvExport: boolean;
  hasUnlimitedWeatherHistory: boolean;
  /** Garden: 100 plant limit (member/pro vs 20 for free). */
  hasExpandedGarden: boolean;
  /** AI garden generation — Pro only. */
  hasAiGeneration: boolean;
  /** Unlimited garden plants — Pro only. */
  hasUnlimitedGarden: boolean;
  isLoading: boolean;
}

const FREE_PERKS: Omit<RavenPerks, "isLoading" | "totalBalance" | "totalUnits"> = {
  tier: "free",
  discount: 0,
  hasAdvancedAnalytics: false,
  hasCsvExport: false,
  hasUnlimitedWeatherHistory: false,
  hasExpandedGarden: false,
  hasAiGeneration: false,
  hasUnlimitedGarden: false,
};

async function fetchRavenBalance(principalText: string): Promise<bigint> {
  try {
    const agent = await HttpAgent.create({ host: "https://icp-api.io" });
    const actor = Actor.createActor(
      ({ IDL }) =>
        IDL.Service({
          icrc1_balance_of: IDL.Func(
            [IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) })],
            [IDL.Nat],
            ["query"],
          ),
        }),
      { agent, canisterId: RAVEN_CANISTER_ID },
    ) as { icrc1_balance_of: (a: { owner: typeof Principal.prototype; subaccount: [] | [Uint8Array] }) => Promise<bigint> };

    return await actor.icrc1_balance_of({
      owner: Principal.fromText(principalText),
      subaccount: [],
    });
  } catch {
    return 0n;
  }
}

/** Derive the Raven tier and perks from a total RAVEN balance. */
export function perksFromBalance(totalBalance: bigint): Omit<RavenPerks, "isLoading"> {
  const totalUnits = totalBalance / UNITS_PER_TOKEN;
  if (totalBalance >= PRO_THRESHOLD) {
    return {
      tier: "pro",
      totalBalance,
      totalUnits,
      discount: 5,
      hasAdvancedAnalytics: true,
      hasCsvExport: true,
      hasUnlimitedWeatherHistory: true,
      hasExpandedGarden: true,
      hasAiGeneration: true,
      hasUnlimitedGarden: true,
    };
  }
  if (totalBalance >= MEMBER_THRESHOLD) {
    return {
      tier: "member",
      totalBalance,
      totalUnits,
      discount: 5,
      hasAdvancedAnalytics: true,
      hasCsvExport: true,
      hasUnlimitedWeatherHistory: true,
      hasExpandedGarden: true,
      hasAiGeneration: false,
      hasUnlimitedGarden: false,
    };
  }
  return { ...FREE_PERKS, totalBalance, totalUnits };
}

export const RAVEN_MEMBER_THRESHOLD_UNITS = MEMBER_THRESHOLD_UNITS;
export const RAVEN_PRO_THRESHOLD_UNITS = PRO_THRESHOLD_UNITS;

export function useRavenPerks(): RavenPerks {
  const { principal, isAuthenticated } = useAuth();
  const { isOisyConnected, oisyPrincipal } = useOisyWallet();
  const { data: linkedWallets = [] } = useLinkedWallets();

  const { data, isLoading } = useQuery({
    queryKey: [
      "ravenPerks",
      principal?.toText() ?? "",
      oisyPrincipal?.toText() ?? "",
      linkedWallets.map((p) => p.toText()).join(","),
    ],
    queryFn: async () => {
      // Build list of principals to check — deduplicated
      const seen = new Set<string>();
      const list: string[] = [];
      const add = (p: string) => { if (!seen.has(p)) { seen.add(p); list.push(p); } };

      if (principal) add(principal.toText());
      if (isOisyConnected && oisyPrincipal) add(oisyPrincipal.toText());
      for (const w of linkedWallets) add(w.toText());

      if (list.length === 0) return 0n;
      const balances = await Promise.all(list.map((p) => fetchRavenBalance(p)));
      return balances.reduce((sum, b) => sum + b, 0n);
    },
    // Run when II is authenticated OR when OISY is connected (even without II)
    enabled: (isAuthenticated && !!principal) || isOisyConnected,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (isLoading || data === undefined) {
    return { ...FREE_PERKS, totalBalance: 0n, totalUnits: 0n, isLoading: true };
  }
  return { ...perksFromBalance(data), isLoading: false };
}
