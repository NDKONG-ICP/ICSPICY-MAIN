# NIMS Seed Tray Batch Registration

> Implemented 2026-07-26. Complements tray workflow with `registerPlant` / `registerPlantBatch`.

## Plant type change — **NONE**

The requested `trayId : ?Text` / `cellIndex : ?Nat` fields were **not added** to `Plant`.

**Reason:** `Plant` already has immutable `tray_id : TrayId` and `cell_position : Nat` (`src/backend/types/plants.mo`). The `Tray` entity (`cells : [?PlantId]`, length 72) provides grouping. Adding new fields to `Plant` would break stable-memory upgrade rules (`AGENTS.md`: `var` record fields are invariant).

**Stable-compat check:** `dfx build backend` — **CLEAN** (warnings only, no stable-interface errors).

## New actor state (appended at END)

| Binding | Purpose |
|---|---|
| `growerBatchMintLimits` | Separate hourly cap (128) for batch mints |

Existing: `nextGrowerTokenId`, `growerProvenanceMeta`, `growerMintLimits`.

## API

### `registerPlant(sharedData, cellIndex, overrides?)`

- **Auth:** Co-op seat holder OR admin
- **Tray:** Must own tray or be admin
- Creates `#Seed` plant in cell (or reuses existing plant in cell)
- Mints **grower provenance ICRC-7** token (100k–199999) via `GrowerProvLib.mintGrowerToken`
- Sets `plant.nft_id`, `nftTokenPlantIds`, provenance note in `plantNotesLog`
- **Rate limit:** 20/hour (`growerMintLimits`)

### `registerPlantBatch(sharedData, cells)`

- Same auth as single register
- **Max 128 cells** per call (`NimsLib.REGISTER_BATCH_MAX_CELLS`)
- **Partial failure semantics (a):** best-effort per cell; returns `RegisterPlantBatchResult` with per-cell `#ok | #err | #skipped`
- **Idempotent re-run:** cells with existing NFT → `#skipped`; empty cells → create + mint; plant without NFT → mint only
- **Batch rate limit:** 128 mints/hour (`growerBatchMintLimits`, separate from single 20/hour)

### Types (`src/backend/types/plants.mo`)

- `RegisterPlantSharedData` — tray_id, variety_id, container_size, origin, planting_date, notes, genetics, common_name, latin_name
- `RegisterPlantCellInput` — cell_index, overrides?
- `RegisterPlantBatchResult` — results[], succeeded, failed, skipped

## Frontend

- **NIMS → Trays:** “Batch register” mode on tray grid
- Multi-select: tap cells, “Select empty”, “Select row”, “Clear”
- `RegisterPlantBatchModal` — shared form → one `registerPlantBatch` call
- Progress via pending mutation; results table with per-cell ok/skip/err
- **`plantSeed` unchanged** for non-co-op users (no NFT at seed time)

## Verification

```bash
dfx deploy --network local backend --yes
node scripts/verify-register-plant-batch.mjs
```

Checks: 12-cell batch → 12 NFTs on grid → `startGameSession("slicer")`.

## Cycles note (mainnet 72-mint batch)

Each grower provenance mint is an ICRC-7 ownership assign (no HTTPS outcall). 72 mints ≈ 72 state updates in one update call. Monitor backend cycle balance before full-tray batch on mainnet; no separate NFT canister — mints happen in backend heap.
