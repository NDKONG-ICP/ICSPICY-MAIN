# Task 13 — Correct price-oracle units and use a reliable source (F-13, Medium)

## Goal
Fix the unit confusion that lets crypto payment validation run on wrong/placeholder prices,
and replace the fragile `raw.icp0.io` text-scrape with a deterministic source.

## Files to read first
- `src/backend/lib/price-oracle.mo` (`getPriceInIcp` :10; `usdCentsToTokenBase` :39;
  `isPaymentAmountSufficient` :60; `defaultPrice` :132)
- `src/backend/mixins/price-oracle-api.mo` (`fetchAndCachePrices` :54; `parseICPSwapPrices`
  :93; transform :18)
- `src/backend/types/price-oracle.mo`
- Live fact: `getTokenPrices()` returns `(vec {})` — cache never populated.
- Fetch `https-outcalls` SKILL.md (transform/consensus) fresh.

## Change description
1. Define explicit units: store `price_in_icp_e8s` as **ICP e8s per one whole token** and
   record each token's decimals. Rewrite `usdCentsToTokenBase` to apply decimals explicitly:
   `tokenBase = usd * (icpE8sPerUsd) / (icpE8sPerWholeToken) * 10^decimals(token)` with a
   single, unit-tested formula. Add tests asserting, e.g., $25 in ckUSDC == 25_000_000 base
   (6 decimals), and sane ckBTC/ckETH magnitudes.
2. Replace the `allPairs` `raw.icp0.io` scrape with a typed inter-canister query to the
   ICPSwap pool/quoter canister (or an oracle canister) returning numeric prices, removing
   the text-scan parser. If an HTTPS outcall must remain, keep `max_response_bytes` tight and
   ensure the transform canonicalizes the body (not just strips headers) so replicas agree.
3. Keep conservative fallbacks but mark the cache as "stale" when empty and have
   `isPaymentAmountSufficient` **fail closed** (reject) for volatile tokens when no fresh
   price exists, rather than silently using a placeholder.
4. Wire a recurring refresh timer (re-armed in `postupgrade`) so the cache actually populates.

## Acceptance criteria
- `getTokenPrices()` returns non-empty after the timer runs locally.
- Unit tests pass for every token at cent boundaries.
- With an empty cache, a volatile-token payment is rejected (fail closed), not accepted at a
  placeholder price.

## Tests to add
- Motoko test `src/backend/test/price-units.test.mo` (or bash+dfx) covering each token.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check && mops test
cd ../.. && dfx deploy --network local backend
```

## Mainnet deploy notes (human only)
Backend upgrade. If `TokenPrice`/state shape changes and it is stable, provide a migration
(or replace the whole cache, which is non-critical). Verify refresh populates on mainnet.

## Risks & rollback
- Risk: fail-closed could block checkout if the source is down → keep a short-TTL fallback
  with an admin override, and alert on stale cache.
- Rollback: revert; re-enable fallbacks.
