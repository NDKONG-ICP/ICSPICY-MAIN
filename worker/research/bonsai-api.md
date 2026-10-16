# Bonsai OS API map (Captain Capsaicin)

## Status — LIVE (2026-09-10)

| Step | Result |
|------|--------|
| Canopy / Bonsai principal | `26mw6-xnm4d-zfj7n-rjrrj-pnr3u-jasxq-wnmkp-4gfgt-xrtma-i7ghg-6qe` (same as Capsaicin operating; plain principal — friend-confirmed) |
| Registry CRM | Profile saved as `@CaptainCapsaicin` on `vxhwo-…` (`hasProfile=true`, public resolve works) |
| Orbit Spots mint | **1 minted** — `tokenId=5502`, `serial=5117`, `saleId=14174`, paid **0.05 ICP** (block `38308536`) |
| Limits | Hard-capped at 1 mint / ≤0.05 ICP unit price |

Re-run: `cd worker && node scripts/bonsai-bootstrap.js --status`

## Wallets (multi-treasury)

| Role | Principal | Ecosystem |
|------|-----------|-----------|
| `captain_operating` | `26mw6-…` | Crumbeatr + SWOP + ICP float |
| `canopy_bonsai` | `26mw6-…` (env `CANOPY_WALLET_PRINCIPAL`) | **Entire BonsaiOS** via Canopy wallet path |
| `sweep_destination` | hub `ambassador_sweep_principal` | IC SPICY admin |

Canopy UI (`7h6n6-…`) is II-fronted for humans; agent path uses the same plain principal for CRM/mint/trade (friend: plain principals coincide with Bonsai ecosystem). If a future Canopy login yields a **different** principal, update `CANOPY_WALLET_PRINCIPAL` / hub secret and fund that address.

## Mint economics (Orbit Spots / collection 18)
- Launchpad: `i4fsp-oqaaa-aaaau-agwnq-cai`
- Phase: **14** Public · `priceE8s = 5_000_000` (0.05 ICP)
- Floor (secondary): ~0.0638 ICP → **mint first** (done)
- Pay ICP → treasury `j7j3j-2iaaa-aaaau-agwla-cai`, then `mint(phaseId, blockIndex, to)`

## Canisters
| Role | ID |
|------|-----|
| Registry / CRM | `vxhwo-oiaaa-aaaau-aghdq-cai` |
| Market registry | `jyi55-xqaaa-aaaau-agwlq-cai` |
| Launchpad | `i4fsp-oqaaa-aaaau-agwnq-cai` |
| Treasury | `j7j3j-2iaaa-aaaau-agwla-cai` |
| ICRC-7 ledger | `ivgzt-yyaaa-aaaau-agwma-cai` |
| Bazaar UI | `iabi6-zqaaa-aaaau-agwpq-cai` |
| Canopy UI | `7h6n6-eqaaa-aaaau-ag6da-cai` |

Also: collection `1` = IC SPICY / PepperHeads on the same market registry (`ledger = ghxmp`, external ICRC-7).

## Bazaar listings (IC SPICY ledger on collection 1)

External ledger sell path (verified on mainnet):

1. Owner (Captain `26mw6-…`) calls **our** `icrc37_approve_tokens` with spender = marketplace `i3eu3-diaaa-aaaau-agwna-cai`.
2. Owner calls marketplace `createListing(collectionId, tokenId, priceE8s)`.
3. Buyer pays ICP; marketplace calls our `icrc37_transfer_from` and pays seller.

| Canister | ID |
|----------|-----|
| Marketplace | `i3eu3-diaaa-aaaau-agwna-cai` |
| Indexer (activity) | `iodfw-caaaa-aaaau-agwoq-cai` |

Public manifest (after publish): `https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io/bonsai-drop/manifest.json`

### Bonsai 888 drop runbook (1.2 ICP flat)

```bash
cd worker
node scripts/bonsai-drop-select.js          # seeded draw → data/bonsai-drop/manifest.json
node scripts/bonsai-drop-transfer.js --pem ~/.config/dfx/identity/ic_deploy_plain/identity.pem
node scripts/bonsai-drop-list.js            # Captain mnemonic; approve + list
node scripts/bonsai-drop-publish.js         # upload manifest to frontend canister
```

Admin UI: **Admin → Agents → Bonsai drop** (listings, sales, holders).

**Bonsai team ask (non-blocking):** rename collection 1 display away from “PepperHeads-only” and raise `maxSupply` above 888 so registry stats match the drop.

## Code
- `worker/src/lib/wallets.js` — multi-wallet book
- `worker/src/clients/bonsai.js` — CRM + mint client
- `worker/scripts/bonsai-bootstrap.js` — one-shot bootstrap
- `worker/scripts/bonsai-drop-*.js` — 888 Bazaar drop (select / transfer / list / publish)
- `worker/src/lib/bonsai-drop/` — manifest, PRNG, actors
- `worker/scripts/hedera-*.js` — Hedera mirror drop (select / lock / mint / sync ICRC metadata)
- `worker/src/clients/hedera.js` — HTS + mirror helpers
- `worker/src/clients/blade-grove/` — Blade Grove Arena Story combat + ownership
- `worker/research/blade-grove-arena.md` — Arena canisters + pack receive address
- Hub whitelist: `canopy_wallet_principal` (deploy `agent_hub` to activate on mainnet)
