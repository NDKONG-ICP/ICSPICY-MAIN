/** Minimal IC SPICY backend ICRC-7/37 surface for Bonsai drop scripts. */
export function icspicyLedgerIdlFactory({ IDL }) {
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(Subaccount),
  });

  const TransferError = IDL.Variant({
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
    NonExistingTokenId: IDL.Null,
    Unauthorized: IDL.Null,
  });
  const TransferResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: TransferError,
  });

  const Value = IDL.Variant({
    Nat: IDL.Nat,
    Int: IDL.Int,
    Text: IDL.Text,
    Blob: IDL.Vec(IDL.Nat8),
    Bool: IDL.Bool,
  });

  const ApproveTokenArg = IDL.Record({
    token_id: IDL.Nat,
    approval_info: IDL.Record({
      from_subaccount: IDL.Opt(Subaccount),
      spender: Account,
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      expires_at: IDL.Opt(IDL.Nat64),
      created_at_time: IDL.Opt(IDL.Nat64),
    }),
  });

  const ApproveErr = IDL.Variant({
    Unauthorized: IDL.Null,
    NonExistingTokenId: IDL.Null,
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
  });
  const ApproveResult = IDL.Variant({ Ok: IDL.Nat, Err: ApproveErr });

  const IsApprovedArg = IDL.Record({
    token_id: IDL.Nat,
    from_subaccount: IDL.Opt(Subaccount),
    spender: Account,
  });

  return IDL.Service({
    icrc7_tokens_of: IDL.Func(
      [Account, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
      [IDL.Vec(IDL.Nat)],
      ["query"],
    ),
    icrc7_owner_of: IDL.Func([IDL.Vec(IDL.Nat)], [IDL.Vec(IDL.Opt(Account))], [
      "query",
    ]),
    icrc7_token_metadata: IDL.Func(
      [IDL.Vec(IDL.Nat)],
      [IDL.Vec(IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, Value))))],
      ["query"],
    ),
    adminTransferFromPool: IDL.Func([IDL.Nat, Account], [TransferResult], []),
    icrc37_approve_tokens: IDL.Func(
      [IDL.Vec(ApproveTokenArg)],
      [IDL.Vec(IDL.Opt(ApproveResult))],
      [],
    ),
    icrc37_is_approved: IDL.Func(
      [IDL.Vec(IsApprovedArg)],
      [IDL.Vec(IDL.Bool)],
      ["query"],
    ),
    adminSetHederaMirror: IDL.Func(
      [
        IDL.Vec(
          IDL.Tuple(
            IDL.Nat,
            IDL.Record({
              htsTokenId: IDL.Text,
              serial: IDL.Nat,
              mintedAt: IDL.Nat,
            }),
          ),
        ),
      ],
      [IDL.Nat],
      [],
    ),
    getHederaMirror: IDL.Func([IDL.Nat], [IDL.Opt(IDL.Record({
      htsTokenId: IDL.Text,
      serial: IDL.Nat,
      mintedAt: IDL.Nat,
    }))], ["query"]),
    getHederaTwinOwner: IDL.Func([IDL.Nat], [IDL.Opt(IDL.Principal)], ["query"]),
    adminSyncHederaTwin: IDL.Func([IDL.Nat, Account], [TransferResult], []),
    adminRelockHederaTwin: IDL.Func([IDL.Nat], [TransferResult], []),
  });
}
