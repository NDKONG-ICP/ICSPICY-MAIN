# IC SPICY — Project Context for Coding Agents

> **Read this file in full before writing any code in this project.**
> When in doubt, prefer the decisions in this document over your prior assumptions or training data.

---

## What this is

IC SPICY is a real-world-asset (RWA) e-commerce dapp on the Internet Computer.
It's the on-chain storefront and provenance system for a Florida-based pepper nursery selling rare hot-pepper plants. Each plant is tied to an ICRC-7 NFT carrying its on-chain lifecycle history (germination, transplant, sale) and weather provenance (per-plant meteorological data captured throughout cultivation).

The dapp is built and deployed by the project owner using **standard `dfx` + `mops` tooling** (no Caffeine), with **Claude Code in Cursor** as the primary coding assistant.

---

## Architecture decisions (LOCKED IN)

These are the result of a multi-session design process. Do not deviate without explicit user approval.

### Chain & custody
- **Single-chain on ICP.** No Hedera bridge, no cross-chain provenance, no Ethereum integration.
- **Self-custody wallets.** OISY/Plug via ICRC-25/49 signer integration for all financial actions.
- **No in-canister custodial wallet.** The simulated wallet code in the existing codebase will be deleted in Phase 4.
- **Internet Identity** is used for app login (chat, profile, lifecycle).
- **Wallet connection** is a separate explicit "Connect Wallet" flow that links the II principal to a wallet principal for downstream NFT/payment actions.

### Tooling & build
- **Standard moc compiler.** No Caffeine fork, no `--default-persistent-actors` flag.
- **Explicit `persistent actor` annotations** on every actor declaration.
- **`dfx` for deployment**, `mops` for dependencies, `dfx generate` for Candid bindings.
- **Local replica testing required** before any mainnet deploy.

### Multi-canister target architecture (Phase 6 extraction)

**The `backend` canister created in Phase 2 is permanent infrastructure.** It is the forever home of all 8888 ICRC-7 NFTs. In Phase 3, NFTs are minted to `Account { owner = Principal.fromActor(Self); subaccount = null }` — the backend canister's own principal. They transfer out to buyers/claimants from there. NFTs are never bulk-moved to a new canister; doing so would require re-minting or breaking ownership history.

Phase 6 is correctly described as **extraction of other concerns out of backend**, not a "split" that moves NFTs. The backend canister stays; everything else moves out:

| Canister | Description | Relation to `backend` |
| --- | --- | --- |
| `backend` / `nft_canister` | ICRC-7/37 NFT ledger — **same canister, two names** | Permanent; code upgraded in place |
| `frontend` | React UI asset canister | Independent; already exists |
| `nft_assets` | 8888 PNGs + JSON metadata, ~1.33GB asset canister | Independent; created Phase 2 |
| `marketplace_canister` | Products, orders, offers, discount engine | Extracted from backend Phase 6 |
| `treasury_canister` | ICP/ckBTC/SPICY custody, buybacks, burns | Extracted from backend Phase 6 |
| `community_canister` | Posts, recipes, profiles | Extracted from backend Phase 6 |
| `nims_canister` | Plants, trays, lifecycle, weather | Extracted from backend Phase 6 |
| `spicy_ai_canister` | Chatbot via `mo:llm` | New canister Phase 6.5 |

**SPICY token flow note:** SPICY tokens don't exist until Phase 8 LGE. By then `treasury_canister` already exists (created Phase 6). The LGE allocation goes directly to `treasury_canister` — no intermediate hop through `backend`.

**NFT initial ownership:** `Account { owner = Principal.fromActor(Self); subaccount = null }` — the backend canister holds all unminted NFTs. This is the correct ICRC-7 pattern; the canister is both the ledger and the initial owner.

Phases 0–5 happen in the existing single-canister `backend`; Phase 6 extracts other concerns out, leaving `backend` as the permanent NFT ledger.

---

## Tokenomics (LOCKED IN)

### Token: SPICY
- ICRC-1 token, deployed via OHSHII Launcher
- Total supply: 1,000,000,000

### Allocation breakdown
- **LGE Public Sale: 700M (70%)**
  - Founder participates with verified wallet, capped at 18M tokens
  - Founder's 18M is voluntarily locked for 24 months via OHSHII Locker (6-month cliff + 18-month linear vest)
