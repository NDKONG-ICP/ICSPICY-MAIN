// Capsaicin / BonsaiOS portfolio helpers for Admin UI (public queries + mgmt).

import { Actor, HttpAgent, type ActorSubclass } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

export const CAPTAIN_PRINCIPAL =
  "26mw6-xnm4d-zfj7n-rjrrj-pnr3u-jasxq-wnmkp-4gfgt-xrtma-i7ghg-6qe";

export const CAPTAIN_AGENT_IDS = {
  crumbeatr: 17n,
  swop: 18n,
  bonsai: 19n,
} as const;

export const BONSAI_NFT_LEDGER = "ivgzt-yyaaa-aaaau-agwma-cai";
export const CRUMBEATR = "bpqth-gaaaa-aaaaj-qntfq-cai";
export const SWOP_SOCIAL = "5srr6-caaaa-aaaac-qgena-cai";
export const AGENT_HUB = "swzzi-lyaaa-aaaao-bbfha-cai";
export const BACKEND = "ghxmp-xiaaa-aaaao-ba4sq-cai";
export const MANAGEMENT = "aaaaa-aa";

const HOST =
  typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? "http://127.0.0.1:4943"
    : "https://icp-api.io";

async function anonAgent(identity?: import("@dfinity/agent").Identity) {
  const agent = await HttpAgent.create({
    host: HOST,
    identity: identity ?? undefined,
  });
  if (HOST.includes("127.0.0.1")) {
    await agent.fetchRootKey().catch(() => {});
  }
  return agent;
}

// Loose IDL factories — cast at createActor (same pattern as useTokenBalances).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseIdl = (args: { IDL: any }) => any;

const bonsaiLedgerIdl: LooseIdl = ({ IDL: I }) => {
  const Account = I.Record({
    owner: I.Principal,
    subaccount: I.Opt(I.Vec(I.Nat8)),
  });
  const TokenMetadata = I.Record({
    animationUrl: I.Opt(I.Text),
    description: I.Text,
    image: I.Text,
    mediaMime: I.Opt(I.Text),
    name: I.Text,
    traits: I.Vec(I.Tuple(I.Text, I.Text)),
  });
  return I.Service({
    icrc7_tokens_of: I.Func(
      [Account, I.Opt(I.Nat), I.Opt(I.Nat)],
      [I.Vec(I.Nat)],
      ["query"],
    ),
    icrc7_metadata: I.Func(
      [I.Vec(I.Nat)],
      [I.Vec(I.Opt(TokenMetadata))],
      ["query"],
    ),
    icrc7_collection_of: I.Func([I.Nat], [I.Opt(I.Nat)], ["query"]),
  });
};

const managementIdl: LooseIdl = ({ IDL: I }) => {
  const definiteCanisterSettings = I.Record({
    freezing_threshold: I.Nat,
    controllers: I.Vec(I.Principal),
    memory_allocation: I.Nat,
    compute_allocation: I.Nat,
  });
  return I.Service({
    canister_status: I.Func(
      [I.Record({ canister_id: I.Principal })],
      [
        I.Record({
          status: I.Variant({
            stopped: I.Null,
            stopping: I.Null,
            running: I.Null,
          }),
          memory_size: I.Nat,
          cycles: I.Nat,
          settings: definiteCanisterSettings,
          idle_cycles_burned_per_day: I.Nat,
          module_hash: I.Opt(I.Vec(I.Nat8)),
        }),
      ],
      [],
    ),
    update_settings: I.Func(
      [
        I.Record({
          canister_id: I.Principal,
          settings: I.Record({
            freezing_threshold: I.Opt(I.Nat),
            controllers: I.Opt(I.Vec(I.Principal)),
            memory_allocation: I.Opt(I.Nat),
            compute_allocation: I.Opt(I.Nat),
          }),
        }),
      ],
      [],
      [],
    ),
  });
};

