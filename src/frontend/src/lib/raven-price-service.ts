import { Actor, HttpAgent } from "@dfinity/agent";

const ICPSWAP_NODE_INDEX = "ggzvv-5qaaa-aaaag-qck7a-cai";
const RAVEN_CANISTER_ID = "4k7jk-vyaaa-aaaam-qcyaa-cai";

const nodeIndexIdlFactory = ({ IDL }: { IDL: typeof import("@dfinity/candid").IDL }) => {
  const PublicTokenOverview = IDL.Record({
    id: IDL.Nat,
    volumeUSD1d: IDL.Float64,
    volumeUSD7d: IDL.Float64,
    totalVolumeUSD: IDL.Float64,
    name: IDL.Text,
    volumeUSD: IDL.Float64,
    feesUSD: IDL.Float64,
    priceUSDChange: IDL.Float64,
    address: IDL.Text,
    txCount: IDL.Int,
    priceUSD: IDL.Float64,
    standard: IDL.Text,
    symbol: IDL.Text,
  });
  return IDL.Service({
    getAllTokens: IDL.Func([], [IDL.Vec(PublicTokenOverview)], ["query"]),
  });
};

interface RavenPriceCache {
  usd: number;
  fetchedAt: number;
}

let ravenPriceCache: RavenPriceCache | null = null;
const RAVEN_CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes

export async function fetchRavenPriceUSD(): Promise<number | null> {
  if (ravenPriceCache && Date.now() - ravenPriceCache.fetchedAt < RAVEN_CACHE_TTL_MS) {
    return ravenPriceCache.usd;
  }
  try {
    const agent = await HttpAgent.create({ host: "https://icp-api.io" });
    // Never call fetchRootKey — mainnet only.
    const actor = Actor.createActor(nodeIndexIdlFactory as never, {
      agent,
      canisterId: ICPSWAP_NODE_INDEX,
    }) as { getAllTokens: () => Promise<Array<{ address: string; priceUSD: number }>> };

    const allTokens = await actor.getAllTokens();
    const raven = allTokens.find((t) => t.address === RAVEN_CANISTER_ID);
    if (raven && raven.priceUSD > 0) {
      ravenPriceCache = { usd: raven.priceUSD, fetchedAt: Date.now() };
      return raven.priceUSD;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch RAVEN price from ICPSwap:", e);
    return null;
  }
}

export function clearRavenPriceCache(): void {
  ravenPriceCache = null;
}