- **ICPSwap LP: 200M (20%)** — locked 4 years via OHSHII Locker
- **IC SPICY Treasury: 100M (10%)** — held by treasury_canister, structured by subaccount:
  - 25M NFT redemption pool (PepperHeads excluded from burn redemption reduces required pool)
  - 10M quarterly burn reserve
  - 25M marketing/community
  - 15M operational reserve
  - 25M strategic reserve

### Burn destination
- **Burn account: anonymous principal `2vxsx-fae`** — universal black hole, no governance handle.

### Treasury growth via buybacks (Phase 8)
- **Timer-driven monthly buybacks.** `Timer.recurringTimer` swaps 2% of operational ICP balance per month against ICPSwap.
- **TWAP slippage protection** — refuse swaps if price outside 2% expected.
- **Public buyback log** queryable by anyone.
- Tokens acquired via buyback flow into the redemption pool subaccount or burn reserve, admin-configurable.

---

## NFT design (LOCKED IN)

### Collection
- **8888 ICRC-7 NFTs**, pre-generated by NFT Matrix tool
- **Static traits** already defined in JSON metadata files (10 trait layers per NFT)
- **Distribution:** 5000 Common, 2838 Uncommon, 1000 Rare, 50 Founder
- **Collection name:** "IC SPICY" (originals say "The NFT Matrix" — must be templated)

### Hosting
- **Dedicated `nft_assets` asset canister** for PNGs + metadata JSONs.
- **NEVER** store NFT artwork in backend canister heap.
- Use `icp0.io` (certified paths), not `raw.ic0.app`.
### Source assets location (pre-upload)
- PNGs: `nft_collection/nft_<N>.png` for N in 1..8888 (flat, at folder root)
- JSON metadata: `nft_collection/metadata/nft_<N>.json` for N in 1..8888
- Total size: ~1.3 GB
- `nft_collection/` is in .gitignore — kept locally only, uploaded to asset canister in Phase 2
- Originals contain placeholders: `YOUR_ICP_CANISTER_ID`, `YOUR_CANISTER_ID`, `YOUR_PRINCIPAL_ID`, `YOUR_COLLECTION_ID`
- Originals also use `raw.ic0.app` URLs — must be templated to `icp0.io` (certified path)
- Originals collection name is "The NFT Matrix" — must be templated to "IC SPICY"
### Metadata templating (one-time pre-upload)
Original metadata files contain placeholders that must be replaced before upload:
- `YOUR_ICP_CANISTER_ID` → nft_assets canister ID
- `YOUR_CANISTER_ID` → backend/nft canister ID
- `YOUR_PRINCIPAL_ID` → IC SPICY admin/creator principal
- `YOUR_COLLECTION_ID` → stable collection identifier (e.g., `icspicy-nft-matrix-v1`)
- Collection name `"The NFT Matrix"` → `"IC SPICY"`

### Discount tiers (NFT-only, no DAO bonus)
- Founder: 30%
- Rare: 20%
- Uncommon: 10%
- Common: 5%
- **Discount must be computed server-side at checkout. NEVER trust frontend-claimed discount.**

### Membership NFTs (PepperHeads)

- **888 of the 8888 NFTs are designated PepperHeads** — a membership-bearing subset of the main collection.
- **Composition:** 50 Founder + 838 Rare
  - Rare PepperHead range: pool IDs 7888–8725 (first 838 of the 1000 Rare tier, 0-indexed per lib/pool.mo)
  - Corresponding token files: nft\_7889–nft\_8726 (pool.mo uses 0-indexed IDs; artwork-upload sets id = i + 1)
  - Remaining 162 Rare (pool IDs 8726–8887 → nft\_8727–nft\_8888): standard Rare, burn-eligible
- **Acquisition:** digital-only purchase at flat $25; no physical plant bundled. Available via all three payment paths (Stripe, ICPay, Wallet).
- **Cannot be burned for SPICY tokens** — see NFT burn redemption section for guard details.
- **Holder benefits:**
  - Whitelist for future NFT drops: 24-hour early access window, reserved allocation, and discount on drop pricing (specific percentages set per drop)
  - Chatbot tier: 2500 calls/24h (between standard NFT-holder 1000 and SPICY-bonus maximum)
  - All standard discount benefits: Founder gets 30% off plants, Rare gets 20% off plants
