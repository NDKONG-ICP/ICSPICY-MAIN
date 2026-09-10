// Crumbeatr client (Taggr fork, canister bpqth-gaaaa-aaaaj-qntfq-cai).
//
// Crumbeatr exposes two API styles:
//   1. Candid methods (add_post, set_avatar, icrc1_* — CRUMB token lives on the
//      same canister).
//   2. Taggr-style raw methods where args and replies are JSON bytes
//      (create_user, react, tip, feeds, user profile, ...).
// This client mirrors the app's own frontend api.ts for both.

import { Actor, HttpAgent, polling } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { createHash } from "node:crypto";

export const CRUMBEATR_MAIN = "bpqth-gaaaa-aaaaj-qntfq-cai";
export const ICP_LEDGER = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const ICP_FEE = 10_000n;

// Positive reactions (id, credit cost): heart=10 (2cr), thumbs-up=11 (2cr), fire=50 (10cr)
export const REACTION_HEART = 10;
export const REACTION_FIRE = 50;

function crumbIdlFactory({ IDL }) {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const TransferArgs = IDL.Record({
    to: Account,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
  });
  return IDL.Service({
    add_post: IDL.Func(
      [
        IDL.Text,
        IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(IDL.Nat8))),
        IDL.Opt(IDL.Nat64),
        IDL.Opt(IDL.Text),
        IDL.Opt(IDL.Vec(IDL.Nat8)),
      ],
      [IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text })],
      [],
    ),
    set_avatar: IDL.Func(
      [IDL.Vec(IDL.Nat8)],
      [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })],
      [],
    ),
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ["query"]),
    icrc1_fee: IDL.Func([], [IDL.Nat], ["query"]),
    icrc1_symbol: IDL.Func([], [IDL.Text], ["query"]),
    icrc1_decimals: IDL.Func([], [IDL.Nat8], ["query"]),
    icrc1_transfer: IDL.Func(
      [TransferArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Unknown })],
      [],
    ),
  });
}

function icpLedgerIdlFactory({ IDL }) {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const TransferArg = IDL.Record({
    to: Account,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
  });
  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ["query"]),
    icrc1_transfer: IDL.Func(
      [TransferArg],
      [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Unknown })],
      [],
    ),
  });
}

/** Taggr invoice subaccount: [len, ...principal bytes, 0-padded to 32]. */
export function principalToSubaccount(principal) {
  const bytes = principal.toUint8Array();
  const sub = new Uint8Array(32);
  sub[0] = bytes.length;
  sub.set(bytes, 1);
  return sub;
}

/** Legacy ICP AccountIdentifier hex for (owner, subaccount). */
export function accountIdentifierHex(owner, subaccount) {
  const sha = createHash("sha224");
  sha.update(
    Buffer.concat([
      Buffer.from([0x0a]),
      Buffer.from("account-id"),
      Buffer.from(owner.toUint8Array()),
      Buffer.from(subaccount ?? new Uint8Array(32)),
    ]),
  );
  const h = sha.digest();
  let crc = 0xffffffff;
  for (const b of h) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc);
  return Buffer.concat([crcBuf, h]).toString("hex");
}

/** Filter undefined; 0 args → null, 1 arg → value, n args → array (Taggr convention). */
function effParams(args) {
  const values = args.filter((v) => typeof v !== "undefined");
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  return values;
}

