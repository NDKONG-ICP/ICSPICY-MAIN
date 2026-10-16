# Task 16 — Global outcall/LLM budget on top of per-principal limits (F-16, Medium)

## Goal
Stop free-principal rotation from multiplying the HTTPS-outcall and LLM cycle budget.

## Files to read first
- `src/backend/mixins/weather-hub-api.mo` (`ensureTropicalSummary` :906 with `force` bypass;
  `ensureWeatherOutlook` :859; `resolveZip` :959)
- `src/backend/lib/` rate-limit module (`RateLimit`)
- `src/spicy_ai_canister/main.mo` (`rateLimitKey` :210; `withinRateLimit` :233)

## Change description
1. Add a **global** token-bucket per expensive method (e.g. `weatherTropical`,
   `weatherOutlook`, LLM chat) in addition to the per-principal limit: a shared counter with
   a max calls/hour across all callers, reset on a timer. Reject with a soft message when the
   global bucket is empty.
2. Require authentication for the `force` path of `ensureTropicalSummary` (don't let
   anonymous callers force a cache-busting outcall); keep the cached read anonymous.
3. For spicy_ai, add the same global ceiling so anonymous/auth principals collectively can't
   exceed a safe outcall/LLM budget; optionally add a tiny PoW for anonymous.
4. Expose an admin query of current bucket levels for observability.

## Acceptance criteria
- A burst of forced outcalls across many principals is throttled by the global ceiling.
- Anonymous callers cannot trigger `force` outcalls.
- Normal single-user usage is unaffected under the ceilings.

## Tests to add
- `scripts/audit/outcall-budget.sh` (local): drive many principals calling a budgeted method;
  assert the global ceiling trips; assert cached reads still succeed.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx deploy --network local backend && bash scripts/audit/outcall-budget.sh
```

## Mainnet deploy notes (human only)
Backend + spicy_ai upgrades. Timer re-arm in `postupgrade` (follow the transient
`Timer.recurringTimer` pattern already used). No stable migration if buckets are transient.

## Risks & rollback
- Risk: global ceiling set too low throttles legitimate traffic → make the ceiling
  admin-tunable and start generous.
- Rollback: revert.
