import { fetchRavenPriceUSD } from "./raven-price-service";

const COINGECKO_IDS: Record<string, string> = {
  ICP: "internet-computer",
  ckBTC: "bitcoin",
  ckETH: "ethereum",
  ckUSDC: "usd-coin",
  ckUSDT: "tether",
  SOL: "solana",
  BTC: "bitcoin",
  ETH: "ethereum",
};

interface PriceData {
  usd: number;
  lastUpdated: number;
}

let priceCache: Record<string, PriceData> = {};
let lastFetch = 0;
const CACHE_TTL_MS = 60_000;

export async function fetchTokenPricesUsd(): Promise<Record<string, number>> {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL_MS && Object.keys(priceCache).length > 0) {
    return Object.fromEntries(
      Object.entries(priceCache).map(([k, v]) => [k, v.usd]),
    );
  }

  const ids = [...new Set(Object.values(COINGECKO_IDS))].join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

  // Fetch CoinGecko prices and RAVEN price (ICPSwap) in parallel.
  const [geckoRes, ravenPrice] = await Promise.all([
    fetch(url),
    fetchRavenPriceUSD().catch(() => null),
  ]);

  if (!geckoRes.ok) throw new Error(`CoinGecko API error: ${geckoRes.status}`);
  const data = (await geckoRes.json()) as Record<string, { usd?: number }>;

  const prices: Record<string, number> = {};
  for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
    const usd = data[geckoId]?.usd;
    if (usd != null && usd > 0) {
      prices[symbol] = usd;
      priceCache[symbol] = { usd, lastUpdated: now };
    }
  }

  // RAVEN price from ICPSwap on-chain query.
  if (ravenPrice != null && ravenPrice > 0) {
    prices["RAVEN"] = ravenPrice;
    priceCache["RAVEN"] = { usd: ravenPrice, lastUpdated: now };
  }

  lastFetch = now;
  return prices;
}

export function usdToTokenAmount(
  usdAmount: number,
  tokenPriceUsd: number,
  decimals: number,
): bigint {
  const tokenAmount = usdAmount / tokenPriceUsd;
  return BigInt(Math.ceil(tokenAmount * 10 ** decimals));
}

/** Clear module cache (tests / forced refresh). */
export function resetPriceCache(): void {
  priceCache = {};
  lastFetch = 0;
}