- **On-chain metadata (Phase 3):** every PepperHead token carries `is_pepperhead: Bool = true` as a per-token attribute. Collection-level metadata includes PepperHead total (888) alongside other tier counts.
- **`isPepperHead(tokenId : Nat) : Bool` helper:** returns true if token is in the Founder set OR in the Rare PepperHead range (pool IDs 7888–8725, 0-indexed).
- **`isPepperHeadAvailable() : async Nat` query:** returns count of unsold PepperHead tokens — used for "X of 888 remaining" UI display.

### NFT burn redemption (one-way conversion to SPICY)

- **PepperHead exclusion (Phase 8):** `redeemNftForSpicy` must call `isPepperHead(tokenId : Nat)` first. If true, trap: `"PepperHead NFTs cannot be redeemed for SPICY. They confer membership benefits instead — discount, whitelist, premium chatbot."`
- Common: 1,000 SPICY
- Uncommon: 3,500 SPICY
- Rare: 12,000 SPICY
- Founder: 50,000 SPICY
- **Anti-arbitrage measures (REQUIRED):**
  - 30-day minimum hold from mint/transfer date before redemption eligible
  - Max 5 redemptions per principal per 24h
  - Per-rarity payouts admin-tunable (so they can be lowered if arbitrage emerges)
- **Compensation logic required** — if SPICY transfer fails after NFT marked burned, un-burn the NFT.

### NFT custody on burn
- Transfer to burn account (anonymous principal) — Option A from canister-security skill.
- Do NOT use a `#Burned` status flag that breaks ICRC-7 semantics.

### Provenance metadata (live, computed at query time)
ICRC-7 `icrc7_token_metadata` returns both static traits (from JSON) and live provenance:
- Plant variety, germination date, growing location
- Stage history (germination, transplant, sale, claim) with weather snapshots
- Current owner principal
- "Authentic IC SPICY plant grown in Port Charlotte, FL — FDACS registered"

---

## Payment model (LOCKED IN)

### Three parallel payment paths (Phase 4)

**Default checkout ordering (mass-market first):** Stripe → ICPay → Wallet

**Wallet-detection reordering:** if `window.ic` (OISY/Plug provider) is detected at page load, reorder to Wallet → Stripe → ICPay so IC-native users see their preferred flow first.

### Path 1: Stripe (fiat card)

- HTTPS outcall verification — NOT a webhook receiver
- Frontend redirects to Stripe Checkout hosted page
- After return, frontend calls `confirmStripePayment(orderId, sessionId)`
- Backend HTTPS outcall to `GET /v1/checkout/sessions/:id`
- Verify: `payment_status == "paid"`, amount matches order, currency matches, `metadata.order_id` matches
- Idempotency: each `session_id` can mark only one order paid (recorded in `stripeSessionsConsumed` map)
- USD settles to bank account; off-chain reconciliation for ICP/SPICY equivalent
- Stripe secret key stored in canister state (admin-settable, never in source); Stripe publishable key (`pk_` prefix) embedded in frontend

### Path 2: ICPay (ICP-native card processor)

