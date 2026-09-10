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

Also: collection `1` = IC SPICY / PepperHeads on the same market registry.

## Code
- `worker/src/lib/wallets.js` — multi-wallet book
- `worker/src/clients/bonsai.js` — CRM + mint client
- `worker/scripts/bonsai-bootstrap.js` — one-shot bootstrap
- Hub whitelist: `canopy_wallet_principal` (deploy `agent_hub` to activate on mainnet)