const swopSocialIdl: LooseIdl = ({ IDL: I }) => {
  const MediaRef = I.Record({
    accessPolicy: I.Variant({
      CreatorOnly: I.Null,
      Paid: I.Null,
      Public: I.Null,
    }),
    mediaId: I.Text,
    mimeType: I.Text,
  });
  const ExecutionContext = I.Record({
    agentId: I.Text,
    capabilitySnapshotId: I.Opt(I.Text),
    executedAt: I.Nat64,
  });
  const Post = I.Record({
    author: I.Principal,
    content: I.Text,
    createdAt: I.Nat64,
    deleted: I.Bool,
    editedAt: I.Opt(I.Nat64),
    executionContext: I.Opt(ExecutionContext),
    id: I.Text,
    mediaRef: I.Opt(MediaRef),
    repostOf: I.Opt(I.Text),
    stationId: I.Opt(I.Text),
  });
  return I.Service({
    getPublicRecentPosts: I.Func([I.Nat], [I.Vec(Post)], ["query"]),
    getPostsByUser: I.Func([I.Principal], [I.Vec(Post)], ["query"]),
  });
};

const crumbBalanceIdl: LooseIdl = ({ IDL: I }) => {
  const Account = I.Record({
    owner: I.Principal,
    subaccount: I.Opt(I.Vec(I.Nat8)),
  });
  return I.Service({
    icrc1_balance_of: I.Func([Account], [I.Nat], ["query"]),
  });
};

export type CapsaicinNftCard = {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collectionId: string | null;
  traits: Array<{ trait: string; value: string }>;
  source: "bonsai" | "icspicy";
};

export async function fetchBonsaiNftsForPrincipal(
  principalText: string,
): Promise<CapsaicinNftCard[]> {
  const agent = await anonAgent();
  const actor = Actor.createActor(bonsaiLedgerIdl as never, {
    agent,
    canisterId: BONSAI_NFT_LEDGER,
  }) as ActorSubclass<{
    icrc7_tokens_of: (
      a: { owner: Principal; subaccount: [] },
      o: [] | [bigint],
      l: [] | [bigint],
    ) => Promise<bigint[]>;
    icrc7_metadata: (
      ids: bigint[],
    ) => Promise<
      Array<
        [] | [{
          name: string;
          description: string;
          image: string;
          traits: Array<[string, string]>;
        }]
      >
    >;
    icrc7_collection_of: (id: bigint) => Promise<[] | [bigint]>;
  }>;
  const owner = Principal.fromText(principalText);
  const ids = await actor.icrc7_tokens_of(
    { owner, subaccount: [] },
    [],
    [100n],
  );
  if (!ids.length) return [];
  const metas = await actor.icrc7_metadata(ids);
  const out: CapsaicinNftCard[] = [];
  for (let i = 0; i < ids.length; i++) {
    const meta = metas[i]?.[0];
    if (!meta) continue;
    let collectionId: string | null = null;
    try {
      const c = await actor.icrc7_collection_of(ids[i]);
      if (c?.[0] != null) collectionId = c[0].toString();
    } catch {
      /* ignore */
    }
    out.push({
      tokenId: ids[i].toString(),
      name: meta.name,
      description: meta.description,
      image: meta.image,
      collectionId,
      traits: meta.traits.map(([trait, value]) => ({ trait, value })),
      source: "bonsai",
    });
  }
  return out;
}

export async function fetchCanisterControllers(
  canisterId: string,
  identity: import("@dfinity/agent").Identity,
): Promise<{ controllers: string[]; cycles: string; status: string }> {
  const agent = await anonAgent(identity);
  const mgmt = Actor.createActor(managementIdl as never, {
    agent,
    canisterId: MANAGEMENT,
  }) as ActorSubclass<{
    canister_status: (arg: {
      canister_id: Principal;
    }) => Promise<{
      status: Record<string, null>;
      cycles: bigint;
      settings: { controllers: Principal[] };
    }>;
  }>;
  const st = await mgmt.canister_status({
    canister_id: Principal.fromText(canisterId),
  });
  return {
    controllers: st.settings.controllers.map((p) => p.toText()),
    cycles: st.cycles.toString(),
    status: Object.keys(st.status)[0] ?? "unknown",
  };
}