- ICP-native card processor; settles crypto directly to canister
- Uses publishable `pk_` API key embedded in frontend — designed for client-side exposure per ICPay docs (same model as Stripe's `pk_test_`/`pk_live_`)
- Publishable key goes in `.env` config, not hardcoded in source committed to git
- Integration pattern TBD when ICPay docs confirmed; follow same HTTPS outcall verification structure as Stripe

### Path 3: Wallet (OISY/Plug ICRC-25/49)

- User pre-approves canister via wallet's signer popup (ICRC-25/49)
- Backend pulls funds via `icrc2_transfer_from` on order placement
- Supported tokens: ICP, ckBTC, ckETH, ckUSDC, ckUSDT
- Lowest fees; no off-chain dependency
- Look up `icrc1_fee()` per ledger — never hardcode fees
- Always set `created_at_time` for dedup
- Handle every variant of `TransferFromError` (BadFee, InsufficientFunds, Duplicate)

### Pay-with-SPICY option
- 10% discount vs. USD-equivalent price
- SPICY tokens sent to burn account (`2vxsx-fae`) — NOT to treasury
- Price computed via ICPSwap SPICY/ICP pool, TWAP over 6 hours
- Min/max guards: refuse if SPICY price outside $0.001–$1.00 range (configurable)

### Stripe fallback (for non-crypto customers)
- Path 2 from earlier design: HTTPS outcall verification, NOT webhook receiver
- Frontend redirects to Stripe Checkout hosted page
- After return, frontend calls `confirmStripePayment(orderId, sessionId)`
- Backend HTTPS outcall to `GET /v1/checkout/sessions/:id`
- Verify: `payment_status == "paid"`, amount matches order, currency matches, metadata.order_id matches
- Idempotency: each session_id can mark only one order paid (recorded in `stripeSessionsConsumed` map)
- Stripe API key stored in canister state, admin-settable, never in source code

### ckBTC integration (real, not simulated)
- Per-user subaccount derivation: `principalToSubaccount(p)` — 32 bytes, first byte = principal length
- Deposit address from `get_btc_address` on minter `mqygn-kiaaa-aaaar-qaadq-cai`
- Sweep deposits via `update_balance` (CRITICAL — BTC sent to address does nothing without this call)
- Withdrawal via `icrc2_approve` + `retrieve_btc_with_approval`
- Minimum withdrawal: 50,000 satoshis (0.0005 BTC)

---

## SPICY balance gates (LOCKED IN)

These are the only IC SPICY features gated on SPICY token balance:

### Recipe submission
- Must hold ≥ N SPICY (admin-tunable, default 100 SPICY)
- 10 SPICY burned per submission (in addition to balance check)
- Spam prevention + micro-deflation

### Chatbot bonus calls
- Base tier from NFT ownership (see chatbot section)
- Bonus: +50 calls/24h per 100 SPICY held
- Capped at +2000 bonus calls

### Legend badge
- Holding ≥ 100,000 SPICY grants Legend badge (display only)
- Threshold admin-tunable
- Multi-badge stacking: Legend, Founder NFT, Rare NFT, Recipe Master, etc.

**Anti-pattern:** never gate purchases on SPICY balance. Discount tiers are NFT-only.

---

## OHSHII / DAO integration (LOCKED IN)

### Architecture
- **DAO is hosted entirely on OHSHII.** Users vote at ohshii.com via deep link.
- **IC SPICY does NOT query OHSHII governance canister.**
- IC SPICY only interacts with the SPICY ICRC-1 ledger (transfers in/out).
- Users link to ohshii.com via "Vote on OHSHII →" buttons; no embedded DAO UI in IC SPICY.

### What the canister DOES integrate
- SPICY ledger (ICRC-1) for redemption payouts and pay-with-SPICY burns
- Treasury subaccount management for SPICY allocations
- Quarterly admin-discretion burns from fee burn reserve

### What the canister does NOT integrate
- OHSHII governance proposal queries
- OHSHII locker voting power queries
- Cross-canister governance execution
- DAO-controlled parameter pushes

If future needs require DAO queries (Phase 9+), revisit the principal-linking design.

---

## Weather provenance (LOCKED IN)

### Per-plant tracking
- Each plant has `latitude`, `longitude` fields
- Daily polling via HTTPS outcall to `api.open-meteo.com` (free, deterministic, no API key)
- Backfill on inventory add via `archive-api.open-meteo.com` (one outcall covers any date range back to 1940)
- Group by location to reduce outcalls (e.g., 200 trays at nursery coords = 1 outcall, not 200)
- Set `max_response_bytes` to ~5KB tight bound

### Lifecycle integration
- Sale → `provenance_state := #Paused` (skipped in daily sweep)
- Buyer claims NFT and provides location → `#Tracking` resumed with new lat/lon
- Each stage transition (germination, transplant, sale, claim) captures a weather snapshot
- Snapshots embedded in NFT ICRC-7 metadata via the `properties.weather_provenance` array

### Privacy
- New owner location tracking is **opt-in** at claim time
- Default: "End provenance here" — no further weather snapshots after claim
- Opt-in users: location rounded to 0.1° (~7 mile resolution) to protect privacy

### Transform function
- Strip all response headers in transform (timestamps break replica consensus)
- Open-Meteo responses are deterministic for fixed (lat, lon, date)

---

## SpicyAI chatbot (LOCKED IN)

### Implementation
- Uses `mo:llm` library with **Llama 4 Scout** model
- Free during preview; native ICP integration; 1-line `LLM.chat(...)` API
- 10 KiB system prompt cap, 1000-token response cap
- Lives in dedicated `spicy_ai_canister` (Phase 6.5)

### System prompt content
Domain expertise covering:
- Korean Natural Farming (KNF): OHN, FPJ, FAA, LAB, WCA, IMO, JLF, WS preparations and ratios
- JADAM Organic Farming: JMS, JWA, ultra-low-cost approach
- Permaculture: zone planning, polyculture, food forests, water harvesting
- Florida-specific gardening: USDA zones 8b–11, sandy soils, rainy season, pest pressure
- Capsicum cultivation across rare varieties: Carolina Reaper, Bhut Jolokia, Trinidad Scorpion, Aji varieties, Datil, Habanada

### UI
- Floating chat bubble on every page (mounted at layout root, persists across nav)
- Conversation state in user's browser localStorage, NOT in canister
- Last 6 user/assistant pairs kept; older messages dropped

### Rate limits (LOCKED IN)
| Tier | Calls/24h | Conversation length |
|---|---|---|
| Anonymous | 20 | 10 |
| Authenticated (II logged in) | 200 | 50 |
| NFT holder | 1000 | 100 |
| PepperHead holder | 2500 | 100 |
| + SPICY balance bonus | +50 per 100 SPICY held | (no change) |
| Bonus cap | +2000 | — |

### Zero-log policy (CRITICAL)
- NEVER store question text or answer text
- NEVER `Debug.print` user content (canister logs are visible to controllers)
- Generic error messages only — no `Runtime.trap("Failed: " # question)`
- Daily call counter increments only — no per-user history retention
- Disclose in privacy policy: "DFINITY AI workers can see prompts but cannot identify users"

### Multilingual (deferred)
- English only at launch
- Spanish translation deferred per user direction
- System prompt accepts language parameter for future expansion

---

## Security posture (LOCKED IN)

### Required on every authenticated method
- Reject anonymous principal: `if (Principal.isAnonymous(caller)) Runtime.trap(...)`
- Use `requireAuthenticated(caller)` and `requireAdmin(caller)` helpers consistently

### Owner / admin
- Capture deployer via `shared(msg) persistent actor class` — NOT hardcoded text strings
- `addAdmin` / `removeAdmin` methods (admin-only) for rotation without redeployment
- For fresh deployments: user's `dfx` identity becomes initial owner

### Reentrancy protection
- CallerGuard pattern (`Map<Principal, Bool>` per-caller lock) on all async settlement methods
- Wrap with `try/finally` to release on every path
- Specifically required for: `placeOrder`, `acceptOffer`, `redeemNftForSpicy`, `purchaseWithSpicy`, `confirmStripePayment`, treasury transfers, buyback execution

### Pre-consensus filtering
- `inspect_message` filter rejects anonymous calls to admin-only methods
- Saves cycles by dropping invalid calls before consensus

### State changes around `await`
- All state mutations BEFORE `await` for NFT/token transfer settlement
- If post-await operation fails, run compensation logic (un-burn NFT, refund SPICY, etc.)
- Document the compensation path explicitly in code comments

### Timelock for material economic params
- Discount tiers, redemption payouts, marketplace fees: changes require 7-day timelock
- Operational fixes (pause sales, hot-fix bug): admin-only, no timelock
- All admin actions logged to public audit trail

### API key handling

- **ICPay publishable keys (`pk_` prefix)** are designed for client-side exposure — safe to embed in frontend bundle, analogous to Stripe's `pk_test_`/`pk_live_`. These are not secrets.
- Publishable keys still go in `.env` config, not hardcoded in source committed to git.
- **Rule for all credentials:** secrets, private keys, and API keys are loaded from environment variables or admin-set canister state. Never committed to source control. Never pasted into chat.

### Anti-patterns (DO NOT)
- Hardcode admin principals in source code
- Store images or large blobs in backend canister heap
- Mutate state after `await` without reentrancy lock
- Trust amounts/discounts/prices from frontend
- Use `Debug.print` on user content
- Deploy directly to mainnet without local testing
- Query LLM canister synchronously on hot paths without rate limiting
- Use Caffeine's `--default-persistent-actors` flag or `caffeineai-*` deps

---

## Phase plan (12 weeks total to mainnet)

| Phase | Description | Weeks |
|---|---|---|
| 0 | Pre-flight: snapshot, asset inventory, principals verification | 0.2 |
| 0.5 | Caffeine → dfx migration (tooling, moc, deps) | 0.5 |
| 1 | Security foundations (anonymous reject, owner, CallerGuard, inspect_message) | 0.7 |
| 2 | Asset infrastructure (nft_assets canister, 1.33GB upload) | 0.7 |
| 3 | ICRC-7 + certified provenance | 1.7 |
| 3.6 | NFT detail page at `icspicy.app/nft/{N}` — lifecycle timeline, weather chart, provenance chain, on-chain certification verification, trait display; plus Provenance UX (lifecycle history, claim chain) | 1.0 |
| 4 | Real payments (ICP+ckBTC+Stripe+ICPay+SPICY pay) + PepperHead purchase flow | 3.5 |
| 5 | ckBTC integration (deposit/sweep/withdraw) | 0.7 |
| 5.5 | Weather provenance (per-plant, backfill, sale/claim) | 0.7 |
| 6 | Extract canisters from backend + ops + transparency dashboard | 2.3 |
| 6.5 | SpicyAI chatbot + badges + recipe burn | 1.2 |
| 7 | Audit & polish | ongoing |
| 8 | OHSHII integration + treasury structure + buybacks | 2.7 |

**Phase 3 implementation note:** ICRC-7 must include `is_pepperhead: Bool` per-token attribute and collection-level PepperHead count (888) in metadata.

**Phase 4 implementation note:** PepperHead purchase flow — $25 fixed-price digital-only purchase that mints/transfers a PepperHead from the unsold pool to the buyer. Available via all three payment paths. Distinct from plant-bundled NFT acquisition. Include `isPepperHeadAvailable() : async Nat` query for "X of 888 remaining" UI.

Phases 0–7 ship to mainnet ~week 11. Phase 8 layers on after SPICY LGE.

---

## Skills repository (USE THESE)

The DFINITY-maintained ICP skills index lives at:
**https://skills.internetcomputer.org/.well-known/skills/index.json**

Before writing code that touches any of these areas, **fetch the relevant SKILL.md fresh** (skills update frequently — do not rely on cached or training-data versions):

| Skill | Use when |
|---|---|
| `motoko` | General patterns, version-specific gotchas, JSON parsing |
| `icrc-ledger` | Any token transfer (ICP, ckBTC, SPICY, etc.) |
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
| `custom-domains` | Future: serving under nft.icspicy.app |
| `icp-cli` | Future: migration from dfx |

URL pattern: `https://skills.internetcomputer.org/.well-known/skills/<skill-name>/SKILL.md`

---

## External dependencies & canister IDs

### Mainnet ledgers
- ICP ledger: `ryjl3-tyaaa-aaaaa-aaaba-cai`
- ckBTC ledger: `mxzaz-hqaaa-aaaar-qaada-cai`
- ckBTC minter: `mqygn-kiaaa-aaaar-qaadq-cai`
- ckETH ledger: `ss2fx-dyaaa-aaaar-qacoq-cai`
- ckUSDC ledger: `xevnm-gaaaa-aaaar-qafnq-cai`
- ckUSDT ledger: `cngnf-vqaaa-aaaar-qag4q-cai`

### Project canister IDs

**Locked in (Phase 2 mainnet deploy — complete):**

- `nft_assets` mainnet canister ID: `gawk3-2qaaa-aaaao-ba4sa-cai`
  - 8888 PNGs at `/images/nft_<N>.png`
  - 8888 JSON metadata at `/metadata/nft_<N>.json`
  - Upload completed in two passes (resume capability proved during cycle exhaustion event)
  - 6T cycles allocation, 90-day freezing threshold
  - Controllers: `gqkko-43bbx-...` (deployer identity) + `daf6l-jyaaa-aaaao-a4nba-cai` (cycles wallet)

- `backend` mainnet canister ID: `ghxmp-xiaaa-aaaao-ba4sq-cai`
  - Empty placeholder; code installed in Phase 7 after audit
  - Becomes permanent ICRC-7 NFT ledger; do NOT replace this canister
  - 3T cycles initial allocation, 90-day freezing threshold
  - Controllers: same as nft_assets

**Pending (created in later phases):**

- `frontend` asset canister — Phase 7 deployment
- `marketplace_canister` — Phase 6 extraction
- `treasury_canister` — Phase 6 extraction
- `community_canister` — Phase 6 extraction
- `nims_canister` — Phase 6 extraction
- `spicy_ai_canister` — Phase 6.5

**Pending (external to project, post-LGE):**

- SPICY ICRC-1 ledger — TBD post-LGE via OHSHII
- SPICY/ICP ICPSwap pool — TBD post-LP creation

Verify all canister IDs via the relevant skill's SKILL.md before hardcoding.

---

## Pre-existing technical debt

Tracked from the Phase 1.5 frontend regression check. Each item has a target phase and rationale.

- **B1 — Hardcoded admin PIDs in two frontend files.** [src/frontend/src/hooks/useBackend.ts:866-870](src/frontend/src/hooks/useBackend.ts#L866-L870) (`ADMIN_PIDS` Set, source of truth for `useIsAdmin`) and [src/frontend/src/components/ActorReadyProvider.tsx:42-46](src/frontend/src/components/ActorReadyProvider.tsx#L42-L46) (`ADMIN_PIDS` array, used to gate the admin-actor probe). Scheduled for **Phase 1.5** — replace with a `useAdmins()` hook backed by `actor.getAdmins()` query. **Security-relevant:** frontend currently cannot observe backend admin rotation. Both files contain the same three legacy II-derived PIDs (`lgjjr-…-tae`, `7qhp3-…-4o5gh`, `7qhp3-…-qae`); these do **not** match the current deployer/admin principal `gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae` recorded under Project owner / admin principals — frontend admin gating is currently divorced from the backend admin set.
- **B2 — Always-on `console.log` of principal in `useIsAdmin`.** [src/frontend/src/hooks/useBackend.ts:937-950](src/frontend/src/hooks/useBackend.ts#L937-L950). Scheduled for **anytime convenient** — gate on `import.meta.env.DEV`. Cosmetic privacy hardening; the principal is not a secret but does not need to appear in production logs.
- **B5 — DAO hooks (`useProposals`, `useProposal`, `useCreateProposal`, `useVoteOnProposal`).** Scheduled for **Phase 8** deletion alongside backend DAO subsystem removal (governance moves to OHSHII per the OHSHII / DAO integration section).
- **B6 — Wallet page hooks wired to simulated wallet.** Scheduled for **Phase 4** deletion alongside `mixins/wallet-api.mo` and `lib/wallet.mo` when real ICP/ckBTC/Stripe/ICPay payment paths land.

### Phase 1.5 Frontend Regression Check

Ran the regression check against the Phase 1 backend changes. Results: **1 Phase 1 latent regression (6d, retired)**, **1 local-dev blocker (`env.json` placeholders, separate config issue)**, **4 pre-existing debt items** (tracked above), and a **large Phase 3.6 sizing signal** (NFT image rendering machinery confirmed as from-scratch work). Finding 6d (`_initializeAccessControl` IDL annotation) was retired by regenerating `src/declarations/backend/` against the current `.did` (commit b34b99f had already regenerated; a fresh `dfx generate backend` produces no diff, confirming declarations are in sync with the backend's `query` annotation).

---

## Open / non-blocking items

1. **External audit firm** (Phase 7) — Trail of Bits, Vespertine, OAK Security, Hacken. Budget $30–60K. Schedule early; firms book months out.
2. **Spanish translation** — deferred. Add later if Florida customer demand warrants.
3. **OHSHII LGE config details** — confirm with OHSHII dev: contribution unit (ICP vs token-denominated), default vesting schedule, ability to extend lock post-LGE.

---

## Tokenomics disclosure document

Before LGE goes live, the project owner publishes a tokenomics disclosure document covering:
- Total supply and allocation breakdown
- Founder allocation (18M, 24-month vest with 6-month cliff, lock ID published)
- Treasury structure and policy
- Burn mechanics (pay-with-SPICY, quarterly, recipe submission)
- Buyback policy (timer-driven monthly, 2% of operational ICP)
- Governance via OHSHII
- Audit & transparency commitments

Coding agents should not generate this document — it is a project-owner artifact requiring legal review.

---

## Last updated
Refresh this document whenever architectural decisions change. Date stamp:
- Initial version: drafted from multi-session design conversations
- Owner: project lead — review before sharing externally
