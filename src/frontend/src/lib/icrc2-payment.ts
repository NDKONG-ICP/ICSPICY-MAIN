import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { BACKEND_CANISTER_ID } from "./auth-config";

const IC_HOST = import.meta.env.DEV
  ? "http://127.0.0.1:4943"
  : "https://icp-api.io";

/** Mainnet ckUSDC / ckUSDT ledger canister IDs (matches backend icrc-payment.mo). */
export const STABLECOIN_LEDGERS = {
  ckUSDC: "xevnm-gaaaa-aaaar-qafnq-cai",
  ckUSDT: "cngnf-vqaaa-aaaar-qag4q-cai",
} as const;

export type StableToken = keyof typeof STABLECOIN_LEDGERS;

/** USD cents → ckUSDC/ckUSDT base units (6 decimals). */
export function stableAmountFromUsdCents(cents: bigint): bigint {
  return cents * 10_000n;
}

const icrc2LedgerIdlFactory = ({
  IDL,
}: {
  IDL: typeof import("@dfinity/candid").IDL;
}) => {
  const Sub = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(Sub),
  });
  const ApproveError = IDL.Variant({
    BadFee: IDL.Record({ fee: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
    Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
  });
  return IDL.Service({
    icrc1_fee: IDL.Func([], [IDL.Nat], ["query"]),
    icrc2_approve: IDL.Func(
      [
        IDL.Record({
          from_subaccount: IDL.Opt(Sub),
          spender: Account,
          amount: IDL.Nat,
          expected_allowance: IDL.Opt(IDL.Nat),
          expires_at: IDL.Opt(IDL.Nat64),
          fee: IDL.Opt(IDL.Nat),
          memo: IDL.Opt(Sub),
          created_at_time: IDL.Opt(IDL.Nat64),
        }),
      ],
      [IDL.Variant({ Ok: IDL.Nat, Err: ApproveError })],
      [],
    ),
  });
};

type Icrc2Ledger = {
  icrc1_fee: () => Promise<bigint>;
  icrc2_approve: (arg: {
    from_subaccount: [] | [Uint8Array];
    spender: { owner: Principal; subaccount: [] | [Uint8Array] };
    amount: bigint;
    expected_allowance: [] | [bigint];
    expires_at: [] | [bigint];
    fee: [] | [bigint];
    memo: [] | [Uint8Array];
    created_at_time: [] | [bigint];
  }) => Promise<{ Ok: bigint } | { Err: unknown }>;
};

async function createLedgerActor(
  identity: Identity,
  ledgerCanisterId: string,
): Promise<Icrc2Ledger> {
  const agent = await HttpAgent.create({ host: IC_HOST, identity });
  if (import.meta.env.DEV) {
    await agent.fetchRootKey().catch(() => {});
  }
  return Actor.createActor(icrc2LedgerIdlFactory as never, {
    agent,
    canisterId: ledgerCanisterId,
  }) as Icrc2Ledger;
}

/** ICRC-2 approve signed with Internet Identity (spender = backend canister). */
export async function icrc2Approve(
  identity: Identity,
  ledgerCanisterId: string,
  paymentAmount: bigint,
  spenderCanisterId: string = BACKEND_CANISTER_ID,
): Promise<bigint> {
  const ledger = await createLedgerActor(identity, ledgerCanisterId);
  const fee = await ledger.icrc1_fee();
  // transfer_from allowance must cover payment + fee (ckUSDC/ckUSDT fee = 10_000).
  const approveAmount = paymentAmount + fee;
  const result = await ledger.icrc2_approve({
    from_subaccount: [],
    spender: {
      owner: Principal.fromText(spenderCanisterId),
      subaccount: [],
    },
    amount: approveAmount,
    expected_allowance: [],
    expires_at: [],
    fee: [fee],
    memo: [],
    created_at_time: [],
  });
  if ("Err" in result) {
    throw new Error("ICRC-2 approve failed — check balance and try again");
  }
  return result.Ok;
}
