import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

const IC_HOST = import.meta.env.DEV
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
    icrc1_fee: IDL.Func([], [IDL.Nat], ["query"]),
    icrc1_transfer: IDL.Func(
      [
        IDL.Record({
          to: Account,
          amount: IDL.Nat,
          fee: IDL.Opt(IDL.Nat),
          memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
          from_subaccount: IDL.Opt(Sub),
          created_at_time: IDL.Opt(IDL.Nat64),
        }),
      ],
      [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Variant({}) })],
      [],
    ),
  });
};

type Icrc1Ledger = {
  icrc1_fee: () => Promise<bigint>;
  icrc1_transfer: (arg: {
    to: { owner: Principal; subaccount: [] | [Uint8Array] };
    amount: bigint;
    fee: [] | [bigint];
    memo: [] | [Uint8Array];
    from_subaccount: [] | [Uint8Array];
    created_at_time: [] | [bigint];
  }) => Promise<{ Ok: bigint } | { Err: unknown }>;
};

/** ICRC-1 transfer signed with the Internet Identity delegation (no wallet popup). */
export async function sendTokens(
  identity: Identity,
  ledgerCanisterId: string,
  to: string,
  amount: bigint,
): Promise<bigint> {
  const agent = await HttpAgent.create({
    host: IC_HOST,
    identity,
  });
  if (import.meta.env.DEV) {
    await agent.fetchRootKey().catch(() => {});
  }

  const actor = Actor.createActor(icrc1LedgerIdlFactory as never, {
    agent,
    canisterId: ledgerCanisterId,
  }) as Icrc1Ledger;

  const fee = await actor.icrc1_fee();
  const result = await actor.icrc1_transfer({
    to: { owner: Principal.fromText(to), subaccount: [] },
    amount,
    fee: [fee],
    memo: [],
    from_subaccount: [],
    created_at_time: [],
  });

  if ("Err" in result) {
    throw new Error("ICRC-1 transfer failed");
  }
  return result.Ok;
}
