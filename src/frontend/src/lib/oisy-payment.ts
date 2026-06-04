/**
 * oisy-payment.ts — OISY-signed ICRC-2 approve for product/NFT checkout.
 *
 * Mirrors icrc2-payment.ts but uses an IdentityKit agent (caller = OISY
 * principal) instead of the II identity.  The spender is always the backend
 * canister; the OISY approval popup is shown by IdentityKit automatically.
 */

import { Actor } from "@dfinity/agent";
import type { HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { BACKEND_CANISTER_ID } from "./auth-config";
import {
  PAYMENT_LEDGERS,
  type PaymentTokenSymbol,
  isStablePaymentToken,
  stableAmountFromUsdCents,
} from "./token-payment";

export { PAYMENT_LEDGERS, type PaymentTokenSymbol, stableAmountFromUsdCents };

// Minimal inline IDL for ICRC-2 ledger (approve + fee query)
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

function createOisyLedgerActor(
  oisyAgent: HttpAgent,
  ledgerCanisterId: string,
): Icrc2Ledger {
  return Actor.createActor(icrc2LedgerIdlFactory as never, {
    agent: oisyAgent,
    canisterId: ledgerCanisterId,
  }) as Icrc2Ledger;
}

/**
 * ICRC-2 approve signed by OISY (caller = OISY principal).
 * Triggers an OISY approval popup via IdentityKit.
 * Spender defaults to the IC SPICY backend canister.
 */
export async function oisyIcrc2Approve(
  oisyAgent: HttpAgent,
  ledgerCanisterId: string,
  paymentAmount: bigint,
  spenderCanisterId: string = BACKEND_CANISTER_ID,
  options?: { bufferBps?: number },
): Promise<bigint> {
  const ledger = createOisyLedgerActor(oisyAgent, ledgerCanisterId);
  const fee = await ledger.icrc1_fee();
  const bufferBps = options?.bufferBps ?? 0;
  const buffered =
    bufferBps > 0
      ? (paymentAmount * BigInt(10_000 + bufferBps)) / 10_000n
      : paymentAmount;
  const approveAmount = buffered + fee;
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
    throw new Error(
      "OISY ICRC-2 approve failed — check your OISY wallet balance",
    );
  }
  return result.Ok;
}

/** Compute payment amount from USD cents for a given token symbol. */
export function oisyPaymentAmount(
  usdCents: bigint,
  token: PaymentTokenSymbol,
  priceUsd: number,
): bigint {
  if (isStablePaymentToken(token)) return stableAmountFromUsdCents(usdCents);
  if (priceUsd <= 0) throw new Error(`Token price unavailable for ${token}`);
  const usd = Number(usdCents) / 100;
  const decimals =
    token === "ICP" || token === "ckBTC" ? 8 : token === "ckETH" ? 18 : 6;
  const units = Math.ceil((usd / priceUsd) * 10 ** decimals);
  return BigInt(units);
}
