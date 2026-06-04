import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import type { Principal as IcpPrincipal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

const HOST = import.meta.env.DEV
  ? "http://127.0.0.1:4943"
  : "https://icp-api.io";

const icrc1LedgerIdlFactory = ({
  IDL,
}: {
  IDL: typeof import("@dfinity/candid").IDL;
}) => {
  const Sub = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(Sub),
  });
  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ["query"]),
  });
};

type Icrc1Ledger = {
  icrc1_balance_of: (arg: {
    owner: Principal;
    subaccount: [] | [Uint8Array];
  }) => Promise<bigint>;
};

async function balanceOf(
  identity: import("@dfinity/agent").Identity | null,
  canisterId: string,
  owner: IcpPrincipal,
): Promise<bigint> {
  const agent = await HttpAgent.create({
    host: HOST,
    identity: identity ?? undefined,
  });
  if (import.meta.env.DEV) {
    await agent.fetchRootKey().catch(() => {});
  }
  const actor = Actor.createActor(icrc1LedgerIdlFactory as never, {
    agent,
    canisterId: Principal.fromText(canisterId),
  }) as Icrc1Ledger;
  const o = Principal.fromText(owner.toText());
  return actor.icrc1_balance_of({ owner: o, subaccount: [] });
}

export interface TokenBalanceRow {
  symbol: string;
  canisterId: string;
  decimals: number;
  fee: bigint;
  balance: bigint;
  formattedBalance: string;
}

export const TOKEN_LEDGER_CONFIG = [
  {
    symbol: "ICP",
    canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
    decimals: 8,
    fractionDigits: 4,
    fee: 10_000n,
  },
  {
    symbol: "ckBTC",
    canisterId: "mxzaz-hqaaa-aaaar-qaada-cai",
    decimals: 8,
    fractionDigits: 4,
    fee: 10n,
  },
  {
    symbol: "ckETH",
    canisterId: "ss2fx-dyaaa-aaaar-qacoq-cai",
    decimals: 18,
    fractionDigits: 4,
    fee: 2_000_000_000_000n,
  },
  {
    symbol: "ckUSDC",
    canisterId: "xevnm-gaaaa-aaaar-qafnq-cai",
    decimals: 6,
    fractionDigits: 2,
    fee: 10_000n,
  },
  {
    symbol: "ckUSDT",
    canisterId: "cngnf-vqaaa-aaaar-qag4q-cai",
    decimals: 6,
    fractionDigits: 2,
    fee: 10_000n,
  },
  {
    symbol: "RAVEN",
    canisterId: "4k7jk-vyaaa-aaaam-qcyaa-cai",
    decimals: 8,
    fractionDigits: 2,
    fee: 10_000n,
  },
] as const;

/** Format ledger base units as a human-readable decimal string. */
export function formatTokenAmount(base: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const whole = base / scale;
  const frac = (base % scale)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole.toString();
}

/** Parse a human amount string into ledger base units. */
export function parseTokenAmount(input: string, decimals: number): bigint {
  const trimmed = input.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a valid amount");
  }
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + fracPadded);
}

/** Format a fee (base units) for display. */
export function formatTokenFee(fee: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = fee / base;
  const frac = fee % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

function formatBalance(
  raw: bigint,
  decimals: number,
  fractionDigits: number,
): string {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const frac = raw % base;
  const fracStr = frac
    .toString()
    .padStart(decimals, "0")
    .slice(0, fractionDigits);
  return `${whole.toString()}.${fracStr}`;
}

export function useTokenBalances() {
  const { principal, isAuthenticated, identity } = useAuth();

  return useQuery({
    queryKey: ["tokenBalances", principal?.toText() ?? "anon"],
    enabled: isAuthenticated && !!principal && !principal.isAnonymous(),
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!principal) return [];
      const rows: TokenBalanceRow[] = [];
      for (const L of TOKEN_LEDGER_CONFIG) {
        try {
          const bal = await balanceOf(identity, L.canisterId, principal);
          rows.push({
            symbol: L.symbol,
            canisterId: L.canisterId,
            decimals: L.decimals,
            fee: L.fee,
            balance: bal,
            formattedBalance: formatBalance(bal, L.decimals, L.fractionDigits),
          });
        } catch {
          rows.push({
            symbol: L.symbol,
            canisterId: L.canisterId,
            decimals: L.decimals,
            fee: L.fee,
            balance: 0n,
            formattedBalance: "—",
          });
        }
      }
      return rows;
    },
  });
}

/**
 * Query token balances for any principal (no II session needed).
 * ICRC-1 icrc1_balance_of is a public query — no auth required.
 */
export function useTokenBalancesForPrincipal(
  ownerPrincipal: { toText(): string; isAnonymous?(): boolean } | undefined,
) {
  const principalText = ownerPrincipal?.toText() ?? "";
  const enabled =
    !!ownerPrincipal &&
    principalText !== "" &&
    ownerPrincipal.isAnonymous?.() !== true;

  return useQuery({
    queryKey: ["tokenBalancesForPrincipal", principalText],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!ownerPrincipal) return [];
      // Use a surrogate IcpPrincipal shape — balanceOf converts via .toText()
      const surrogate = { toText: () => principalText } as IcpPrincipal;
      const rows: TokenBalanceRow[] = [];
      for (const L of TOKEN_LEDGER_CONFIG) {
        try {
          const bal = await balanceOf(null, L.canisterId, surrogate);
          rows.push({
            symbol: L.symbol,
            canisterId: L.canisterId,
            decimals: L.decimals,
            fee: L.fee,
            balance: bal,
            formattedBalance: formatBalance(bal, L.decimals, L.fractionDigits),
          });
        } catch {
          rows.push({
            symbol: L.symbol,
            canisterId: L.canisterId,
            decimals: L.decimals,
            fee: L.fee,
            balance: 0n,
            formattedBalance: "—",
          });
        }
      }
      return rows;
    },
  });
}
