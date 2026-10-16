/**
 * Keyless SentX reads. Buys are not sent from here.
 * https://api.sentx.io/v1/public/collection/resolve
 */

const SENTX = "https://api.sentx.io";

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.apimessage || `SentX ${res.status}`);
  }
  return body;
}

export async function resolveCollection(name) {
  const url = `${SENTX}/v1/public/collection/resolve?q=${encodeURIComponent(name)}`;
  const body = await getJson(url);
  return body.matches ?? [];
}

export async function collectionFacts(tokenId) {
  const body = await getJson(`${SENTX}/v1/public/collection/${tokenId}/facts`);
  return {
    tokenId: body.token || tokenId,
    name: String(body.name || "").trim(),
    floor: Number(body.floor),
    floorCurrency: body.floorCurrency || "HBAR",
    owners: body.owners ?? null,
    supply: body.supply ?? null,
    marketplaceUrl: body.marketplaceUrl || `https://sentx.io/nft-marketplace/${tokenId}`,
  };
}
