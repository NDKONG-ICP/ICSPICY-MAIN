export const ICSPICY_BACKEND = "ghxmp-xiaaa-aaaao-ba4sq-cai";
export const CAPTAIN_PRINCIPAL =
  "26mw6-xnm4d-zfj7n-rjrrj-pnr3u-jasxq-wnmkp-4gfgt-xrtma-i7ghg-6qe";
export const BONSAI_COLLECTION_ID = 1n;
export const DROP_SIZE = 888;
export const DROP_PRICE_E8S = 120_000_000n; // 1.2 ICP
export const PH_START = 7839;
export const PH_END = 8726;
export const MAX_TOKEN = 8888;
export const ICRC7_BATCH = 200;

export function isPepperHeadToken(tokenId) {
  const id = Number(tokenId);
  if (id <= 0 || id > MAX_TOKEN) return false;
  const poolId = id - 1;
  return poolId >= 7838 && poolId < 8726;
}

export function isEligiblePlantPoolToken(tokenId) {
  const id = Number(tokenId);
  if (id <= 0 || id > MAX_TOKEN) return false;
  if (id >= 100_000) return false;
  if (id >= PH_START && id < PH_END + 1) return false;
  return id < PH_START || id >= PH_END + 1;
}
