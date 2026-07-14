# Slicer Deterministic Spawn Specification (Phase 1)

> **Scope:** Spawn *substrate* only — which ingredient spawns when, and frenzy windows.
> Physics (trajectory, gravity, rotation) remain client-side floats and are **not** part of this spec.
> Score validation and badge minting are Phase 2+.

## Hard rule: integer-only derivation

All spawn derivation uses **integer arithmetic only**:

- TypeScript: `bigint` with explicit `%` wraparound
- Motoko: `Nat` with explicit `%` wraparound
- **No floats, no `Math.random`, no wall-clock** in the derivation path

The quiz shuffle bug (202/220 vectors diverged) happened because JS `Number` lost precision on large LCG multiplications. This spec uses the same LCG constants as `lib/masterclass.mo` but always on bigint/Nat.

---

## SpawnEvent

| Field | Type | Description |
|-------|------|-------------|
| `index` | Nat | 0-based sequence position |
| `objectId` | Nat | 1-based stable object id for replay |
| `kind` | Nat | Ingredient enum (see below) |
| `spawnTimeMs` | Nat | Virtual elapsed ms when this object enters play |
| `isFrenzy` | Bool | `true` for frenzy-burst spawns |

### Ingredient kind enum (`kind`)

| Nat | Name |
|-----|------|
| 0 | lime |
| 1 | tomato |
| 2 | onion |
| 3 | garlic |
| 4 | mango |
| 5 | chili |
| 6 | rare_chili |

### Spawn weights (integer)

| Kind | Weight |
|------|--------|
| lime | 18 |
| tomato | 16 |
| onion | 14 |
| garlic | 12 |
| mango | 10 |
| chili | 8 |
| rare_chili | 2 |

---

## PRNG: Park–Miller style LCG (31-bit)

Matches `lib/masterclass.mo` `lcgNext`:

```
LCG_MOD  = 2_147_483_648   (2^31)
LCG_MULT = 1_103_515_245
LCG_INC  = 12_345

lcgNext(state) = (state * LCG_MULT + LCG_INC) % LCG_MOD
```

**Initial state:** `state₀ = seed % LCG_MOD`

Each draw consumes one `lcgNext` call. Document every draw site in code comments.

---

## Level curve (integer)

### Score thresholds (levels 1–6+)

```
thresholds = [0, 5000, 15000, 35000, 75000, 150000]
perLevelAfter = 100_000
```

```
levelFromScore(score):
  level = 1
  for i in 1..5:
    if score >= thresholds[i]: level = i + 1
  if score >= 150_000:
    level = 6 + (score - 150_000) / 100_000
  return max(1, level)
```

### Spawn interval per level (integer ms)

Replicates `DIFFICULTY.paramsForLevel` without floats:

```
steps = level - 1
interval = max(380, (1400 * 9^steps + 5 * 10^steps) / 10^steps)
```

`9^steps` and `10^steps` via integer exponentiation (binary pow).

### Ingredient pool per level

Base pool (level 1): `[tomato, onion, lime]` → kinds `[1, 2, 0]`

Unlocks (append when `level >= unlockLevel`):

| Level | Kind |
|-------|------|
| 2 | garlic (3) |
| 3 | mango (4) |
| 4 | chili (5) |
| 5 | rare_chili (6) |

### Virtual score advance (sequence generation only)

Each **normal** (non-frenzy) spawn advances virtual score by **150** SHU for level-curve simulation. This is a fixed integer stand-in for player performance during offline sequence generation; live gameplay score still comes from actual slices.

### Frenzy burst count

```
frenzyBaseCount(level) = min(16, 6 + ((level - 1) * 3) / 2)   // integer division
burstExtra = lcgNext(state) % 3
frenzyCount = frenzyBaseCount + burstExtra
```

---

## Frenzy timing (seed-derived)

Constants:

```
FRENZY_INTERVAL_MS = 45_000
```

**First frenzy window:**

```
firstFrenzyAt = FRENZY_INTERVAL_MS + (seed % FRENZY_INTERVAL_MS)
```

