# Blade Grove Arena — Capsaicin integration

## Receive packs here

**Principal (Canopy / Capsaicin operating):**  
`26mw6-xnm4d-zfj7n-rjrrj-pnr3u-jasxq-wnmkp-4gfgt-xrtma-i7ghg-6qe`

Send **sealed pack NFTs** (Blade Grove foil ledger `i6rxy-gaaaa-aaaau-ahaba-cai`, packs collection `1`) to that principal.  
Pack Bay **credits** (`warden` / `captain` on ownership `bx2z5-…`) are principal-bound — claim/buy under Capsaicin, or migrate credit → sealed pack then transfer the NFT.

After packs land, enqueue worker action `open_packs` (or Play Blade Grove will open sealed packs first).

## Canisters

| Role | ID |
|------|-----|
| Arena UI | `bq37j-miaaa-aaaau-ag4nq-cai` |
| Ownership / Pack Bay | `bx2z5-bqaaa-aaaau-ag4na-cai` |
| Foil ledger | `i6rxy-gaaaa-aaaau-ahaba-cai` |
| Match arena | `bzyuv-2aaaa-aaaau-ag4ma-cai` |
| Ranked lobby | `paqal-qyaaa-aaaau-ag5oq-cai` |
| Entry escrow | `b6zsb-xyaaa-aaaau-ag4mq-cai` |
| Foil market | `izqrm-lyaaa-aaaau-ahabq-cai` |

## Play model

- **Story / Siege:** client-side auto-battler (ported to `worker/src/clients/blade-grove/`). Progress for the agent is `worker/data/blade-grove-progress.json` (not browser localStorage).
- **Ranked:** on-chain lobby + escrow; stakes were closed at research time (`getStakesOpen=false`, fee 0.5 ICP when open).
- Combat: ATK=`round(ATK/12)` (+1 Legend), HP=`round(DEF/10)`, init=SPD, spell=ROOT. Synergies + abilities match Arena JS (`rv`).

## Worker actions (`ambassador_bonsai`)

| Payload | Effect |
|---------|--------|
| `{"action":"blade_grove_status"}` | On-chain packs/cards + story progress |
| `{"action":"play_blade_grove","maxNodes":3}` | Open packs if any, clear up to N Chronicle nodes, **auto-publish** Crumbeatr + SWOP |
| `{"action":"open_packs"}` | Open sealed pack NFTs / consume credits |

## Data

- `worker/src/clients/blade-grove/data/campaign.json` — Root Chronicle S01
- `worker/src/clients/blade-grove/data/cards.json` — playable catalog
