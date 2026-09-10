# Bonsai OS API map (Captain Capsaicin) — partial

## Feasibility
**Unknown / blocked without friend-dev help for SPOT Orbit mint path.**

Frontend is II-first (`bonsaios.app` → `2dxs4-nyaaa-aaaau-agzda-cai`). Bundle is agentic-friendly and references Orbit UI keys (`bonsai_os_orbit_v1`) plus a market registry, but mint economics and whether plain (non-II) principals can mint were not verified end-to-end.

## Canisters spotted in frontend config
| Role (guess from config keys) | ID |
|------|-----|
| Shell / frontend | `2dxs4-nyaaa-aaaau-agzda-cai` |
| Market registry | `jyi55-xqaaa-aaaau-agwlq-cai` |
| Market holder directory | `x7l5j-2iaaa-aaaau-agyka-cai` |
| Feed proxy | `c53tg-waaaa-aaaau-agxwq-cai` |
| Bonsai Cloud | `336h7-dyaaa-aaaau-agzha-cai` |
| Bonsai Works | `z2htg-hqaaa-aaaau-agzkq-cai` |
| Blade Grove game | `bq37j-miaaa-aaaau-ag4nq-cai` |

Also embeds SWOP + Crumbeatr IDs for social badges.

## Blockers for the Bonsai friend
1. Exact canister ID + candid for **SPOT Orbit NFT** mint (cost, payment rail: ICP/OISY/Stripe).
2. Confirm backends accept **self-authenticating principals** (not only II delegations).
3. Bazaar list/buy/sell method names (ICRC-7 vs custom).
4. Registry profile create + avatar upload method.

## Transfer-out
Once NFT/token canister IDs are known: standard `icrc7_transfer` / `icrc1_transfer` from Captain principal `26mw6-...` to admin — same sweep pattern as Crumbeatr/SWOP.

## Status
Ambassador kind `ambassador_bonsai` is seeded on hub and awaits `bonsai_registry_canister_id` (+ orbit/bazaar secrets) before the client is wired.