export async function createCrumbeatrClient({
  identity,
  canisterId = CRUMBEATR_MAIN,
  host = "https://icp-api.io",
}) {
  const agent = await HttpAgent.create({ host, identity });
  const canisterPrincipal = Principal.fromText(canisterId);
  const me = identity.getPrincipal();
  const actor = Actor.createActor(crumbIdlFactory, { agent, canisterId });
  const icpLedger = Actor.createActor(icpLedgerIdlFactory, {
    agent,
    canisterId: ICP_LEDGER,
  });

  async function jsonQuery(methodName, ...args) {
    const arg = new TextEncoder().encode(JSON.stringify(effParams(args)));
    const response = await agent.query(canisterId, { methodName, arg });
    if (response.status !== "replied") {
      throw new Error(
        `Crumbeatr query ${methodName} rejected: ${JSON.stringify(response).slice(0, 300)}`,
      );
    }
    const bytes = response.reply.arg;
    if (!bytes || bytes.byteLength === 0) return null;
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  async function jsonCall(methodName, ...args) {
    const arg = new TextEncoder().encode(JSON.stringify(effParams(args)));
    const { requestId } = await agent.call(canisterPrincipal, {
      methodName,
      arg,
    });
    const pollResult = await polling.pollForResponse(
      agent,
      canisterPrincipal,
      requestId,
      polling.defaultStrategy(),
    );
    const bytes = pollResult?.reply ?? pollResult;
    if (!bytes || bytes.byteLength === 0) return null;
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  }

  return {
    principal: me,
    jsonQuery,
    jsonCall,

    // ── Profile / registration ──────────────────────────────────────────────
    /** Own profile, or null when this principal has no Crumbeatr account. */
    myProfile: () => jsonQuery("user", []),
    validateUsername: (name) => jsonQuery("validate_username", name),
    /** Requires the ICP invoice account to be funded (see invoice helpers). */
    createUser: (name, invite = null) => jsonCall("create_user", name, invite),
    setAvatar: (bytes) => actor.set_avatar([...bytes]),

    // ── Content ─────────────────────────────────────────────────────────────
    /** Returns new post id. Throws on Err. */
    async addPost(body, { parent = null, realm = null } = {}) {
      const res = await actor.add_post(
        body,
        [],
        parent === null ? [] : [BigInt(parent)],
        realm === null ? [] : [realm],
        [],
      );
      if ("Err" in res) throw new Error(`add_post: ${res.Err}`);
      return res.Ok;
    },
    react: (postId, reactionId = REACTION_HEART) =>
      jsonCall("react", postId, reactionId),
    /** Tip a post's author with CRUMB (raw token units). */
    tip: (postId, amount) => jsonCall("tip", postId, amount),

    // ── Feeds ───────────────────────────────────────────────────────────────
    hotPosts: (page = 0, offset = 0) => jsonQuery("hot_posts", "", page, offset),
    lastPosts: (page = 0, offset = 0) =>
      jsonQuery("last_posts", "", page, offset, true),
    thread: (postId) => jsonQuery("thread", postId),
    config: () => jsonQuery("config"),

    // ── Wallet: CRUMB (native, on main canister) + ICP ──────────────────────
    crumbBalance: () =>
      actor.icrc1_balance_of({ owner: me, subaccount: [] }),
    crumbFee: () => actor.icrc1_fee(),
    async crumbTransfer(toPrincipal, amount) {
      const res = await actor.icrc1_transfer({
        to: { owner: toPrincipal, subaccount: [] },
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount,
      });
      if ("Err" in res) {
        throw new Error(`CRUMB transfer failed: ${JSON.stringify(res.Err)}`);
      }
      return res.Ok;
    },
    icpBalance: () =>
      icpLedger.icrc1_balance_of({ owner: me, subaccount: [] }),
    async icpTransfer(toOwner, amount, subaccount = null) {
      const res = await icpLedger.icrc1_transfer({
        to: {
          owner: toOwner,
          subaccount: subaccount ? [[...subaccount]] : [],
        },
        fee: [ICP_FEE],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount,
      });
      if ("Err" in res) {
        throw new Error(`ICP transfer failed: ${JSON.stringify(res.Err)}`);
      }
      return res.Ok;
    },

    // ── Registration invoice (Taggr credits) ────────────────────────────────
    /** The ICP account that pays this principal's Crumbeatr invoice. */
    invoiceSubaccount: () => principalToSubaccount(me),
    invoiceAccountHex: () =>
      accountIdentifierHex(canisterPrincipal, principalToSubaccount(me)),
    /** Send ICP from the captain's wallet to their Crumbeatr invoice account. */
    fundInvoice(amountE8s) {
      return this.icpTransfer(canisterPrincipal, amountE8s, principalToSubaccount(me));
    },
    /** Convert deposited ICP to credits (0 = minimum 1k credits, used by create_user). */
    mintCredits: (kiloCredits = 0) => jsonCall("mint_credits", kiloCredits),
  };
}
