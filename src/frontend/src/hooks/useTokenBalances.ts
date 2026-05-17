import { AnonymousIdentity, Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import type { Principal as IcpPrincipal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

const HOST = "https://icp0.io";

const icrc1LedgerIdlFactory = ({ IDL }: { IDL: typeof import("@dfinity/candid").IDL }) => {
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

let cachedAgent: HttpAgent | null = null;

function getAnonymousAgent(): HttpAgent {
  if (!cachedAgent) {
    cachedAgent = HttpAgent.createSync({
      host: HOST,
      identity: new AnonymousIdentity(),
    });
  }
  return cachedAgent;
}

async function balanceOf(canisterId: string, owner: IcpPrincipal): Promise<bigint> {
  const agent = getAnonymousAgent();
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
  balance: bigint;
  formattedBalance: string;
}

const LEDGERS: Array<{
  symbol: string;
  canisterId: string;
  decimals: number;
  fractionDigits: number;
}> = [
  {
    symbol: "ICP",
    canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
    decimals: 8,
    fractionDigits: 4,
  },
  {
    symbol: "ckBTC",
    canisterId: "mxzaz-hqaaa-aaaar-qaada-cai",
    decimals: 8,
    fractionDigits: 4,
  },
  {
    symbol: "ckETH",
    canisterId: "ss2fx-dyaaa-aaaar-qacoq-cai",
    decimals: 18,
    fractionDigits: 4,
  },
  {
    symbol: "ckUSDC",
    canisterId: "xevnm-gaaaa-aaaar-qafnq-cai",
    decimals: 6,
    fractionDigits: 2,
  },
  {
    symbol: "ckUSDT",
    canisterId: "cngnf-vqaaa-aaaar-qag4q-cai",
    decimals: 6,
    fractionDigits: 2,
  },
];

function formatBalance(
  raw: bigint,
  decimals: number,
  fractionDigits: number,
): string {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const frac = raw % base;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, fractionDigits);
  return `${whole.toString()}.${fracStr}`;
}

export function useTokenBalances() {
  const { principal, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["tokenBalances", principal?.toText() ?? "anon"],
    enabled:
      isAuthenticated && !!principal && !principal.isAnonymous(),
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!principal) return [];
      const rows: TokenBalanceRow[] = [];
      for (const L of LEDGERS) {
        try {
          const bal = await balanceOf(L.canisterId, principal);
          rows.push({
            symbol: L.symbol,
            canisterId: L.canisterId,
            decimals: L.decimals,
            balance: bal,
            formattedBalance: formatBalance(bal, L.decimals, L.fractionDigits),
          });
        } catch {
          rows.push({
            symbol: L.symbol,
            canisterId: L.canisterId,
            decimals: L.decimals,
            balance: 0n,
            formattedBalance: "—",
          });
        }
      }
      return rows;
    },
  });
}
