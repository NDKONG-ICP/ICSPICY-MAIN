/** Hedera mirror-node + SentX live data for the admin dashboard. */

export const HEDERA_MIRROR =
  import.meta.env.VITE_HEDERA_MIRROR?.trim() ||
  "https://mainnet-public.mirrornode.hedera.com";

const SENTX_API =
  import.meta.env.VITE_SENTX_API?.trim() || "https://api.sentx.io";
const SENTX_API_KEY = import.meta.env.VITE_SENTX_API_KEY?.trim() ?? "";

export const SENTX_URL = "https://sentx.io";
export const HASHSCAN_URL = "https://hashscan.io/mainnet";

export type CaptainHederaInfo = {
  accountId: string | null;
  publicKey: string | null;
  network: string;
  updatedAt: string;
};

export type HederaAccountSummary = {
  accountId: string;
  balanceHbar: number;
  updatedAt: string;
};

export type HederaTxRow = {
  transactionId: string;
  name: string;
  result: string;
  consensusAt: string;
  /** Net HBAR movement for the watched account (positive = received). */
  netHbar: number;
};

export type SentxListingRow = {
  tokenId: string;
  serial: number | null;
  priceHbar: number | null;
  seller: string | null;
  url: string | null;
};

export type SentxSaleRow = {
  tokenId: string;
  serial: number | null;
  priceHbar: number | null;
  buyer: string | null;
  soldAt: string | null;
};

/** Published by worker `hedera-captain-setup.js --resolve` to the asset canister. */
export async function fetchCaptainHederaInfo(): Promise<CaptainHederaInfo | null> {
  const base = import.meta.env.PROD
    ? window.location.origin
    : "https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io";
  try {
    const res = await fetch(`${base}/hedera/captain.json`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as CaptainHederaInfo;
  } catch {
    return null;
  }
}

export async function fetchHederaAccountSummary(
  accountId: string,
): Promise<HederaAccountSummary | null> {
  try {
    const res = await fetch(`${HEDERA_MIRROR}/api/v1/accounts/${accountId}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      balance?: { balance?: number };
    };
    const tiny = json.balance?.balance ?? 0;
    return {
      accountId,
      balanceHbar: tiny / 1e8,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function fetchHederaTransactions(
  accountId: string,
  limit = 25,
): Promise<HederaTxRow[]> {
  try {
    const res = await fetch(
      `${HEDERA_MIRROR}/api/v1/transactions?account.id=${accountId}&limit=${limit}&order=desc`,
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      transactions?: Array<{
        transaction_id: string;
        name: string;
        result: string;
        consensus_timestamp: string;
        transfers?: Array<{ account: string; amount: number }>;
      }>;
    };
    return (json.transactions ?? []).map((t) => {
      const net =
        (t.transfers ?? [])
          .filter((x) => x.account === accountId)
          .reduce((a, x) => a + x.amount, 0) / 1e8;
      const secs = Number(t.consensus_timestamp?.split(".")[0] ?? 0);
      return {
        transactionId: t.transaction_id,
        name: t.name,
        result: t.result,
        consensusAt: secs ? new Date(secs * 1000).toLocaleString() : "—",
        netHbar: net,
      };
    });
  } catch {
    return [];
  }
}

function sentxHeaders(): HeadersInit {
  return SENTX_API_KEY ? { "x-api-key": SENTX_API_KEY } : {};
}

async function sentxGet(path: string): Promise<unknown | null> {
  if (!SENTX_API_KEY) return null;
  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${SENTX_API}${path}${sep}apikey=${SENTX_API_KEY}`, {
      headers: sentxHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * SentX public market API (requires VITE_SENTX_API_KEY).
 * Response shapes are defensive — SentX may evolve the schema.
 */
export async function fetchSentxListings(
  htsTokenId: string,
): Promise<SentxListingRow[]> {
  const json = (await sentxGet(
    `/v1/public/market/listings?token=${htsTokenId}&limit=100`,
  )) as { marketListings?: unknown[]; listings?: unknown[] } | null;
  const rows = json?.marketListings ?? json?.listings ?? [];
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      tokenId: htsTokenId,
      serial: num(o.serialNumber ?? o.serial ?? o.serialId),
      priceHbar: num(o.salePrice ?? o.price ?? o.listingPrice),
      seller: typeof o.sellerAddress === "string" ? o.sellerAddress : null,
      url:
        typeof o.marketplaceListingUrl === "string"
          ? o.marketplaceListingUrl
          : `${SENTX_URL}/nft-marketplace/${htsTokenId}`,
    };
  });
}

export async function fetchSentxSales(
  htsTokenId: string,
): Promise<SentxSaleRow[]> {
  const json = (await sentxGet(
    `/v1/public/market/activity?token=${htsTokenId}&activityFilter=Sales&limit=100`,
  )) as { marketActivity?: unknown[]; activity?: unknown[] } | null;
  const rows = json?.marketActivity ?? json?.activity ?? [];
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      tokenId: htsTokenId,
      serial: num(o.serialNumber ?? o.serial),
      priceHbar: num(o.salePrice ?? o.price),
      buyer: typeof o.buyerAddress === "string" ? o.buyerAddress : null,
      soldAt:
        typeof o.saleDate === "string"
          ? o.saleDate
          : typeof o.timestamp === "string"
            ? o.timestamp
            : null,
    };
  });
}

export function sentxConfigured(): boolean {
  return Boolean(SENTX_API_KEY);
}

export type HederaTokenBalance = {
  tokenId: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
};

export async function fetchHederaTokenBalances(
  accountId: string,
): Promise<HederaTokenBalance[]> {
  try {
    const res = await fetch(
      `${HEDERA_MIRROR}/api/v1/accounts/${accountId}/tokens?limit=100`,
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      tokens?: Array<{
        token_id?: string;
        symbol?: string;
        name?: string;
        balance?: number;
        decimals?: number;
      }>;
    };
    return (json.tokens ?? []).map((t) => {
      const decimals = t.decimals ?? 0;
      const raw = t.balance ?? 0;
      const balance =
        decimals > 0 ? (raw / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(raw);
      return {
        tokenId: t.token_id ?? "",
        symbol: t.symbol || "NFT",
        name: t.name || t.token_id || "",
        balance,
        decimals,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchSentxCollectionTracked(
  tokenId: string,
): Promise<{ tracked: boolean; detail: string }> {
  try {
    const res = await fetch(`${SENTX_API}/v1/public/collection/${tokenId}/facts`);
    if (res.status === 404) {
      return { tracked: false, detail: "SentX does not track this collection yet" };
    }
    if (!res.ok) return { tracked: false, detail: `SentX returned ${res.status}` };
    return { tracked: true, detail: "SentX tracks this collection" };
  } catch {
    return { tracked: false, detail: "SentX facts request failed" };
  }
}

export function hashscanAccountUrl(accountId: string): string {
  return `${HASHSCAN_URL}/account/${accountId}`;
}

export function hashscanTokenUrl(tokenId: string): string {
  return `${HASHSCAN_URL}/token/${tokenId}`;
}
