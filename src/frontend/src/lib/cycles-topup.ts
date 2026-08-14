import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Principal } from "@icp-sdk/core/principal";
import { IC_HOST } from "./auth-config";

/** Mainnet cycles wallet — admin identity must be a controller. */
export const CYCLES_WALLET_ID = "daf6l-jyaaa-aaaao-a4nba-cai";

export const CYCLE_TOP_UP_PRESETS = [
  { label: "500B", cycles: 500_000_000_000n },
  { label: "1T", cycles: 1_000_000_000_000n },
  { label: "3T", cycles: 3_000_000_000_000n },
] as const;

/** ICP amounts in e8s for treasury-funded top-ups. */
export const ICP_TOP_UP_PRESETS = [
  { label: "0.05 ICP", e8s: 5_000_000n },
  { label: "0.1 ICP", e8s: 10_000_000n },
  { label: "0.25 ICP", e8s: 25_000_000n },
] as const;

const walletIdlFactory = ({
  IDL,
}: {
  IDL: typeof import("@dfinity/candid").IDL;
}) =>
  IDL.Service({
    wallet_balance: IDL.Func([], [IDL.Nat64], ["query"]),
    wallet_send: IDL.Func([IDL.Principal, IDL.Nat64], [], []),
  });

type CyclesWalletActor = {
  wallet_balance: () => Promise<bigint>;
  wallet_send: (canister: Principal, amount: bigint) => Promise<void>;
};

async function walletActor(identity: Identity): Promise<CyclesWalletActor> {
  const agent = await HttpAgent.create({ host: IC_HOST, identity });
  if (import.meta.env.DEV) {
    await agent.fetchRootKey();
  }
  return Actor.createActor(walletIdlFactory as never, {
    agent,
    canisterId: CYCLES_WALLET_ID,
  }) as CyclesWalletActor;
}

export async function getCyclesWalletBalance(
  identity: Identity,
): Promise<bigint> {
  const wallet = await walletActor(identity);
  return wallet.wallet_balance();
}

export async function sendCyclesFromWallet(
  identity: Identity,
  targetCanisterId: string,
  cycles: bigint,
): Promise<void> {
  if (cycles <= 0n) throw new Error("Amount must be greater than zero");
  const wallet = await walletActor(identity);
  await wallet.wallet_send(Principal.fromText(targetCanisterId), cycles);
}

export function formatCyclesShort(cycles: bigint): string {
  const trillions = Number(cycles) / 1e12;
  if (trillions >= 1) return `${trillions.toFixed(2)} T`;
  const billions = Number(cycles) / 1e9;
  if (billions >= 1) return `${billions.toFixed(1)} B`;
  return `${(Number(cycles) / 1e6).toFixed(0)} M`;
}

export function formatIcpE8s(e8s: bigint): string {
  const whole = e8s / 100_000_000n;
  const frac = (e8s % 100_000_000n)
    .toString()
    .padStart(8, "0")
    .replace(/0+$/, "");
  return frac.length ? `${whole}.${frac}` : whole.toString();
}
