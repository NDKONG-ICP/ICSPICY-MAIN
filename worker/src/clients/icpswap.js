/**
 * Read-only ICPSwap quotes. Live swaps stay off; the policy allowlist is empty.
 */

const INFO_URL = "https://api.icpswap.com/info/token/all";

export const WATCH = [
  { symbol: "ICP", ledger: "ryjl3-tyaaa-aaaaa-aaaba-cai" },
  { symbol: "ckBTC", ledger: "mxzaz-hqaaa-aaaar-qaada-cai" },
  { symbol: "ckETH", ledger: "ss2fx-dyaaa-aaaar-qacoq-cai" },
  { symbol: "ckUSDC", ledger: "xevnm-gaaaa-aaaar-qafnq-cai" },
];

export async function fetchIcpSwapQuotes() {
  const res = await fetch(INFO_URL, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`ICPSwap info ${res.status}`);
  const body = await res.json();
  const rows = Array.isArray(body?.data) ? body.data : [];
  return WATCH.map((want) => {
    const hits = rows.filter(
      (row) => row.tokenSymbol === want.symbol && row.tokenLedgerId === want.ledger,
    );
    const top = hits.sort((a, b) => Number(b.tvlUSD) - Number(a.tvlUSD))[0];
    if (!top) return { symbol: want.symbol, priceUsd: null, tvlUsd: null };
    return {
      symbol: want.symbol,
      priceUsd: top.price,
      tvlUsd: top.tvlUSD,
    };
  });
}
