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

## NFT Pool

- Total supply: **8888 tokens** (IDs 1–8888)
- PepperHead range: IDs **7839–8726** (inclusive) → 888 tokens
- Founder range: IDs **7839–7888** (50 tokens, subset of PepperHead range)
- All tokens minted to pool account: `{ owner = backend; subaccount = null }`

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
