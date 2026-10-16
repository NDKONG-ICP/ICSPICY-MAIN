import { Actor, HttpAgent, type ActorSubclass } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { BACKEND_CANISTER_ID, IC_HOST } from "./auth-config";
import { idlFactory as backendIdlFactory } from "../declarations/backend.did.js";

type LooseIdl = (args: { IDL: typeof import("@dfinity/candid").IDL }) => unknown;

export const BONSAI_MARKET_REGISTRY = "jyi55-xqaaa-aaaau-agwlq-cai";
export const BONSAI_MARKETPLACE = "i3eu3-diaaa-aaaau-agwna-cai";
export const BONSAI_INDEXER = "iodfw-caaaa-aaaau-agwoq-cai";
export const BONSAI_COLLECTION_ID = 1;
export const CAPTAIN_PRINCIPAL =
  "26mw6-xnm4d-zfj7n-rjrrj-pnr3u-jasxq-wnmkp-4gfgt-xrtma-i7ghg-6qe";
export const BAZAAR_URL = "https://iabi6-zqaaa-aaaau-agwpq-cai.icp0.io/";

const ICP_LEDGER = "ryjl3-tyaaa-aaaaa-aaaba-cai";

export type BonsaiDropManifest = {
  version: number;
  createdAt: string;
  seedHex: string;
  seedHash: string;
  eligibleCount: number;
  tokenIds: number[];
  rarity: Record<string, string>;
  priceE8s: number;
  seller: string;
  collectionId: number;
  phases: {
    transferred: number[];
    approved: number[];
    listings: Record<string, number>;
  };
};

export type BonsaiListing = {
  id: bigint;
  active: boolean;
  collectionId: bigint;
  tokenId: bigint;
  priceE8s: bigint;
  seller: Principal;
  createdAt: bigint;
};

export type BonsaiActivityItem = {
  id: bigint;
  kind: "Sale" | "List" | "CancelList" | "Mint" | "Offer";
  collectionId: bigint;
  tokenId: bigint | null;
  priceE8s: bigint | null;
  who: Principal;
  timestamp: bigint;
};

export type BonsaiCollectionStats = {
  name: string;
  listedCount: bigint;
  floorPriceE8s: bigint;
  volumeE8s: bigint;
  royaltyBps: bigint;
};

const marketplaceIdl: LooseIdl = ({ IDL }) => {
  const Listing = IDL.Record({
    id: IDL.Nat,
    active: IDL.Bool,
    collectionId: IDL.Nat,
    tokenId: IDL.Nat,
    priceE8s: IDL.Nat,
    seller: IDL.Principal,
    createdAt: IDL.Nat64,
  });
  return IDL.Service({
    listCollectionListings: IDL.Func([IDL.Nat], [IDL.Vec(Listing)], ["query"]),
    getListing: IDL.Func([IDL.Nat], [IDL.Opt(Listing)], ["query"]),
  });
};

const indexerIdl: LooseIdl = ({ IDL }) => {
  const ActivityItem = IDL.Record({
    id: IDL.Nat,
    kind: IDL.Variant({
      Sale: IDL.Null,
      List: IDL.Null,
      CancelList: IDL.Null,
      Mint: IDL.Null,
      Offer: IDL.Null,
    }),
    collectionId: IDL.Nat,
    tokenId: IDL.Opt(IDL.Nat),
    priceE8s: IDL.Opt(IDL.Nat),
    who: IDL.Principal,
    timestamp: IDL.Nat64,
  });
  return IDL.Service({
    getCollectionActivity: IDL.Func(
      [IDL.Nat, IDL.Nat, IDL.Nat],
      [IDL.Vec(ActivityItem)],
      ["query"],
    ),
  });
};

const registryIdl: LooseIdl = ({ IDL }) => {
  const CollectionRecord = IDL.Record({
    id: IDL.Nat,
    name: IDL.Text,
    listedCount: IDL.Nat,
    floorPriceE8s: IDL.Nat,
    volumeE8s: IDL.Nat,
    royaltyBps: IDL.Nat,
  });
  return IDL.Service({
    getCollection: IDL.Func([IDL.Nat], [IDL.Opt(CollectionRecord)], ["query"]),
  });
};

const icpLedgerIdl: LooseIdl = ({ IDL }) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ["query"]),
  });
};

async function anonAgent() {
  return HttpAgent.create({ host: IC_HOST });
}

function parseActivityKind(
  k: Record<string, unknown>,
): BonsaiActivityItem["kind"] {
  if ("Sale" in k) return "Sale";
  if ("List" in k) return "List";
  if ("CancelList" in k) return "CancelList";
  if ("Mint" in k) return "Mint";
  return "Offer";
}