Range: **45_000 – 89_999 ms** (inclusive lower, exclusive upper on modulo wrap).

**Subsequent windows:** `nextFrenzyAt += FRENZY_INTERVAL_MS` after each burst is emitted.

Frenzy bursts are emitted as `frenzyCount` consecutive `SpawnEvent`s at the same `spawnTimeMs`, all with `isFrenzy = true`.

---

## Sequence generation algorithm

Pure function: `getSpawnSequence(seed, count) → [SpawnEvent]`

```
state = seed % LCG_MOD
virtualTime = 0
virtualScore = 0
objectId = 1
spawnIndex = 0
nextFrenzyAt = FRENZY_INTERVAL_MS + (seed % FRENZY_INTERVAL_MS)
events = []

while events.length < count:
  if virtualTime >= nextFrenzyAt:
    level = levelFromScore(virtualScore)
    state = lcgNext(state)
    extra = state % 3
    frenzyCount = frenzyBaseCount(level) + extra
    for j in 0 .. frenzyCount-1:
      state = lcgNext(state)
      kind = pickWeightedKind(state, level)
      append { index: spawnIndex, objectId, kind, spawnTimeMs: virtualTime, isFrenzy: true }
      spawnIndex += 1; objectId += 1
      if events.length >= count: break
    nextFrenzyAt += FRENZY_INTERVAL_MS
    continue

  level = levelFromScore(virtualScore)
  interval = spawnIntervalMs(level)
  state = lcgNext(state)
  kind = pickWeightedKind(state, level)
  append { index: spawnIndex, objectId, kind, spawnTimeMs: virtualTime, isFrenzy: false }
  spawnIndex += 1; objectId += 1
  virtualTime += interval
  virtualScore += 150
```

### Weighted kind selection

```
pool = poolForLevel(level)           // [Nat]
totalWeight = sum(SPAWN_WEIGHTS[k] for k in pool)
state = lcgNext(state)               // if not already advanced this draw
roll = state % totalWeight
walk pool in order, subtract weights until roll < weight → return kind
```

---

## Session seed generation (canister)

`startGameSession` generates seed server-side via **IC management canister `raw_rand`**:

```motoko
let randBlob = await IC.raw_rand();
seed = seedFromBlob(randBlob)
```

`seedFromBlob` folds the first 32 bytes of the blob:

```
h = 0
for each byte b in blob[0..31]:
  h = (h * 257 + b) % 2_147_483_647
seed = h (or byte[0]+1 if h==0)
```

This seed is **unpredictable** to clients before session start. Sessions expire after **30 minutes**. The `consumed` flag is set on `submitSlicerRun` (success or rejection) — single-use.

---

## Phase 2: Slice-log validation + server score

### Slice log JSON (client → server)

```json
{
  "durationMs": 45000,
  "livesLost": 1,
  "slices": [
    { "objectIndex": 0, "sliceTimeMs": 1500 },
    { "objectIndex": 3, "sliceTimeMs": 2100 }
  ]
}
```

Client **does not** submit a claimed score. Server recomputes from session seed + log.

### MAX_FLIGHT_MS = 10_000

Derived from engine physics:

- Whole objects use `lifeMs = 8000` as design lifetime reference
- Objects remain sliceable from `spawnTimeMs` until they fall off-screen (gravity + launch arcs)
- **10_000ms** = 8000ms life budget + 25% buffer for high-level slow arcs and timing jitter

Valid window per object: `[spawnTimeMs, spawnTimeMs + MAX_FLIGHT_MS]`

### Run duration tail (MAX_END_TAIL_MS = 45_000)

`durationMs` is total game clock at game-over. After the final slice the player may still
miss objects and lose up to 3 lives before the run ends — each miss needs up to
`MAX_FLIGHT_MS` of game time, and spawns can stagger. The server accepts
`durationMs <= lastSliceTimeMs + 45_000`.

### Scoring (integer-only)

