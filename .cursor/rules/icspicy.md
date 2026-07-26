---
description: IC SPICY project quick-reference — canister IDs, principals, payment keys, and deploy commands. Always consult before making canister calls or deploying.
globs:
alwaysApply: true
---

# IC SPICY Quick Reference

> For full architecture and decisions see `PROJECT_CONTEXT.md`.
> For agent workflow rules see `AGENTS.md`.
> This file is the authoritative quick-reference for IDs and keys.

---

## Mainnet Canister IDs

| Canister | ID | URL |
|---|---|---|
| `backend` (NFT ledger + marketplace) | `ghxmp-xiaaa-aaaao-ba4sq-cai` | [Candid UI](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=ghxmp-xiaaa-aaaao-ba4sq-cai) |
| `frontend` (storefront) | `7rukv-hqaaa-aaaao-ba6ma-cai` | [https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io/](https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io/) |
| `nft_assets` (8888 PNGs + JSON) | `gawk3-2qaaa-aaaao-ba4sa-cai` | [https://gawk3-2qaaa-aaaao-ba4sa-cai.icp0.io/](https://gawk3-2qaaa-aaaao-ba4sa-cai.icp0.io/) |
| `docs_frontend` (docs site) | `pr3bu-6aaaa-aaaao-ba5ba-cai` | [https://pr3bu-6aaaa-aaaao-ba5ba-cai.icp0.io/](https://pr3bu-6aaaa-aaaao-ba5ba-cai.icp0.io/) |
| `docs_backend` | `pyyki-iiaaa-aaaao-ba5aq-cai` | — |
| `spicy_ai_canister` | `pd5wn-sqaaa-aaaao-ba5ca-cai` | — |

## Project Owner / Admin Principal

`gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae`  
dfx identity: `ic_deploy` (keyring-backed post Phase 2) or `ic_deploy_plain` (plaintext PEM for CI/automation)

## Cycles Wallet

`daf6l-jyaaa-aaaao-a4nba-cai`

## ICPay Keys (DO NOT COMMIT)

Keys are set on the backend canister via `setICPaySecretKey` (admin-only).
Never write them into source files or commit them to the repo.

- Publishable key embedded in frontend build: `pk_qZ5D…` (prefix only shown)
- Secret key: set on-canister — query `getAuditLog` to confirm `icpay_key_set` entry exists

## Internet Identity

- Production: `https://identity.internetcomputer.org/`
- Local dev: `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943/`
- `ii_derivation_origin` (mainnet frontend): `https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io`

## IC SPICY Collection (8,888 PepperHeads)

- **8,888 ICRC-7 tokens** (IDs **1–8888**), each with pre-generated artwork on `nft_assets` (`/images/nft_<N>.png`).
- **Pre-minted at deploy:** admin `initializeNFTPool()` assigns all IDs to `{ owner = backend; subaccount = null }`. Plants do **not** mint new IDs in the 1–8888 range.
- **Supply cap is fixed at launch.** When plant batches are exhausted, germination logs but **cannot assign** until a **new art collection** ships (separate deploy).
- **Artwork canister:** `gawk3-2qaaa-aaaao-ba4sa-cai`

### Batch allocation (IDs 1–8888)

| Batch | Token IDs | Count | Role |
|---|---|---:|---|
| **Common — plant/product** | 1 – 5,000 | 5,000 | Germination pool (plant batch) |
| **Uncommon — plant/product** | 5,001 – 7,838 | 2,838 | Germination pool (plant batch) |
| **Founder — membership** | 7,839 – 7,888 | 50 | Digital membership ($25); co-op / promos |
| **Rare PepperHead — membership** | 7,889 – 8,726 | 838 | Digital membership; co-op seats |
| **Rare standard — plant/product** | 8,727 – 8,888 | 162 | Germination pool; SPICY burn-eligible |
| **Total** | | **8,888** | |

**Plant/product germination pool:** IDs **1–7838** + **8727–8888** = **8,000** tokens (excludes membership block 7839–8726).

**Reserved / operational sub-batches (within 7839–8726 unless noted):**

| Purpose | Range / count | Notes |
|---|---|---|
| **Co-op grower seats** | **88** tokens scanned from **7891–8726** | Excludes **7845–7890** (claim-labeled block); `designateCoopSeats` |
| **Genesis Ten airdrop** | **7979–7987** (9 tokens) | #7988 stays in pool; `scripts/genesis-ten-airdrop.mjs` |
| **QR / claim labels** | Admin-assigned | `assignNFT(..., #AssignToQR)` on admin pool map |
| **Membership sales** | Any canister-owned **7839–8726** | `purchasePepperHead` ($25) |

### Retired / non-plant ranges (do not use for new NIMS plants)

| Range | Status |
|---|---|
| **100,000 – 199,999** grower-provenance | **RETIRED for plants.** Do not mint for new tray cells. |
| **200,000+** achievement badges | Soulbound; games / masterclass only |

**Grandfathered test artifacts:** grower-provenance tokens **#100_000–#100_006** (tray 3, mainnet) — leave as-is; do not extend this pattern.

---

## NIMS Plant NFT Lifecycle (AUTHORITATIVE)

Plants use tokens from the **8,888 collection** (plant/product batches above). Lifecycle data lives on the **plant record**, keyed by the assigned token ID.

| Stage | Behavior |
|---|---|
| **SOW** (seed in tray cell) | Provenance record **starts**. **`plant.nft_id = null`**. No NFT. |
| **GERMINATE** (manual — grower confirms sprout) | Assign **one available token from the plant batch** (8,000 pool) **with its artwork**. **Only NFT assignment trigger.** Transfer canister pool → grower/admin. |
| **DEATH → GRAVEYARD** | Plant marked dead and moved to the **Graveyard**. **Full record preserved forever** — all provenance, weather, and lifecycle data stays readable (e.g. diagnose a death months later in a grow bag). The assigned PepperHead is **retired with the plant**: permanently bound to that dead plant's record, **not** returned to the assignable pool, **not** reassigned. The assignable pool (**2001–8888**) **permanently shrinks by one** per death. **No burn/destroy** — token and art persist as a memorial bound to the dead plant. |
| **TRANSPLANT / FEED / WATER / REPOT** | Provenance lifecycle events on the plant record (side maps + notes). |
| **SALE** (`claimPlantOwnership` / checkout / QR claim) | The **same 8888 token + provenance** transfer to the buyer's profile. Backend today: `settlePlantPurchase`, `redeemClaim`, `purchasePlant`. |
| **Supply exhaustion** | Germination may still **log** the event; **must not hard-trap** if plant batch is empty — surface graceful “awaiting new collection” UX. |

### Agent rules (NIMS NFT work)

- **Never** mint **100k grower-provenance** tokens for new plants.
- **Never** assign NFT at sow — only at germinate.
- **Never** return dead plant tokens to the assignable pool — **retire with the plant in the Graveyard** per design above (not yet implemented in code — current code returns to pool).
- Prefer **`plantSeed` + germinate** over **`registerPlant`** until backend is realigned.

## Key Deploy Commands

```bash
# Backend upgrade (mainnet)
TERM=xterm-256color dfx deploy --network ic backend <<< $'yes\nyes\n'

# Frontend deploy (mainnet) — requires pnpm in PATH
PATH="/Users/williambeck/.nvm/versions/node/v22.17.0/bin:$PATH" \
  TERM=xterm-256color dfx deploy --network ic frontend <<< $'yes\nyes\n'

# Build frontend for mainnet
cd src/frontend && DFX_NETWORK=ic \
  CANISTER_ID_BACKEND=ghxmp-xiaaa-aaaao-ba4sq-cai \
  VITE_ICPAY_PUBLISHABLE_KEY=pk_qZ5D... \
  pnpm build

# Run Phase 4 smoke test (mainnet)
./scripts/phase4-smoke.sh

# Run Phase 3 smoke test (local only)
./scripts/phase3-smoke.sh
```

## Stable Memory Migration Rules (summary)

See full patterns in `PROJECT_CONTEXT.md` → "Stable Memory Migration Patterns".

1. **`var` record fields are invariant** — never add/remove a `var` field without explicit migration.
2. **Variants in `var` fields are invariant** — `OrderStatus` is locked; use side maps instead.
3. **Stable variables cannot be dropped silently** — keep ghost declarations until explicit migration.
4. **`wasm_memory_persistence: keep` required** — must be in `dfx.json` for `persistent actor class`.

## EOP Ephemeral Memory Layout (CRITICAL)

With `wasm_memory_persistence: keep` (enhanced orthogonal persistence), the **declaration order** of actor-level `let`/`var` bindings determines ephemeral memory slot layout. Inserting a new binding **between** existing ones shifts every subsequent slot — those bindings then read garbage bytes from the wrong type (e.g. a `Nat` counter reading `Map` bytes → `Natural subtraction underflow` trap on `+= 1`).

**Rules:**
- New actor-level ephemeral state **MUST be appended at the END** of the declaration block. Never insert mid-list.
- If a mid-block insert already shipped, do **not** only move the binding — append **fresh** replacements (`sessionCounter`, `sessionStore`, etc.) and wire APIs to the new bindings. Ghost the corrupt slots in place.
- The **stable-interface check does NOT catch this** — it validates stable types only, not EOP slot layout. A CLEAN stable-check is **not** proof the deploy is healthy.
- `postupgrade` heal code that touches corrupt slots can **trap during upgrade** — avoid iterating or assigning to bindings whose heap type may be wrong.

## Post-Deploy Smoke Test (REQUIRED)

Every backend deploy must be followed by a **live mainnet (or local) smoke test** of at least one method per subsystem touched — not only the new method.

Minimum Slicer smoke after any games-backend change:
```bash
TERM=xterm-256color dfx canister --network ic call backend startGameSession '("slicer")'
node scripts/slicer-tail-fix-verify.mjs --network ic --identity ic_deploy_plain
```

"It compiled and stable-check was clean" is **not** verification.