export async function fetchBonsaiDropManifest(): Promise<BonsaiDropManifest | null> {
  const base = import.meta.env.PROD
    ? window.location.origin
    : "https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io";
  try {
    const res = await fetch(`${base}/bonsai-drop/manifest.json`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as BonsaiDropManifest;
  } catch {
    return null;
  }
}

export async function fetchBonsaiCollectionStats(): Promise<BonsaiCollectionStats | null> {
  const agent = await anonAgent();
  const registry = Actor.createActor(registryIdl as never, {
    agent,
    canisterId: BONSAI_MARKET_REGISTRY,
  }) as ActorSubclass<{ getCollection: (id: bigint) => Promise<[unknown] | []> }>;
  const opt = await registry.getCollection(BigInt(BONSAI_COLLECTION_ID));
  const row = opt?.[0] as BonsaiCollectionStats & { name: string } | undefined;
  if (!row) return null;
  return {
    name: row.name,
    listedCount: row.listedCount,
    floorPriceE8s: row.floorPriceE8s,
    volumeE8s: row.volumeE8s,
    royaltyBps: row.royaltyBps,
  };
}

export async function fetchBonsaiListings(): Promise<BonsaiListing[]> {
  const agent = await anonAgent();
  const mkt = Actor.createActor(marketplaceIdl as never, {
    agent,
    canisterId: BONSAI_MARKETPLACE,
  }) as ActorSubclass<{
    listCollectionListings: (id: bigint) => Promise<BonsaiListing[]>;
  }>;
  return mkt.listCollectionListings(BigInt(BONSAI_COLLECTION_ID));
}

export async function fetchBonsaiActivity(
  limit = 500,
): Promise<BonsaiActivityItem[]> {
  const agent = await anonAgent();
  const idx = Actor.createActor(indexerIdl as never, {
    agent,
    canisterId: BONSAI_INDEXER,
  }) as ActorSubclass<{
    getCollectionActivity: (
      c: bigint,
      o: bigint,
      l: bigint,
    ) => Promise<
      Array<{
        id: bigint;
        kind: Record<string, unknown>;
        collectionId: bigint;
        tokenId: [] | [bigint];
        priceE8s: [] | [bigint];
        who: Principal;
        timestamp: bigint;
      }>
    >;
  }>;
  const rows = await idx.getCollectionActivity(
    BigInt(BONSAI_COLLECTION_ID),
    0n,
    BigInt(limit),
  );
  return rows.map(
    (r: {
      id: bigint;
      kind: Record<string, unknown>;
      collectionId: bigint;
      tokenId: [] | [bigint];
      priceE8s: [] | [bigint];
      who: Principal;
      timestamp: bigint;
    }) => ({
      id: r.id,
      kind: parseActivityKind(r.kind),
      collectionId: r.collectionId,
      tokenId: r.tokenId?.[0] ?? null,
      priceE8s: r.priceE8s?.[0] ?? null,
      who: r.who,
      timestamp: r.timestamp,
    }),
  );
}

export async function fetchCaptainIcpBalanceE8s(): Promise<bigint> {
  const agent = await anonAgent();
  const icp = Actor.createActor(icpLedgerIdl as never, {
    agent,
    canisterId: ICP_LEDGER,
  }) as ActorSubclass<{
    icrc1_balance_of: (a: {
      owner: Principal;
      subaccount: [];
    }) => Promise<bigint>;
  }>;
  const bal = await icp.icrc1_balance_of({
    owner: Principal.fromText(CAPTAIN_PRINCIPAL),
    subaccount: [],
  });
  return bal;
}

export async function fetchTokenOwners(
  tokenIds: number[],
): Promise<Map<number, string>> {
  const agent = await anonAgent();
  const backend = Actor.createActor(backendIdlFactory as never, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  }) as ActorSubclass<{
    icrc7_owner_of: (
      ids: bigint[],
    ) => Promise<Array<[] | [{ owner: Principal; subaccount: [] | [Uint8Array] }]>>;
  }>;
  const out = new Map<number, string>();
  const batch = 200;
  for (let i = 0; i < tokenIds.length; i += batch) {
    const slice = tokenIds.slice(i, i + batch);
    const owners = await backend.icrc7_owner_of(slice.map((t) => BigInt(t)));
    for (let j = 0; j < slice.length; j += 1) {
      const acc = owners[j]?.[0];
      if (acc?.owner) out.set(slice[j], acc.owner.toText());
    }
  }
  return out;
}

export function e8sToIcp(e8s: bigint | number): number {
  return Number(e8s) / 1e8;
}

export function bazaarTokenUrl(tokenId: number | bigint): string {
  return `${BAZAAR_URL}?collection=${BONSAI_COLLECTION_ID}&token=${tokenId}`;
}

/** Hedera mirror helpers (Phase B dashboard). */
export type HederaNftRow = {
  serial: number;
  accountId: string | null;
};

export async function fetchHederaTokenNfts(
  tokenId: string,
  limit = 500,
): Promise<HederaNftRow[]> {
  const mirror =
    import.meta.env.VITE_HEDERA_MIRROR?.trim() ||
    "https://mainnet-public.mirrornode.hedera.com";
  const url = `${mirror}/api/v1/tokens/${tokenId}/nfts?limit=${limit}&order=asc`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as {
    nfts?: Array<{ serial_number: number; account_id: string | null }>;
  };
  return (json.nfts ?? []).map((n) => ({
    serial: n.serial_number,
    accountId: n.account_id,
  }));
}