```
SHU_BASE = [100, 150, 150, 200, 250, 500, 2500]  // kind 0..6
COMBO_WINDOW_MS = 900
frenzyMult = 2 if spawnEvent.isFrenzy else 1
comboMultiplier: 1,2,3,5,7,10 for combo 1,2,3,4,5,6+
```

Server sorts slices by `(sliceTimeMs, objectIndex)`, recomputes combo from timestamps, sums score.

### Slicer leaderboard path

- **Ranked:** `submitSlicerRun(sessionId, sliceLogJson)` only
- **`submitGameScore("slicer", ...)`** rejected — cheat vector closed
- **Guests:** unranked, no submit
- **Historical scores:** preserved (legacy entries untouched)

---

## Phase 3: Milestone badges (validated runs only)

### Locked badge type IDs

| `badgeType` | Milestone | Threshold |
|---|---|---|
| `slicer-first-blood` | First 10K run | score ≥ 10_000 |
| `slicer-craft-batch` | Craft Batch | score ≥ 50_000 |
| `slicer-reserve-batch` | Reserve Batch | score ≥ 100_000 |
| `slicer-legendary-batch` | Legendary Batch | score ≥ 250_000 |
| `slicer-frenzy-master` | Frenzy Master | bestCombo ≥ 20 |
| `slicer-reaper-hunter` | Reaper Hunter | rareChilisSliced ≥ 10 |

Minting runs **only** inside `submitSlicerRun` after validation + score recompute. No public mint API. Per-game gate: only `slicer-*` badge types may mint via `#game` source; pepper-patch / crafter remain disabled.

A single validated run may earn **multiple** badges at once (e.g. 120K first run → first-blood + craft-batch + reserve-batch).

### Badge metadata (`metadataJson`)

```json
{
  "game": "slicer",
  "milestone": "first-blood",
  "threshold": 10000,
  "score": 12345,
  "seed": 226516493,
  "sessionId": "gs-1-…",
  "sliceLogHash": "sha256-hex-of-canonical-log",
  "earnedAt": 1783831597533545315
}
```

### Canonical slice log + hash

Server and client use identical canonical JSON (no whitespace, slices sorted by `(sliceTimeMs, objectIndex)`):

```
{"durationMs":N,"livesLost":N,"slices":[{"objectIndex":N,"sliceTimeMs":N},…]}
```

`sliceLogHash = sha256(canonicalSliceLogJson)` (lowercase hex).

### Third-party badge verification (end-to-end)

1. **Read badge** — `getBadgesByPrincipal(owner)` or ICRC-7 metadata; parse `metadataJson`.
2. **Pin the run** — note `seed`, `sessionId`, `sliceLogHash`, `score`, `threshold`.
3. **Re-derive spawn sequence** — `getSpawnSequence(seed, N)` with `N = max(objectIndex)+1` (same as validation). Compare to `docs/slicer-determinism.md` algorithm or run `scripts/slicer-spawn-parity.mjs`.
4. **Obtain slice log** — the submitter (or published replay) must provide the JSON log whose canonical serialization hashes to `sliceLogHash`. Verify: `sha256(canonicalSliceLogJson) === sliceLogHash`.
5. **Recompute score** — run integer validation (`lib/slicer-score.mo` / `slicer-scoring.ts` `validateRun(seed, log)`). Assert `score` matches badge metadata and threshold is met.
6. **Idempotency** — same `(canonical principal, badgeType)` yields one soulbound token (200_000+ range).

No grandfathering: pre-Phase-3 leaderboard scores do not mint badges.


---

## Client consumption

- **Signed-in arcade:** `startGameSession("slicer")` → server `seed` → client runs `deriveSpawnSequence(seed, N)` locally.
- **Guest arcade:** client-generated bigint seed (crypto RNG); unranked, no session, no leaderboard submit.
- **Prep mode:** pantry queue unchanged; no spawn sequence.

Client spawns when `elapsedMs >= event.spawnTimeMs`. Physics uses floats; only kind/timing/frenzy flag come from sequence.
