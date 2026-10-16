# IC SPICY — Improvement Suggestions (beyond security)

Effort: **S** ≈ <½ day, **M** ≈ 1–3 days, **L** ≈ >3 days. "Dep" = depends on.
Security hardening lives in AUDIT.md; this file is architecture, performance, cost,
UX, tooling, observability, testing, docs, and growth.

## Architecture & code quality

| # | Suggestion | Value | Effort | Dep |
|---|-----------|-------|--------|-----|
| A1 | Extract `payment-api.mo` (1.8k lines) into `icpay-api`, `direct-pay-api`, `paypal-api`, `treasury-withdraw-api` mixins | Readability, review-ability, smaller upgrade blast radius | M | — |
| A2 | Finish Phase 6 extraction (marketplace / community / nims canisters) per PROJECT_CONTEXT; keep `backend` as the pure ICRC-7 ledger | Upgrade isolation, cycle accounting per domain | L | A1 |
| A3 | Centralize all money math in one `lib/pricing.mo` with typed `UsdCents`/`TokenBase`/`IcpE8s` units to kill unit-confusion bugs (F-13) | Correctness, prevents whole bug class | M | — |
| A4 | Zero out ghost `wallets`/`txLog` via the documented explicit migration and delete `types/wallet.mo` | Removes dead stable state, cleaner upgrades | S | — |
| A5 | Replace `Array.concat` in loops (settlement, audit log, price list) with `List`/`Buffer` builders | Avoids O(n²) heap churn (also a cost item) | M | — |
| A6 | Introduce a shared `Result`-returning settlement core so no settlement path traps after mutation | Removes trap-rollback footguns (F-05, F-07) | M | A3 |

## Performance & cost

| # | Suggestion | Value | Effort | Dep |
|---|-----------|-------|--------|-----|
| P1 | Group weather outcalls by rounded location (already a LOCKED-IN design) and cache per grid cell with TTL; verify daily sweep coalesces | Fewer paid outcalls | M | — |
| P2 | Convert any remaining read-only `shared` methods to `query` (continues the 2026-09 pass) | No consensus cost on reads | S | — |
| P3 | Make `listProducts`/`listProductsByCategory` paginate instead of rebuilding full arrays each call | Scales past a few hundred SKUs | S | — |
| P4 | Turn on Vite `minify` + tree-shaking; code-split admin/NIMS/weather routes | Smaller bundle, faster first load | S | — |
| P5 | Replace the 50 KB `raw.icp0.io` price scrape with a typed ICPSwap pool query (also F-13) | Cheaper, deterministic, consensus-safe | M | A3 |
| P6 | Add per-canister `getCycleBalance()` dashboards + low-cycle alerting | Avoids the mid-upload exhaustion documented in AGENTS.md | S | O2 |

## Admin tooling & observability

| # | Suggestion | Value | Effort | Dep |
|---|-----------|-------|--------|-----|
| O1 | Public transparency dashboard: ICRC-3 NFT history, treasury audit/burn/buyback logs, order/payment counts | Trust for an RWA + token project | M | ICRC-3 (F-11) |
| O2 | Canister health monitor (cycles, memory, timer liveness) surfaced in admin + external cron | Reliability | M | — |
| O3 | Admin "payment reconciliation" view: for each paid order, show the verified PayPal/ICRC-2 amount vs `total_cents` (plus historical ICPay entries for the pre-removal period) | Detects F-01/F-03 abuse historically | M | F-01 removal (task 01) |
| O4 | Structured, queryable audit log with filters (actor, action, time range) instead of a flat append list | Investigations | S | — |
| O5 | Replace frontend hard-coded `ADMIN_PIDS` with `useAdmins()` (also F-20) | Admin UI tracks real rotation | S | — |

## Testing & CI

