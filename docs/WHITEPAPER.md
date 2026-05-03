# IC SPICY Whitepaper

**Version 1.0 — May 2026**
**Florida-registered specialty pepper nursery, on the Internet Computer.**

> *Drafted from `PROJECT_CONTEXT.md`, `DESIGN.md`, and the live source. Not a securities offering. Subject to legal review before external distribution.*

---

## Table of contents

1. [Abstract](#1-abstract)
2. [Background](#2-background)
3. [System overview](#3-system-overview)
4. [NFT design](#4-nft-design)
5. [Provenance model](#5-provenance-model)
6. [Payment model](#6-payment-model)
7. [Tokenomics](#7-tokenomics)
8. [Governance](#8-governance)
9. [Security](#9-security)
10. [SpicyAI assistant](#10-spicyai-assistant)
11. [Community layer](#11-community-layer)
12. [Roadmap & risk](#12-roadmap--risk)
13. [Appendices](#13-appendices)

---

## 1. Abstract

**IC SPICY** is a Real-World-Asset (RWA) e-commerce dapp on the Internet Computer (ICP), serving as the on-chain storefront, lifecycle tracker, and provenance system for an FDACS-registered specialty pepper nursery in Port Charlotte, Florida (USDA Zone 10a).

Each plant produced by the nursery is bound to an **ICRC-7 NFT** carrying a **live, certified provenance record**: variety, germination date, growing location, stage history (germination → transplant → sale → claim), and **per-stage weather snapshots** captured via deterministic HTTPS outcalls to Open-Meteo. The dapp accepts payment in **ICP, ckBTC, ckETH, ckUSDC, ckUSDT, SPICY**, and **Stripe** (for non-crypto customers, verified via HTTPS outcall to the Stripe API), with self-custody enforced through ICRC-25/49 wallet signers (OISY / Plug). NFTs may be **burned to redeem SPICY tokens** at rarity-tied payouts, with anti-arbitrage hold and rate-limit guards.

The system is built on **standard `dfx` + `mops` tooling** (no Caffeine fork), uses an **eight-canister target architecture**, and applies production-grade defaults — `inspect_message` filtering, `requireAuthenticated` / `requireAdmin` discipline, CallerGuard reentrancy locks, state-mutate-before-`await` with explicit compensation, 7-day timelocks on material economic parameters, two-admin minimum, and a 90-day freezing threshold on every canister.

This whitepaper documents the locked-in architecture as of May 2026. Where future phases (LGE, buybacks, Phase 6 canister extraction) are described, they reflect commitments in `PROJECT_CONTEXT.md` and the audit-bound implementation plan, not aspirations.

---

## 2. Background

### 2.1 The nursery

IC SPICY is operated by a Florida-registered specialty pepper nursery in Port Charlotte (USDA Zone 10a) with **30+ years of cultivation experience**. The nursery is registered with the **Florida Department of Agriculture and Consumer Services (FDACS)** and produces **12 active rare cultivars** spanning extreme-heat exotics (Apocalypse Scorpion, Death Spiral, RB003), super-hots (Fried Chicken, Aji Guyana), and heirlooms (Aji Charapita, Fish Pepper, Acoma Pueblo, Calabrian Cherry).

### 2.2 Cultivation methodology — KNF & JADAM

The nursery uses **Korean Natural Farming (KNF)** and **JADAM Organic Farming** — regenerative, ultra-low-cost methodologies that build living-soil ecosystems via indigenous microorganisms (IMO), natural ferments (OHN, FPJ, FAA, LAB, WCA), and biologically active inputs. No synthetic fertilizers. No synthetic pesticides. The CookBook in the dapp documents these preparations in full and is gated behind community membership and a SPICY-token submission burn.

### 2.3 Why this needs to be on-chain

Specialty agriculture is a **claims-heavy market**: "organic," "regenerative," "single-origin," "rare cultivar." Buyers pay premium prices for those claims and have **no machine-verifiable way** to validate them. Conventional supply-chain tracing is paper-based, vendor-asserted, and tampered with at every hop. **A canister-resident, certified ICRC-7 provenance record** — recomputed live at query time, with weather snapshots tied to real coordinates — flips this:

- The variety, germination date, and growing location are **canister state**, not marketing copy.
- Each stage transition (germination, transplant, sale, claim) writes a **timestamped weather snapshot** into the NFT metadata.
- The NFT travels with the plant — buyers see the **complete chain of custody**.
- Owners can verify, dispute, or redeem the asset against the on-chain record.

### 2.4 Why ICP

ICP is the only general-purpose chain that, as of May 2026, simultaneously offers:

| Capability | Why it matters here |
|---|---|
| **HTTPS outcalls** with replicated execution and deterministic transforms | Weather oracle (Open-Meteo) and Stripe verification without trusted intermediaries. |
| **Native asset canisters** with certified path serving | 1.33 GB of NFT artwork served from `icp0.io` with response certification — no IPFS, no pinning, no S3. |
| **`mo:llm`** (Llama 4 Scout, native LLM) | SpicyAI domain expert in-canister, no off-chain API, no vendor lock-in. |
| **ckBTC** (real Bitcoin, sweep-based) | Bitcoin payments without bridges. |
| **ICRC-1 / ICRC-2 standards** | Composable token rails for ICP, ckBTC, ckETH, ckUSDC, ckUSDT, SPICY. |
| **Reverse gas (cycles model)** | Customers pay no chain fees. The canister pays, in cycles converted from ICP. |
| **Internet Identity + ICRC-25/49 signers** | Self-custody UX without holding user keys. |
| **Cycle-priced execution** | Predictable hosting cost; no chain congestion auctions. |

Everything in this whitepaper depends on capabilities that are **mainnet-stable today**.

---

## 3. System overview

### 3.1 Eight-canister target architecture (Phase 6)

`PROJECT_CONTEXT.md` defines the post-split target. Phases 0–5 ship in the existing single-canister structure; the split happens in Phase 6:

| Canister | Type | Responsibility |
|---|---|---|
| `frontend` | Asset canister | React UI (Tailwind, motion/react, shadcn/ui), served with certification |
| `nft_assets` | Asset canister | 8888 PNGs + JSON metadata, ~1.33 GB |
| `nft_canister` | Motoko actor | ICRC-7 / ICRC-37 ledger for the NFT collection |
| `marketplace_canister` | Motoko actor | Products, orders, offers, resale listings, discount engine |
| `treasury_canister` | Motoko actor | SPICY / ICP / ckBTC custody, buybacks, burns |
| `community_canister` | Motoko actor | Posts, comments, follows, profiles, recipes |
| `nims_canister` | Motoko actor | Plants, trays, lifecycle stages, weather provenance |
| `spicy_ai_canister` | Motoko actor | LLM chatbot via `mo:llm` |

Inter-canister calls are typed via Candid bindings generated by `dfx generate`. All actor references are type-aliased and handle every error variant.

### 3.2 Build & deployment

- **Compiler**: standard `moc` (no Caffeine fork, no `--default-persistent-actors` flag).
- **Persistence**: every actor is declared `shared(msg) persistent actor class CanisterName() = Self { ... }` — owner principal captured at deployment, not hardcoded.
- **Dependencies**: managed by `mops`, with `mops check` required before any deploy.
- **Bindings**: Candid bindings via `dfx generate <canister-name>` (replacing former `caffeine-bindgen`).
- **Local replica testing required** before any mainnet deploy. Mainnet deploys are gated by explicit user confirmation per `AGENTS.md`.

### 3.3 Frontend stack

The user-facing dapp is a React 19 application using:

- **TanStack Router** for routing (`App.tsx`)
- **TanStack Query** for server-state caching, with explicit cache wipes on principal change
- **Tailwind CSS + shadcn/ui** for component primitives
- **motion/react** (Framer Motion v12) for entrance and hover transitions only — no decorative full-page animations
- **`@dfinity/agent`, `@dfinity/auth-client`, `@dfinity/identity`, `@dfinity/principal`** v3.3 series for canister calls and II login

The **DESIGN.md** spec governs aesthetics: **dark agricultural luxury**, **deep charcoal background** (`oklch(0.12 0.015 50)`) with **fire-red CTA accent** (`oklch(0.62 0.26 24)`), **Space Grotesk** display + **Satoshi** body + **Geist Mono** for technical surfaces. NIMS uses a utilitarian table-first treatment for inventory density.

### 3.4 Existing routes (`src/frontend/src/App.tsx`)

| Path | Component | Purpose |
|---|---|---|
| `/` | `Home` | Brand & landing |
| `/marketplace` | `Marketplace` | Storefront, NFT resale, offers |
| `/plants` | `Plants` | Owner-side plant list |
| `/plants/$plantId` | `PlantDetail` | Lifecycle, weather, provenance |
| `/profile` | `Profile` | Community profile |
| `/dao` | `DAO` | Proposal browser → OHSHII deep link |
| `/community` | `Community` | Posts, comments, likes, follows |
| `/admin` | `AdminGuard → Admin` | Admin panel (multi-admin) |
| `/checkout` | `Checkout` | Cart → payment |
| `/orders` | `Orders` | Order history |
| `/wallet` | `Wallet` | Multi-token + NFT inventory |
| `/nims` | `NIMS` | Nursery Inventory Management System |
| `/cookbook` | `CookBook` | KNF/JADAM preparations |
| `/schedule-builder` | `ScheduleBuilder` | Plant feeding schedules |
| `/claim/$claimToken` | `Claim` | Buyer redemption from QR/claim token |

---

## 4. NFT design

### 4.1 Collection

- **8888 ICRC-7 NFTs**, pre-generated by the NFT Matrix tool.
- **Distribution:** **5000 Common · 2838 Uncommon · 1000 Rare · 50 Founder.**
- **Static traits** are pre-computed in JSON metadata files and reflect a **10-trait composite layer** generation (rarity layers).
- **Collection name**: "IC SPICY" (originals were named "The NFT Matrix" — must be templated before upload).
- **Storage**: dedicated `nft_assets` asset canister. **NEVER** in backend canister heap. Served via `icp0.io` (certified paths), not `raw.ic0.app`.

### 4.2 Source asset layout (pre-upload)

- PNGs: `nft_collection/nft_<N>.png` for `N` in 1..8888 (flat, at folder root).
- JSON metadata: `nft_collection/metadata/nft_<N>.json` for `N` in 1..8888.
- Total size: ~1.3 GB.
- `nft_collection/` is in `.gitignore` — kept locally only, uploaded in Phase 2.

### 4.3 One-time metadata templating

Original metadata files contain placeholders that must be replaced in `scripts/template-metadata.js` before upload:

| Placeholder | Replaced with |
|---|---|
| `YOUR_ICP_CANISTER_ID` | `nft_assets` canister ID |
| `YOUR_CANISTER_ID` | backend / `nft_canister` ID |
| `YOUR_PRINCIPAL_ID` | IC SPICY admin/creator principal |
| `YOUR_COLLECTION_ID` | stable identifier (e.g., `icspicy-nft-matrix-v1`) |
| `"The NFT Matrix"` | `"IC SPICY"` |
| `raw.ic0.app` URLs | `icp0.io` certified paths |

### 4.4 Discount tiers (NFT-only, no DAO bonus)

Discounts are applied at checkout based on the highest-rarity NFT held by the buyer. **Discount must be computed server-side. Never trust frontend-claimed discount.**

| Rarity | Discount |
|---|---:|
| Founder | 30% |
| Rare | 20% |
| Uncommon | 10% |
| Common | 5% |

### 4.5 Burn-redeem (one-way conversion to SPICY)

| Rarity | SPICY out |
|---|---:|
| Common | 1,000 |
| Uncommon | 3,500 |
| Rare | 12,000 |
| Founder | 50,000 |

**Anti-arbitrage measures (REQUIRED in implementation):**

1. **30-day minimum hold** from mint or last transfer date before redemption is eligible.
2. **Maximum 5 redemptions per principal per 24-hour window.**
3. **Per-rarity payouts are admin-tunable** (under 7-day timelock for material parameter changes), so they can be lowered if arbitrage emerges.

**Compensation logic (REQUIRED):** if the SPICY transfer fails *after* the NFT has been marked burned, the canister must un-burn the NFT. State changes happen *before* the `await`, and the post-`await` failure path executes compensation.

### 4.6 NFT custody on burn

NFTs are **transferred to the burn account** (anonymous principal `2vxsx-fae`) — Option A from the `canister-security` skill. We do **not** introduce a `#Burned` status flag, because that would break ICRC-7 enumeration and ownership semantics.

### 4.7 Provenance metadata (live at query time)

`icrc7_token_metadata` returns a merged view of:

- **Static traits** from the JSON metadata.
- **Live provenance** read from the `nims_canister`:
  - Plant variety
  - Germination date
  - Growing location
  - Stage history (germination → transplant → sale → claim)
  - Per-stage weather snapshots
  - Current owner principal
- A canister-generated certification string: *"Authentic IC SPICY plant grown in Port Charlotte, FL — FDACS registered."*

The query response is **certified** via `CertifiedData` so the result is verifiable independent of a single replica.

---

## 5. Provenance model

### 5.1 Per-plant tracking

Each plant record carries `latitude` / `longitude`. The `nims_canister` polls **Open-Meteo** daily via HTTPS outcall and stores per-day weather records keyed by `(lat, lon, date)`.

- API: `https://api.open-meteo.com/v1/forecast` (free, no API key, deterministic for fixed `(lat, lon, date)`).
- Backfill: `https://archive-api.open-meteo.com/v1/archive` covers any date range back to 1940 via a single outcall.
- **Grouping**: plants in the same physical location share weather records — 200 trays at the nursery's coordinates resolve to **1 outcall**, not 200.
- `max_response_bytes` is set tight (~5 KB) per outcall.
- `is_replicated = null` (replicated execution) for all state-mutating outcalls — non-replicated `?false` is never used for state mutations.

### 5.2 Lifecycle integration

| Stage transition | Effect |
|---|---|
| Germination | New plant record + first weather snapshot. |
| Transplant | Stage record + weather snapshot. NFT lifecycle upgrade triggers burn-and-mint of next-stage NFT (Seedling → 1-Gallon → 5-Gallon). |
| Sale | `provenance_state := #Paused` — the plant is skipped in the daily weather sweep until the buyer claims and provides a location. |
| Claim | Buyer redeems QR/claim token (`Claim.tsx` + `claim-api.mo`). If buyer opts in to continued tracking, `provenance_state := #Tracking` resumes with new `lat/lon`. |

Each transition writes an immutable snapshot into the NFT's `properties.weather_provenance` array.

### 5.3 Privacy model for new owners

New-owner location tracking is **opt-in** at claim time:

- **Default**: `#EndProvenance` — no further weather snapshots after claim. The NFT carries the nursery-side provenance record only.
- **Opt-in**: `#Tracking` — buyer's location is rounded to **0.1°** (~7 mile resolution) before storage and outcall. Exact coordinates are never persisted.

### 5.4 Transform function (HTTPS outcall determinism)

Outcalls require a deterministic transform to clear non-deterministic response fields before consensus:

- All response **headers stripped** (timestamps and trace IDs break replica consensus).
- Body parsed strictly for the fields we read: `temperature`, `humidity`, `precipitation`, `uv_index`, `wind_speed`.
- Non-200 responses are surfaced as canister-side errors and not persisted as data.

---

## 6. Payment model

### 6.1 Primary path: ICRC-2 `transfer_from` via OISY / Plug

User flow:

1. User selects payment token in `Checkout.tsx`.
2. Wallet signer (OISY or Plug) shows ICRC-25/49 popup; user pre-approves the marketplace canister to pull up to the order amount.
3. Backend computes price + discount **server-side** (`marketplace.mo`) — never trusts frontend.
4. Backend calls `icrc2_transfer_from` on the appropriate ledger.
5. On success: order marked paid, NFT (if applicable) transferred, audit trail recorded.

**Supported tokens**

| Token | Ledger canister ID |
|---|---|
| ICP | `ryjl3-tyaaa-aaaaa-aaaba-cai` |
| ckBTC | `mxzaz-hqaaa-aaaar-qaada-cai` |
| ckETH | `ss2fx-dyaaa-aaaar-qacoq-cai` |
| ckUSDC | `xevnm-gaaaa-aaaar-qafnq-cai` |
| ckUSDT | `cngnf-vqaaa-aaaar-qag4q-cai` |
| SPICY | TBD post-LGE (OHSHII Launcher) |

**Implementation rules**

- Look up `icrc1_fee()` per ledger — never hardcode fees.
- Always set `created_at_time` for transfer dedup.
- Handle every variant of `TransferFromError`: `BadFee`, `InsufficientFunds`, `Duplicate`, `BadBurn`, `CreatedInFuture`, `TooOld`, `TemporarilyUnavailable`, `GenericError`.
- All async settlement methods are guarded by **CallerGuard** (per-caller reentrancy lock).

### 6.2 Pay-with-SPICY option

- **10% discount** vs. USD-equivalent price.
- **SPICY tokens are sent to the burn account** (`2vxsx-fae`), not to treasury. This is a deflationary sink, not a treasury inflow.
- **Price computed via ICPSwap SPICY/ICP pool**, **TWAP over 6 hours**.
- **Min/max guards**: refuse the swap path if SPICY price is outside the configured range (default $0.001–$1.00, admin-tunable).

### 6.3 Stripe fallback (non-crypto customers)

Stripe is implemented as a **two-step verified flow**, not a webhook receiver:

1. Frontend redirects user to **Stripe Checkout** hosted page.
2. After return, frontend calls `confirmStripePayment(orderId, sessionId)` on the marketplace canister.
3. Backend issues an **HTTPS outcall**: `GET https://api.stripe.com/v1/checkout/sessions/:id` using the Stripe API key stored in canister state (admin-settable, never in source).
4. Backend verifies:
   - `payment_status == "paid"`
   - amount matches order
   - currency matches
   - `metadata.order_id` matches
5. Idempotency: each `session_id` can mark only one order paid; recorded in `stripeSessionsConsumed` map.

This design avoids the vulnerabilities of webhook receivers (replay, spoofing) and keeps trust anchored on the live Stripe API response, certified by HTTPS outcall consensus.

### 6.4 ckBTC integration (real Bitcoin, not simulated)

Per the `ckbtc` skill's implementation pattern:

- **Per-user subaccount derivation**: `principalToSubaccount(p)` — 32 bytes, first byte = principal length, remainder = principal bytes, padded.
- **Deposit address**: obtained from `get_btc_address` on the ckBTC minter (`mqygn-kiaaa-aaaar-qaadq-cai`) for the user's derived subaccount.
- **Sweep**: deposits do **not** auto-credit. The canister calls `update_balance` to recognize a confirmed BTC transaction and mint ckBTC to the subaccount. **CRITICAL: BTC sent to the address does nothing without `update_balance`.**
- **Withdrawal**: `icrc2_approve` on the ckBTC ledger followed by `retrieve_btc_with_approval` on the minter.
- **Minimum withdrawal**: 50,000 satoshis (0.0005 BTC).

### 6.5 Server-side discount and price computation

A non-negotiable rule: **all amounts, discounts, and prices are recomputed server-side at order placement**. The frontend may display indicative prices, but the marketplace canister:

1. Reads the user's NFT inventory.
2. Determines the highest applicable rarity.
3. Computes the discount tier (5% / 10% / 20% / 30%).
4. Reads the live ICPSwap TWAP for token-price conversion.
5. Issues the transfer for the **server-computed** amount.

If the frontend says 30% off but the user has no Founder NFT, the backend ignores the claim and charges full price.

---

## 7. Tokenomics

### 7.1 Token

- **Name**: SPICY
- **Standard**: ICRC-1
- **Total supply**: 1,000,000,000
- **Deployment**: via OHSHII Launcher
- **Burn account**: anonymous principal `2vxsx-fae` (universal black hole, no governance handle)

### 7.2 Allocation

| Bucket | Amount | Treatment |
|---|---:|---|
| **LGE Public Sale** | 700,000,000 (70%) | Founder participates with verified wallet, capped at 18M. Founder's 18M voluntarily locked **24 months** via OHSHII Locker (6-month cliff + 18-month linear vest). |
| **ICPSwap LP** | 200,000,000 (20%) | Locked **4 years** via OHSHII Locker. |
| **IC SPICY Treasury** | 100,000,000 (10%) | Held by `treasury_canister`, structured by subaccount (see §7.3). |

### 7.3 Treasury subaccount structure (100M)

The `treasury_canister` exposes typed subaccounts so external observers can verify each pool's balance independently:

| Subaccount | Allocation | Purpose |
|---|---:|---|
| **NFT redemption pool** | 40,000,000 | Backs burn-redeem payouts. |
| **Marketing & community** | 25,000,000 | Public-facing marketing spend, community grants. |
| **Strategic reserve** | 20,000,000 | Optionality for partnerships, M&A, future audits. |
| **Operational reserve** | 10,000,000 | Cycles top-ups, infra, audit retainers. |
| **Quarterly burn reserve** | 5,000,000 | Discretionary admin burns each quarter, transparent log. |

### 7.4 Burn destinations and triggers

| Trigger | Destination | Cadence |
|---|---|---|
| Pay-with-SPICY discount path | `2vxsx-fae` (burn) | Per transaction |
| Recipe submission gate | `2vxsx-fae` (burn) | 10 SPICY per submission |
| NFT redeem (out of redemption pool) | Buyer | Per redemption |
| Quarterly admin burn | `2vxsx-fae` (burn) | Quarterly, from burn reserve |

### 7.5 Buybacks (Phase 8, timer-driven)

Implemented via `Timer.recurringTimer`:

- **Cadence**: monthly.
- **Source**: 2% of operational ICP balance per month.
- **Venue**: ICPSwap SPICY/ICP pool.
- **TWAP slippage protection**: refuse swap if quoted price is outside 2% of the 6-hour TWAP.
- **Public log**: every buyback emits a record queryable by anyone via `getBuybackLog()`.
- **Routing**: tokens acquired via buyback flow into either the **redemption pool** subaccount or the **burn reserve**, admin-configurable.

### 7.6 Balance gates (locked-in, narrow scope)

These are the **only** features gated on SPICY balance. Discounts are not.

| Feature | Gate |
|---|---|
| Recipe submission | Hold ≥ 100 SPICY (admin-tunable). 10 SPICY burned per submission. |
| Chatbot bonus calls | +50 calls / 24h per 100 SPICY held. Capped at +2000 bonus calls. |
| Legend badge | Hold ≥ 100,000 SPICY (admin-tunable). Display only. |

**Anti-pattern (explicitly forbidden):** never gate purchases on SPICY balance. Discounts are NFT-only.

### 7.7 Disclosure document (project-owner artifact)

A formal **tokenomics disclosure document** is published before LGE goes live, covering:

- Total supply and allocation breakdown.
- Founder allocation: 18M, 24-month vest with 6-month cliff, OHSHII Locker lock ID published.
- Treasury structure and policy.
- Burn mechanics (pay-with-SPICY, quarterly, recipe submission).
- Buyback policy (timer-driven monthly, 2% of operational ICP).
- Governance via OHSHII.
- Audit & transparency commitments.

Per `PROJECT_CONTEXT.md`, **coding agents do not generate this document** — it is a project-owner artifact requiring legal review. This whitepaper is a technical and product document; it is not a substitute for the formal disclosure.

---

## 8. Governance

### 8.1 DAO architecture: OHSHII-hosted

**The DAO lives entirely on OHSHII.** IC SPICY does not run a custom on-canister DAO in the production target architecture.

- Users vote at **`ohshii.com`** via deep link from the IC SPICY DAO page.
- IC SPICY's `community_canister` does not query OHSHII's governance canister.
- Voting power, proposal logic, vesting interactions, and execution all happen on OHSHII.

### 8.2 What IC SPICY canisters DO integrate

- **SPICY ledger** (ICRC-1) for redemption payouts and pay-with-SPICY burns.
- **Treasury subaccount management** for SPICY allocations.
- **Quarterly admin-discretion burns** from the fee burn reserve.

### 8.3 What IC SPICY canisters do NOT integrate

- OHSHII governance proposal queries.
- OHSHII locker voting power queries.
- Cross-canister governance execution.
- DAO-controlled parameter pushes.

If future product needs require DAO-driven canister operations (Phase 9+), the architecture revisits **principal-linking** between an OHSHII-resolved DAO principal and IC SPICY admin authority. That bridge does not exist in v1.

### 8.4 Legacy on-canister DAO (deletion target, Phase 8)

The current single-canister codebase contains an in-canister DAO subsystem (`lib/dao.mo`, `mixins/dao-api.mo`) — `voteOnProposal`, `createDAOProposal`, `listDAOProposals`, `getDAOProposal`, `hasDAOAccess`. This is **dead code** and is scheduled for deletion in Phase 8 once OHSHII integration ships.

### 8.5 Multi-admin model

Operational governance of the canister itself uses a **multi-admin model**, separate from token governance:

- **Two-admin minimum** enforced (verified locally before any phase is considered complete).
- `addAdmin` / `removeAdmin` methods (admin-only) for rotation without redeployment.
- Initial owner captured at deployment via `shared(msg) persistent actor class CanisterName() = Self`.
- Admin actions logged to a **public audit trail**.
- **Material economic parameters** (discount tiers, redemption payouts, marketplace fees) require a **7-day timelock**.
- **Operational fixes** (pause sales, hot-fix bug) are admin-only with no timelock — but logged.

---

## 9. Security

### 9.1 Authentication discipline

Every authenticated method begins with explicit principal checks:

```motoko
public shared({caller}) func someMethod(...) : async ... {
  requireAuthenticated(caller); // or requireAdmin(caller)
  let _guard = acquireGuard(caller); // if method is async + mutates state
  // ... method body, with guard auto-released by try/finally wrapper ...
};
```

- `requireAuthenticated(caller)` — rejects anonymous principals (`Principal.isAnonymous`).
- `requireAdmin(caller)` — rejects non-admins.
- The legacy `hasPermission(state, caller, #user)` helper has been removed in Phase 1 — `requireAuthenticated` is the canonical anonymous-reject helper.

### 9.2 Pre-consensus filtering — `inspect_message`

Anonymous calls to update methods are dropped **before consensus** by an `inspect_message` filter. The shape is **one ALLOW, everything else BLOCK**:

- **Exactly one update method** allows anonymous ingress: `_initializeAccessControl` (the frontend calls it on every actor init, including unauthenticated sessions).
- All ~103 other update methods block anonymous calls.

This saves cycles and reduces canister log noise from spam ingress.

### 9.3 Reentrancy protection — CallerGuard

All async settlement methods that mutate state acquire a **per-caller lock** before `await`:

- Pattern: `Map<Principal, Bool>` tracking active locks.
- Wrapped in `try/finally` so the guard is released on every code path, including traps.
- **Required on**: `placeOrder`, `acceptOffer`, `redeemNftForSpicy`, `purchaseWithSpicy`, `confirmStripePayment`, treasury transfers, buyback execution.

### 9.4 State mutation around `await`

The order of operations for any external call is fixed:

1. **Validate inputs** (require checks, ownership, bounds).
2. **Mutate state to reflect intent** (e.g., mark NFT as burned, decrement inventory).
3. **`await` the external call** (ledger transfer, HTTPS outcall).
4. **On success**: log the block index, finalize the operation.
5. **On failure**: run **compensation logic** — un-mutate the state from step 2 (e.g., un-burn the NFT, refund SPICY).

The compensation path is documented inline in code comments. This is the canonical pattern for safe state machines around inter-canister calls and is enforced at code review.

### 9.5 Frontend trust boundary

The frontend is treated as untrusted input. The marketplace canister:

- Recomputes order amounts server-side using its own `Product` table.
- Recomputes discount tier from on-chain NFT ownership, not frontend hint.
- Recomputes token-price conversions from its own ICPSwap TWAP read.
- Verifies Stripe sessions via its own HTTPS outcall.

### 9.6 Asset & data hygiene

- **No images, blobs, or unbounded data in the backend canister heap.** Asset canisters (`frontend`, `nft_assets`) hold all media.
- **No `Debug.print` of user content.** Canister logs are visible to controllers; printing user prompts or PII would breach the zero-log policy on the chatbot and is forbidden across the codebase.
- **Generic error messages only** in trapped paths — never `Runtime.trap("Failed: " # question)`.
- **Stripe API keys** are stored in canister state (admin-settable), never in source code or git history.

### 9.7 Cycle hygiene

- **90-day freezing threshold** on every production canister.
- `getCycleBalance()` admin method on every canister for monitoring.
- Top-ups via the **Cycles Minting Canister**, not raw `--with-cycles` flags.
- Local replica testing required before any mainnet deploy. Mainnet deploys are gated by explicit user "yes, deploy to mainnet" confirmation per `AGENTS.md`.

### 9.8 Audit roadmap

- **Budget**: $30K–$60K, allocated.
- **Shortlist**: Trail of Bits · Vespertine · OAK Security · Hacken.
- **Phase**: 7, scheduled in parallel with code freeze before mainnet. Booking happens months in advance because audit firms have lead time.
- **Pre-audit hygiene**: every canister method documented; `mops check` clean; local test harness executed; admin/owner principals verified; freezing thresholds set.

### 9.9 Anti-patterns (forbidden in this codebase)

- Hardcoding admin principals in source code (use `shared(msg)` capture).
- Storing images or large blobs in backend canister heap.
- Mutating state after `await` without a reentrancy lock.
- Trusting amounts / discounts / prices from the frontend.
- Hardcoding ledger fees (always `icrc1_fee()`).
- `Debug.print` on user content.
- Deploying directly to mainnet without local testing.
- Querying the LLM canister synchronously on hot paths without rate limiting.
- Using Caffeine's `--default-persistent-actors` flag or `caffeineai-*` deps.

---

## 10. SpicyAI assistant

### 10.1 Implementation

- **Library**: `mo:llm`, native ICP Motoko binding for inference.
- **Model**: **Llama 4 Scout**.
- **API surface**: a 1-line `LLM.chat(...)` call.
- **Pricing**: free during preview; the canister pays cycles for inference.
- **System prompt**: capped at **10 KiB**.
- **Response**: capped at **1000 tokens**.
- **Hosting canister**: dedicated `spicy_ai_canister` (Phase 6.5).

### 10.2 Domain expertise

The system prompt covers:

- **Korean Natural Farming (KNF)**: OHN, FPJ, FAA, LAB, WCA, IMO, JLF, WS preparations, ratios, application timing.
- **JADAM Organic Farming**: JMS, JWA, ultra-low-cost regenerative methodology.
- **Permaculture**: zone planning, polyculture, food forests, water harvesting.
- **Florida-specific gardening**: USDA zones 8b–11, sandy soils, rainy season, pest pressure (esp. thrips, broad mites, hornworms).
- **Capsicum cultivation**: Carolina Reaper, Bhut Jolokia, Trinidad Scorpion, Aji varieties (Charapita, Guyana, Amarillo), Datil, Habanada, Calabrian, Scotch Bonnet.

### 10.3 UI

- **Floating chat bubble** mounted at the layout root, persisting across navigation.
- **Conversation state** stored in the user's `localStorage` only — never in the canister.
- **Window**: last 6 user/assistant pairs retained client-side; older messages dropped.

### 10.4 Rate limits (locked-in)

| Tier | Calls / 24h | Conversation length |
|---|---:|---:|
| Anonymous | 20 | 10 |
| Authenticated (II logged in) | 200 | 50 |
| NFT holder | 1000 | 100 |
| + SPICY balance bonus | +50 per 100 SPICY held | (no change) |
| **Bonus cap** | **+2000** | — |

Counters are per-principal-per-24h, reset on a rolling window.

### 10.5 Zero-log policy (CRITICAL)

- **Never store** question text or answer text in canister state or logs.
- **Never `Debug.print`** user content. Canister logs are visible to controllers.
- **Generic error messages only** — never `Runtime.trap("Failed: " # question)`.
- Daily call counter increments only — no per-user history retention.
- **Privacy disclosure**: *"DFINITY AI workers can see prompts but cannot identify users"* — surfaced in the in-app privacy policy.

### 10.6 Multilingual support (deferred)

- English only at launch.
- Spanish translation deferred per project-owner direction; Florida demand will drive the call.
- The system prompt contract accepts a `language` parameter for future expansion without schema breakage.

---

## 11. Community layer

The community surface is fully on-chain — there is no off-chain database.

### 11.1 Data model

Defined in `src/backend/types/community.mo`:

| Type | Fields |
|---|---|
| `Post` | `id`, `author`, `anonymous`, `content`, `image_key`, `likes` (Set), `created_at`, `updated_at` |
| `Comment` | `id`, `post_id`, `author`, `content`, `created_at` |
| `UserProfile` | `principal_id`, `username`, `bio`, `avatar_key`, `follows` (Set), `created_at` |

### 11.2 API surface (`mixins/community-api.mo`)

| Method | Purpose |
|---|---|
| `createPost` | Authenticated. Text + optional image_key + anonymous toggle. |
| `editPost` / `deletePost` | Authenticated, author-only, **48-hour edit/delete window** enforced canister-side. |
| `likePost` / `unlikePost` | Idempotent like/unlike. |
| `createComment` | Authenticated. |
| `followUser` / `unfollowUser` | Adds/removes target principal in caller's `follows` Set. |
| `saveCallerUserProfile` / `ensureCallerProfile` | Profile create/update; idempotent on every sign-in. |
| `getCallerUserProfile`, `getPublicProfile` | Profile reads. |
| `listPosts`, `listCommentsByPost`, `getUserPosts` | Public read methods. |
| `getFollowersCount`, `getFollowingCount` | Public read methods. |

### 11.3 UX

- **Posts** support text + a single image stored via the asset canister keyed by `image_key`.
- **Anonymous posting** is allowed; the `Post` record stores the principal but the public `PostPublic` view returns `author_principal: null` and the display label `"🌶 Anonymous"`.
- **Sharing**: each post has a stable URL; the share panel offers Facebook, X, Instagram, TikTok, and copy-link.
- **Comments**: threaded under each post, oldest-first.

### 11.4 Recipe submissions

Recipe submissions are gated separately in `mixins/recipes-api.mo`:

- Caller must hold **≥ 100 SPICY** (admin-tunable).
- **10 SPICY burned per submission** to the burn account.
- Both checks happen **server-side** before the submission is accepted.
- Admin curation step before public publication.

### 11.5 Anti-spam posture

- Authenticated-only writes (anonymous reject).
- 48-hour edit window prevents historical revisionism.
- Recipe path adds balance gate + burn cost.
- No rate limit on standard posts in v1; if abuse appears, a per-principal post counter with reset window is the planned mitigation.

---

## 12. Roadmap & risk

### 12.1 Phase plan (12 weeks to mainnet)

| Phase | Description | Weeks |
|---|---|---:|
| 0 | Pre-flight: snapshot, asset inventory, principals verification | 0.2 |
| 0.5 | Caffeine → `dfx`/`mops` migration | 0.5 |
| 1 | Security foundations | 0.7 |
| 2 | Asset infrastructure (`nft_assets`, 1.33 GB upload) | 0.7 |
| 3 | ICRC-7 + certified provenance | 1.7 |
| 3.6 | Provenance UX (lifecycle history, claim chain) | 0.3 |
| 4 | Real payments (ICP + ckBTC + Stripe + SPICY pay) | 2.8 |
| 5 | ckBTC integration (deposit / sweep / withdraw) | 0.7 |
| 5.5 | Weather provenance (per-plant, backfill, sale/claim) | 0.7 |
| 6 | Multi-canister split + ops + transparency dashboard | 2.3 |
| 6.5 | SpicyAI chatbot + badges + recipe burn | 1.2 |
| 7 | Audit & polish | ongoing |
| 8 | OHSHII integration + treasury structure + buybacks | 2.7 |

Phases 0–7 ship to mainnet ~week 11. Phase 8 layers on after the SPICY LGE.

### 12.2 Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Open-Meteo outage** | Low | Daily polling tolerates gaps; backfill via archive API on recovery; UI surfaces "weather unavailable" without breaking the NFT view. |
| **ICPSwap price manipulation** (small pool) | Medium | TWAP over 6 hours, min/max price guards, refuse swaps outside 2% expected range. |
| **Stripe API breaking change** | Low | Verification logic is a single HTTPS outcall; idempotency on `session_id` so reverts don't double-credit. |
| **NFT redemption arbitrage** (SPICY underpriced) | Medium | 30-day hold, 5/24h rate limit, payouts admin-tunable under timelock, redemption pool is finite (40M SPICY). |
| **Cycle exhaustion** | Low | 90-day freezing threshold, `getCycleBalance()` monitoring, top-up runbook in `AGENTS.md`. |
| **Mainnet upgrade reentrancy bug** | Low | CallerGuard on every async settlement; state-mutate-before-`await`; compensation paths. External audit Phase 7. |
| **Regulatory** (token, RWA, ag) | Medium | Founder operates a registered ag business (FDACS); legal review of tokenomics disclosure pre-LGE; audit firm coordinated for security, separate counsel for token. |
| **Wallet signer regression** (OISY/Plug) | Low | ICRC-25/49 standard; both signers must be tested per release. |
| **HTTPS outcall non-determinism** | Low | All transforms strip headers; tight `max_response_bytes`; deterministic upstream APIs. |
| **Founder dependency** | Medium | Plan-then-execute discipline + AI-paired development with reproducible context (`PROJECT_CONTEXT.md`); audit + multi-admin model means principal compromise does not silently take over the canister. |

### 12.3 Open / non-blocking items

1. **External audit firm selection** (Phase 7).
2. **Spanish translation** — deferred; will be added if Florida customer demand warrants.
3. **OHSHII LGE config details** — confirm contribution unit (ICP vs token-denominated), default vesting schedule, ability to extend lock post-LGE.

---

## 13. Appendices

### 13.1 Mainnet ledger / system canister IDs

| Canister | ID |
|---|---|
| ICP ledger | `ryjl3-tyaaa-aaaaa-aaaba-cai` |
| ckBTC ledger | `mxzaz-hqaaa-aaaar-qaada-cai` |
| ckBTC minter | `mqygn-kiaaa-aaaar-qaadq-cai` |
| ckETH ledger | `ss2fx-dyaaa-aaaar-qacoq-cai` |
| ckUSDC ledger | `xevnm-gaaaa-aaaar-qafnq-cai` |
| ckUSDT ledger | `cngnf-vqaaa-aaaar-qag4q-cai` |
| Cycles Minting Canister | `rkp4c-7iaaa-aaaaa-aaaca-cai` |

**Pending (set after LGE / Phase 2 deploy):**
- SPICY ledger canister ID — TBD post-LGE via OHSHII.
- SPICY/ICP ICPSwap pool canister ID — TBD post-LP creation.
- `nft_assets` canister ID — TBD post-Phase 2 deploy.

### 13.2 ICRC interface excerpts (relevant to integrations)

**ICRC-2 transferFrom (used for all token payments):**

```candid
type TransferFromError = variant {
  BadFee : record { expected_fee : nat };
  BadBurn : record { min_burn_amount : nat };
  InsufficientFunds : record { balance : nat };
  InsufficientAllowance : record { allowance : nat };
  TooOld;
  CreatedInFuture : record { ledger_time : nat64 };
  Duplicate : record { duplicate_of : nat };
  TemporarilyUnavailable;
  GenericError : record { error_code : nat; message : text };
};

icrc2_transfer_from : (TransferFromArgs) -> (variant { Ok : nat; Err : TransferFromError });
```

Every error variant must be handled. Generic catch-all is forbidden.

**ICRC-7 (NFT, used for the IC SPICY collection):**

- `icrc7_token_metadata` is the authoritative read for NFT detail and is **certified**, returning both static traits and live provenance from the `nims_canister`.
- `icrc7_transfer` handles ownership changes; the marketplace canister calls into the NFT canister, never the reverse.

### 13.3 Per-rarity payout & discount table (full reference)

| Rarity | Quantity | Discount | Burn-redeem (SPICY) |
|---|---:|---:|---:|
| Common | 5000 | 5% | 1,000 |
| Uncommon | 2838 | 10% | 3,500 |
| Rare | 1000 | 20% | 12,000 |
| Founder | 50 | 30% | 50,000 |
| **Total** | **8888** | — | — |

### 13.4 Recipe submission gate parameters

| Parameter | Default | Mutable |
|---|---:|---|
| Minimum SPICY balance to submit | 100 | Admin (timelock) |
| Burn per submission | 10 SPICY | Admin (timelock) |
| Edit window after publish | 48 hours | Locked v1 |

### 13.5 Weather API contract (Open-Meteo)

**Endpoint (live)**: `https://api.open-meteo.com/v1/forecast`

**Endpoint (backfill)**: `https://archive-api.open-meteo.com/v1/archive`

**Request shape (relevant fields)**:

```text
?latitude=<lat>&longitude=<lon>&daily=temperature_2m_max,temperature_2m_min,relativehumidity_2m_mean,uv_index_max,precipitation_sum,windspeed_10m_max&timezone=auto
```

**Response transform rules**:
- Strip all headers.
- Parse only `daily.temperature_2m_max[0]`, `daily.temperature_2m_min[0]`, `daily.relativehumidity_2m_mean[0]`, `daily.uv_index_max[0]`, `daily.precipitation_sum[0]`, `daily.windspeed_10m_max[0]`.
- Persist as a `WeatherSnapshot { temp_max, temp_min, humidity, uv_index, precipitation, wind_speed, captured_at, lat, lon }` keyed by `(lat, lon, date)`.
- `max_response_bytes` set to ~5 KB.

### 13.6 Skill references (DFINITY-maintained)

The DFINITY-maintained ICP skills index lives at:

**https://skills.internetcomputer.org/.well-known/skills/index.json**

Each skill below was used as the canonical reference for its area; URL pattern: `https://skills.internetcomputer.org/.well-known/skills/<skill-name>/SKILL.md`.

| Skill | Used for |
|---|---|
| `motoko` | General patterns, version-specific gotchas, JSON parsing |
| `icrc-ledger` | All token transfers (ICP, ckBTC, SPICY, etc.) |
| `ckbtc` | Bitcoin deposits, sweep, withdrawals |
| `canister-security` | Every authenticated method, reentrancy, owner capture |
| `https-outcalls` | Price oracle, weather, Stripe verification |
| `asset-canister` | NFT image/metadata hosting |
| `internet-identity` | Auth flows, delegation handling |
| `wallet-integration` | OISY/Plug ICRC-25/49 |
| `stable-memory` | State persistence across upgrades |
| `multi-canister` | Phase 6 extraction, inter-canister calls |
| `cycles-management` | Production ops, freeze thresholds, top-ups |
| `certified-variables` | Verifiable provenance queries on NFT metadata |
| `custom-domains` | Future: serving under `nft.icspicy.app` |

### 13.7 Glossary

| Term | Meaning |
|---|---|
| **FDACS** | Florida Department of Agriculture and Consumer Services. The nursery is registered. |
| **KNF** | Korean Natural Farming. |
| **JADAM** | Korean ultra-low-cost organic farming methodology. |
| **OHN, FPJ, FAA, LAB, WCA, IMO, JLF, WS** | KNF ferment / input preparations. |
| **JMS, JWA** | JADAM core inputs. |
| **OHSHII** | The platform hosting SPICY's LGE, locker, and DAO. |
| **ICRC-1 / 2 / 7 / 25 / 37 / 49** | ICP token and wallet standards used in this project. |
| **CMC** | Cycles Minting Canister, NNS-controlled, converts ICP to cycles. |
| **TWAP** | Time-Weighted Average Price. Used to harden ICPSwap reads against manipulation. |
| **Burn account** | Anonymous principal `2vxsx-fae`, the canonical IC black hole. |
| **Compensation logic** | The un-mutate-on-failure path that runs when a post-`await` external call fails. |

---

*End of whitepaper. Document drawn from `PROJECT_CONTEXT.md`, `DESIGN.md`, and the live source as of May 2026. Not a securities offering.  Subject to legal review before external distribution.*