export async function addCanisterController(
  canisterId: string,
  newController: string,
  identity: import("@dfinity/agent").Identity,
): Promise<string[]> {
  const current = await fetchCanisterControllers(canisterId, identity);
  if (current.controllers.includes(newController)) return current.controllers;
  const next = [...current.controllers, newController];
  const agent = await anonAgent(identity);
  const mgmt = Actor.createActor(managementIdl as never, {
    agent,
    canisterId: MANAGEMENT,
  }) as ActorSubclass<{
    update_settings: (arg: {
      canister_id: Principal;
      settings: {
        freezing_threshold: [] | [bigint];
        controllers: [] | [Principal[]];
        memory_allocation: [] | [bigint];
        compute_allocation: [] | [bigint];
      };
    }) => Promise<void>;
  }>;
  await mgmt.update_settings({
    canister_id: Principal.fromText(canisterId),
    settings: {
      freezing_threshold: [],
      controllers: [next.map((p) => Principal.fromText(p))],
      memory_allocation: [],
      compute_allocation: [],
    },
  });
  return next;
}

export type FeedPost = {
  id: string;
  author: string;
  body: string;
  createdAt?: string;
  platform: "crumbeatr" | "swop";
};

export async function fetchCrumbeatrFeed(limit = 20): Promise<FeedPost[]> {
  const agent = await anonAgent();
  const canisterId = Principal.fromText(CRUMBEATR);
  for (const methodName of ["last_posts", "hot_posts"] as const) {
    try {
      const args = new TextEncoder().encode(
        JSON.stringify(
          methodName === "last_posts" ? ["", 0, 0, true] : ["", 0, 0],
        ),
      );
      const res = await agent.query(canisterId, { methodName, arg: args });
      if (res && "reply" in res && res.reply && "arg" in res.reply) {
        const raw = new TextDecoder().decode(res.reply.arg as Uint8Array);
        const posts = JSON.parse(raw) as Array<{
          id: number;
          body?: string;
          user?: number;
        }>;
        return (posts ?? []).slice(0, limit).map((p) => ({
          id: String(p.id),
          author: String(p.user ?? "?"),
          body: String(p.body ?? "").slice(0, 400),
          platform: "crumbeatr" as const,
        }));
      }
    } catch {
      /* try next */
    }
  }
  return [];
}

export async function fetchSwopFeed(
  captainPrincipal: string,
  limit = 20,
): Promise<{ mine: FeedPost[]; recent: FeedPost[] }> {
  const agent = await anonAgent();
  const social = Actor.createActor(swopSocialIdl as never, {
    agent,
    canisterId: SWOP_SOCIAL,
  }) as ActorSubclass<{
    getPublicRecentPosts: (n: bigint) => Promise<
      Array<{
        id: string;
        author: Principal;
        content: string;
        deleted: boolean;
        createdAt: bigint;
      }>
    >;
    getPostsByUser: (p: Principal) => Promise<
      Array<{
        id: string;
        author: Principal;
        content: string;
        deleted: boolean;
        createdAt: bigint;
      }>
    >;
  }>;
  const map = (
    posts: Array<{
      id: string;
      author: Principal;
      content: string;
      deleted: boolean;
      createdAt: bigint;
    }>,
  ): FeedPost[] =>
    posts
      .filter((p) => !p.deleted)
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        author: p.author.toText(),
        body: p.content.slice(0, 400),
        createdAt: new Date(Number(p.createdAt / 1_000_000n)).toLocaleString(),
        platform: "swop" as const,
      }));

  const [recent, mine] = await Promise.all([
    social.getPublicRecentPosts(BigInt(limit)).catch(() => []),
    social
      .getPostsByUser(Principal.fromText(captainPrincipal))
      .catch(() => []),
  ]);
  return { recent: map(recent), mine: map(mine) };
}

export async function fetchCrumbBalance(principalText: string): Promise<bigint> {
  const agent = await anonAgent();
  const actor = Actor.createActor(crumbBalanceIdl as never, {
    agent,
    canisterId: CRUMBEATR,
  }) as ActorSubclass<{
    icrc1_balance_of: (a: {
      owner: Principal;
      subaccount: [];
    }) => Promise<bigint>;
  }>;
  return actor.icrc1_balance_of({
    owner: Principal.fromText(principalText),
    subaccount: [],
  });
}
