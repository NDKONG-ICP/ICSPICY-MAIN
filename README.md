# IC SPICY 🌶️

A real-world-asset (RWA) dapp for the IC SPICY pepper nursery in Port Charlotte,
Florida — running fully on-chain on the [Internet Computer](https://internetcomputer.org).

**Live app:** [icspicy.app](https://icspicy.app)

## What it does

- **8,888-token ICRC-7 NFT collection** — each pepper plant sold in person or
  online is bound to an NFT carrying its full lifecycle provenance: germination,
  transplants, feedings, weather snapshots, photos, and sale record.
- **NIMS (Nursery Inventory Management System)** — tray-based grow tracking from
  seed to sale, with QR claim labels printed for physical plants. Claims are
  armed by staff at the point of sale, so a scanned tag can only be redeemed by
  the actual buyer.
- **Shop** — physical products and NFT-bound plants, paid via ICPay (crypto) or
  PayPal, with server-side price recomputation and payment verification.
- **Pepper Masterclass & CookBook** — free growing lessons and recipes
  (openly licensed, see below).
- **Weather Desk** — NOAA/tropical weather monitoring for growers, backed by
  HTTPS outcalls and an agent swarm (newsletter, social, ops agents).
- **Verified Growers** — an on-chain registry of partner nurseries.

## Architecture

| Layer | Stack |
|---|---|
| Backend | Motoko (`src/backend/`), single main canister composed from mixins, plus satellite canisters (uploads, NFT assets, weather, agents) |
| Frontend | React + TypeScript + Vite (`src/frontend/`), served from an IC asset canister |
| Auth | Internet Identity |
| Tokens | ICRC-7 NFTs (native), ICRC-1/2 ledgers for payments |

Key mainnet canisters:

| Canister | ID |
|---|---|
| backend | `ghxmp-xiaaa-aaaao-ba4sq-cai` |
| frontend | `7rukv-hqaaa-aaaao-ba6ma-cai` |
| nft_assets | `gawk3-2qaaa-aaaao-ba4sa-cai` |
| uploads | `r53pg-maaaa-aaaao-ba7na-cai` |

## Development

Prereqs: [dfx](https://internetcomputer.org/docs/building-apps/getting-started/install) ≥ 0.29,
[mops](https://mops.one), Node 20+, pnpm.

```bash
# Backend (from src/backend/)
mops install
$(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check

# Frontend (from src/frontend/)
pnpm install --prefer-offline
pnpm typecheck
pnpm build

# Local replica (from project root)
dfx start --background --clean
dfx deploy --network local backend
```

See `AGENTS.md` for the full agent/contributor workflow and hard-won
operational learnings, and `PROJECT_CONTEXT.md` for architectural decisions.

## Licensing

This repository is dual-licensed:

- **Code** (Motoko, TypeScript, scripts): [Apache-2.0](LICENSE)
- **Educational content** (masterclass lessons, cookbook recipes, growing
  guides): [CC BY 4.0](LICENSE-CONTENT)

The IC SPICY name, logo, brand assets, and NFT artwork are **not** open source —
see `LICENSE-CONTENT` for the exact carve-outs.

## Security

If you find a vulnerability, please report it privately rather than opening a
public issue. All canister admin methods are principal-gated; secrets are held
in canister state via admin-set methods and are never committed to this repo.