| # | Suggestion | Value | Effort | Dep |
|---|-----------|-------|--------|-----|
| T1 | Motoko unit tests for pricing/units (every token, stable + volatile, boundary cents) | Locks F-13 fix | M | A3 |
| T2 | Replica integration scripts (bash+dfx, pipeline-only asserts per the project's smoke philosophy) for order→pay→settle→claim, PepperHead, refunds | Regression safety on money paths | M | F-01/02/07 fixes |
| T3 | CI (GitHub Actions): `moc --check`, `pnpm typecheck`, `pnpm build`, gitleaks, and the smoke scripts on PR | Prevents regressions reaching mainnet | M | T1,T2 |
| T4 | Property test for `assignOwnership` invariant (owner map ↔ balance set) across random transfer sequences | Protects the core ICRC-7 invariant | M | — |
| T5 | Frontend component tests for checkout path ordering + wallet-detection reorder | UX regression safety | S | — |

## UX, mobile, accessibility, SEO

| # | Suggestion | Value | Effort | Dep |
|---|-----------|-------|--------|-----|
| U1 | Checkout: show server-computed price breakdown (subtotal, discount tier, shipping, token amount) before pay; never display client price as authoritative | Trust + fewer disputes | M | F-01 |
| U2 | Clear error states for Drop Studio/weather when the backend/outcall is unavailable (fail soft, not stack traces) | Polish | S | — |
| U3 | Accessibility pass: focus states, ARIA on the floating chat bubble + admin tables, color-contrast check vs DESIGN.md palette | Inclusivity, legal | M | — |
| U4 | Mobile checkout + NIMS table responsive audit (DESIGN.md calls for compact tables) | Conversion | M | — |
| U5 | NFT detail page (`/nft/{N}`) SEO: prerender + OpenGraph per token; verify `scripts/prerender-routes.mjs` covers it | Discoverability, social sharing | M | — |
| U6 | Onboarding tooltips (already specced in DESIGN.md "NIMS Onboarding Tooltips") — implement the master toggle + per-tip dismiss | Grower adoption | M | — |

## Growth features (post-hardening)

| # | Suggestion | Value | Effort | Dep |
|---|-----------|-------|--------|-----|
| G1 | Public ICRC-3 + verifier widget on NFT pages ("cryptographically verify this plant's ownership") | Marketing differentiation for RWA | M | O1 |
| G2 | PepperHead holder portal: whitelist windows, premium chatbot tier, badge stacking (per PROJECT_CONTEXT) | Membership value | M | — |
| G3 | Email/newsletter double opt-in + unsubscribe audit (newsletter canister) | Deliverability, compliance | S | — |
| G4 | Referral / co-op seat flow with on-chain proof instead of self-asserted links (ties into F-04 fix) | Community growth done safely | M | F-04 |
| G5 | **Bonsai Studio** — Bonsai-drop holders get 10 free MiniRouter image gens + a curated model picker; ckSOL pays for extra credits (converted to MINI off-session). Full spec: [BONSAI-STUDIO-SPEC.md](BONSAI-STUDIO-SPEC.md) | Holder perk + new revenue rail; differentiates the drop | L | **Backend-authoritative credits (not worker); F-01/F-03 amount discipline; F-04-safe holder gate; F-13 ckSOL oracle; F-14 worker hardening; F-16 budget; owner-run ckSOL→MINI sweep + disclosure** |

## Docs

| # | Suggestion | Value | Effort | Dep |
|---|-----------|-------|--------|-----|
| D1 | Publish TOKENOMICS_DISCLOSURE.md + treasury custody model before LGE (owner artifact; agents don't author) | Legal/trust gate for token launch | — | — |
| D2 | Document the AWS apex proxy (F-19) and Drop Studio worker (F-14) in PROJECT_CONTEXT, or remove them | Removes undocumented trust surface | S | — |
| D3 | Threat model doc enumerating every money/NFT entry point and its guard (living table) | Keeps future changes honest | M | AUDIT.md |
