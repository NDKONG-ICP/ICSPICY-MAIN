# IC SPICY ICRC-7 NFT Architecture — Technical Explainer

> **Audience:** A competent ICP developer who understands Motoko/dfx but is new to ICRC-7 and is coming from an ERC-721 / IPFS mental model.
>
> **Scope:** Grounded in IC SPICY's actual implementation. This is not a generic tutorial.
>
> **Mainnet IDs (reference only):** `backend` `ghxmp-xiaaa-aaaao-ba4sq-cai`, `nft_assets` `gawk3-2qaaa-aaaao-ba4sa-cai`.

---

## 1. The big picture — ICRC-7 on ICP vs ERC-721 / IPFS

### Correcting the ERC-721 mental model

On Ethereum, the usual pattern is:

1. Upload `metadata.json` and the image to IPFS.
2. Mint an ERC-721 token whose `tokenURI` points at that IPFS CID.
3. Wallets and marketplaces fetch metadata over HTTP from IPFS gateways.

On the Internet Computer with ICRC-7, **metadata for the standard query path lives in canister state**, not as files you "upload" to the ledger canister.

IC SPICY's `icrc7_token_metadata` returns typed `[(Text, ICRC7.Value)]` entries built from:

| Token ID range | Metadata source | Storage shape |
|---|---|---|
| 1–8,888 (collection) | Pre-generated traits | `Map<Nat, Blob>` — raw JSON bytes parsed at query time |
| 100,000–199,999 (grower provenance) | Mint-time fields | `growerProvenanceMeta` — typed Motoko record |
| 200,000+ (achievement badges) | Mint-time fields | `badgeRegistry` — typed Motoko record |

The routing happens in one query method:

```230:261:src/backend/mixins/icrc7-api.mo
  public query func icrc7_token_metadata(token_ids : [Nat]) : async [?[(Text, ICRC7.Value)]] {
    Array.map<Nat, ?[(Text, ICRC7.Value)]>(
      token_ids,
      func(id : Nat) : ?[(Text, ICRC7.Value)] {
        if (AchievementsLib.isAchievementToken(id)) {
          switch (badgeRegistry.get(id)) {
            case null null;
            case (?rec) ?AchievementsLib.buildMetadataEntries(id, rec);
          };
        } else if (GrowerProvLib.isGrowerProvenanceToken(id)) {
          switch (growerProvenanceMeta.get(id)) {
            case null null;
            case (?meta) ?GrowerProvLib.buildMetadataEntries(meta);
          };
        } else {
          switch (icrc7TokenMetadataRaw.get(id)) {
            case null null;
            case (?blob) {
              switch (JsonMini.parse(blob)) {
                case (#err _) null;
                case (#ok value) {
                  switch value {
                    case (#Map entries) ?entries;
                    case _              null;
                  };
                };
              };
            };
          };
        };
      },
    );
  };
```

**Ownership** is separate from metadata: `icrc7Owners : Map<Nat, Account>` plus a denormalized `icrc7Balances` index. Both are mutated only through `ICRC7Lib.assignOwnership` (see `src/backend/lib/icrc7.mo`).

### What role does a JSON file play?

JSON files are **offline source data**, not on-chain storage.

For the 8,888 collection NFTs:

1. Local files live at `nft_collection/metadata/nft_<N>.json` (gitignored; ~1.3 GB total with PNGs per `PROJECT_CONTEXT.md`).
2. `scripts/template-metadata.js` substitutes placeholders (canister IDs, creator principal, image URLs).
3. `scripts/load-icrc7-metadata.mjs` reads those files and calls the admin method `loadStaticMetadata` on the **backend** canister.
4. The backend stores each file's bytes in `icrc7TokenMetadataRaw` — never as an uploaded "file" inside the canister filesystem.

```96:131:src/backend/mixins/icrc7-api.mo
  public shared({caller}) func loadStaticMetadata(
    entries : [(Nat, Blob)],
  ) : async LoadStaticMetadataResult {
    AccessControl.requireAdmin(accessControlState, caller);
    // ...
    for ((tokenId, blob) in entries.vals()) {
      switch (icrc7TokenMetadataRaw.get(tokenId)) {
        case (?_) { skipped += 1 };
        case null {
          switch (JsonMini.parse(blob)) {
            case (#err msg) { /* record error */ };
            case (#ok _) {
              icrc7TokenMetadataRaw.add(tokenId, blob);
              Cert.putTokenMetadata(certStore, tokenId, blob);
              loaded += 1;
            };
          };
        };
      };
    };
    // ...
  };
```

**The JSON file is never "the metadata URI."** It is input to a seeding script that writes **Blob bytes into a map**. Wallets calling `icrc7_token_metadata` hit canister state, not IPFS and not a file path.

### Images are different — separate asset canister

Images are **not** stored in the backend heap. They live on a dedicated `nft_assets` asset canister (`gawk3-2qaaa-aaaao-ba4sa-cai` on mainnet). Metadata JSON contains an `image` field whose value is an HTTPS URL on that canister, e.g.:

`https://gawk3-2qaaa-aaaao-ba4sa-cai.icp0.io/images/nft_42.png`

That URL is written during templating (`scripts/template-metadata.js`), then the same JSON bytes are loaded into backend state. The image itself is uploaded separately (`scripts/upload-nft-assets.js`).

IC SPICY also uploads copies of the JSON files to `nft_assets` at `/metadata/nft_<N>.json`. **The backend does not read those copies at query time.** They are a public mirror; `icrc7_token_metadata` always serves from `icrc7TokenMetadataRaw` (or the grower/badge side maps).

---

## 2. Canister setup — do you create the canister first?

**Yes.** You need real canister IDs before you can template metadata URLs and deploy.

### Our `dfx.json` layout

```9:24:dfx.json
    "backend": {
      "type": "motoko",
      "main": "src/backend/main.mo",
      "args": "--actor-idl src/backend/system-idl",
      "wasm_memory_persistence": "keep"
    },
    "frontend": {
      "type": "assets",
      "source": ["src/frontend/dist"],
      "dependencies": ["backend"]
    },
    "nft_assets": {
      "type": "assets",
      "source": ["nft_assets_src"],
      "build": []
    },
```

IC SPICY uses **two canisters** for NFTs:

| Canister | Role | Permanent? |
|---|---|---|
| `backend` | ICRC-7/37 ledger, ownership, metadata maps, marketplace, plants, games | **Yes** — `PROJECT_CONTEXT.md` locks this as the forever home of all tokens |
| `nft_assets` | Static PNGs + JSON mirrors (~1.33 GB) | Independent; created in Phase 2 |

`PROJECT_CONTEXT.md` is explicit: the Phase 2 `backend` canister is permanent infrastructure. All 8,888 collection tokens are minted to `Account { owner = Principal.fromActor(Self); subaccount = null }` and transfer out from there. NFTs are not bulk-migrated to a new ledger canister.

### Typical deploy order (local first)

1. `dfx start --background --clean`
2. `dfx deploy --network local backend` — creates backend, returns canister ID
3. Create/install `nft_assets` — for asset canisters, this project uses `dfx canister create` + `dfx canister install` with explicit wasm (see `AGENTS.md` Phase 2 notes) because `dfx deploy` on asset canisters can fail on the root `npm run build` step
4. Note both canister IDs — you need them for `template-metadata.js`
5. Admin calls on backend (in order):
   - `initializeNFTPool()` — mints token IDs 1–8,888 to the canister principal
   - `loadStaticMetadata` (via script) — loads JSON blobs into `icrc7TokenMetadataRaw`
6. Upload images + JSON mirrors to `nft_assets` via `scripts/upload-nft-assets.js`

**What you get back:** canister IDs and a running actor exposing Candid methods (`icrc7_*`, `icrc37_*`, plus IC SPICY-specific methods). The ID matters immediately for templating `image` URLs and for frontend/agent configuration.

---

## 3. Do you have to write ICRC-7 yourself?

**No — but IC SPICY did**, because the product needed more than a stock collection:

- Three semantic token-ID ranges on one ledger (collection / grower / soulbound badges)
- Custom soulbound transfer guards
- Integration with plants, co-op seats, games, masterclass, and marketplace settlement in the same actor
- Certified metadata envelope (Phase 3.6) tied to raw JSON blobs

Our implementation is **not** a drop-in library. It is spread across:

- `src/backend/types/icrc7.mo` — spec-aligned types
- `src/backend/lib/icrc7.mo` — ownership helper, transfer validation, dedup
- `src/backend/lib/icrc37.mo` — approvals
- `src/backend/mixins/icrc7-api.mo` — public ICRC-7/37 API surface

There is **no standard ICRC-7 wasm you download and install**. You either:

1. Import a Motoko/Rust library into your own actor, or
2. Deploy a reference implementation's canister and extend it

### Real alternatives (verified links)

| Option | Language | URL | Notes |
|---|---|---|---|
| **ICRC-7 spec** | Candid / docs | [github.com/dfinity/ICRC/tree/main/ICRCs/ICRC-7](https://github.com/dfinity/ICRC/tree/main/ICRCs/ICRC-7) | Authoritative standard; `.md` + `.did` |
| **PanIndustrial `icrc7.mo`** | Motoko | [github.com/PanIndustrial-Org/icrc7.mo](https://github.com/PanIndustrial-Org/icrc7.mo) | Mops package; README warns beta / not audited |
| **PanIndustrial example NFT** | Motoko | [github.com/PanIndustrial-Org/icrc_nft.mo](https://github.com/PanIndustrial-Org/icrc_nft.mo) | ICRC-7 + ICRC-37 + ICRC-3 combined example |
| **noku-team `icrc7_motoko`** | Motoko | [github.com/noku-team/icrc7_motoko](https://github.com/noku-team/icrc7_motoko) | Alternative Motoko implementation |
| **ORIGYN `nft`** | **Rust** | [github.com/ORIGYN-SA/nft](https://github.com/ORIGYN-SA/nft) | Production-oriented ICRC-7/37/3; separate storage subcanister pattern |
| **ORIGYN `origyn_nft`** | Motoko | [github.com/ORIGYN-SA/origyn_nft](https://github.com/ORIGYN-SA/origyn_nft) | **Older proprietary Origyn standard — not ICRC-7** |

**Recommendation for a newcomer:** Start from PanIndustrial's `icrc_nft.mo` example or ORIGYN's Rust `nft` repo if you want a self-contained collection canister. Only fork IC SPICY's approach if you need the same multi-range / marketplace-coupled design.

---

## 4. How metadata is stored in our canister

### ICRC-7 `Value` type (spec-aligned)

```48:59:src/backend/types/icrc7.mo
  public type Value = {
    #Nat   : Nat;
    #Int   : Int;
    #Text  : Text;
    #Blob  : Blob;
    #Array : [Value];
    #Map   : [(Text, Value)];
  };

  public type CollectionMetadata = [(Text, Value)];
```

`icrc7_token_metadata` returns `?[(Text, Value)]` per token — key/value metadata entries, not a JSON string.

### Three storage patterns

**A. Collection NFTs (1–8,888): raw JSON `Blob`**

```300:305:src/backend/main.mo
  // Static metadata: token_id → raw JSON bytes from the templated mainnet
  // metadata files. Bulk-loaded by admin via loadStaticMetadata (Phase 3.2);
  // parsed lazily by icrc7_token_metadata at query time.
  let icrc7TokenMetadataRaw : Map.Map<Nat, Blob>               = Map.empty<Nat, Blob>();
```

At query time, `JsonMini.parse` converts the blob to `Value`, and the top-level JSON object becomes the metadata map. Malformed JSON was already rejected at `loadStaticMetadata` time.

**B. Grower provenance (100k–199,999): typed side map**

```26:38:src/backend/lib/grower-provenance.mo
  public func buildMetadataEntries(
    meta : CoopTypes.GrowerProvenanceMeta,
  ) : [(Text, ICRC7.Value)] {
    [
      ("name", #Text("IC SPICY Grower Provenance #" # Nat.toText(meta.plantId))),
      ("icspicy:kind", #Text("grower_provenance")),
      ("icspicy:grower", #Text(Principal.toText(meta.grower))),
      ("icspicy:grower_name", #Text(meta.growerName)),
      ("icspicy:plant_id", #Nat(meta.plantId)),
      ("icspicy:variety", #Text(meta.variety)),
      ("icspicy:minted_at", #Int(meta.mintedAt)),
    ];
  };
```

**C. Achievement badges (200k+): typed side map**

```61:77:src/backend/lib/achievements.mo
  public func buildMetadataEntries(
    tokenId : Nat,
    rec : AchievementTypes.BadgeRecord,
  ) : [(Text, ICRC7.Value)] {
    [
      ("name", #Text("IC SPICY Badge: " # rec.badgeType)),
      ("description", #Text("Soulbound achievement badge (" # sourceToText(rec.source) # ")")),
      ("image", #Text(PLACEHOLDER_IMAGE)),
      ("icspicy:kind", #Text("achievement_badge")),
      ("icspicy:badge_type", #Text(rec.badgeType)),
      ("icspicy:tier", #Text(rec.tier)),
      ("icspicy:source", #Text(sourceToText(rec.source))),
      ("icspicy:earned_at", #Int(rec.earnedAt)),
      ("icspicy:token_id", #Nat(tokenId)),
      ("icspicy:soulbound", #Text("true")),
    ];
  };
```

Note: badges currently use a **frontend placeholder SVG URL**, not `nft_assets`. That is idiosyncratic — do not assume all token images follow the same upload path.

### Certified reads (optional path)

`icrc7_token_metadata_certified` returns the raw blob plus a Merkle witness over certified data (`src/backend/mixins/icrc7-api.mo`). This covers collection NFT blobs inserted during `loadStaticMetadata`; grower/badge dynamic metadata uses the uncertified `icrc7_token_metadata` path today.

---

## 5. How images work

### Separate asset canister

Per `PROJECT_CONTEXT.md` and `docs/WHITEPAPER.md`:

- PNGs: `nft_collection/nft_<N>.png` → uploaded to `/images/nft_<N>.png` on `nft_assets`
- JSON mirrors: templated `nft_<N>.json` → uploaded to `/metadata/nft_<N>.json` on `nft_assets`
- Served via `https://<nft_assets_id>.icp0.io/...` (certified asset paths)

### How the URL gets into metadata

`scripts/template-metadata.js` rewrites placeholders in local JSON **before** either upload path:

```69:75:scripts/template-metadata.js
  // Originals: https://YOUR_ICP_CANISTER_ID.raw.ic0.app/N.png
  // Target:    https://<id>.icp0.io/images/nft_N.png
  text = text.replace(
    `https://YOUR_ICP_CANISTER_ID.raw.ic0.app/${nftNum}.png`,
    `https://${nftAssetsId}.icp0.io/images/nft_${nftNum}.png`,
  );
```

Then:

1. **`upload-nft-assets.js`** pushes PNG bytes to the asset canister.
2. **`load-icrc7-metadata.mjs`** pushes the same JSON **bytes** into `icrc7TokenMetadataRaw` on the backend.

```106:124:scripts/upload-nft-assets.js
// PNG path MUST match the image URL written into templated metadata
  queue.push({
    assetKey:    `/images/nft_${n}.png`,
    // ...
  });
  queue.push({
    assetKey:    `/metadata/nft_${n}.json`,
    // ...
  });
```

### Contrast with IPFS

| | ERC-721 / IPFS | IC SPICY ICRC-7 |
|---|---|---|
| Image storage | IPFS CID | `nft_assets` asset canister (HTTP URL in metadata) |
| Metadata storage | IPFS JSON at `tokenURI` | Backend `Map<Nat, Blob>` (+ dynamic maps for minted types) |
| Wallet query | HTTP fetch of `tokenURI` | Candid `icrc7_token_metadata([tokenId])` |
| Immutability | Content-addressed CID | Asset canister keys + backend state (upgradeable actor) |

---

## 6. How minting works

All ownership changes go through **`ICRC7Lib.assignOwnership`** — the sole mutator for `icrc7Owners` / `icrc7Balances`.

```106:112:src/backend/lib/icrc7.mo
  public func assignOwnership(
    owners      : Map.Map<Nat, ICRC7.Account>,
    balances    : Map.Map<Principal, Set.Set<Nat>>,
    tokenId     : Nat,
    fromAccount : ?ICRC7.Account,
    toAccount   : ICRC7.Account,
  ) : Result.Result<(), Text> {
```

- `fromAccount = null` → **mint** (no prior owner)
- `fromAccount = ?owner` → **transfer** or burn

### (a) Collection NFT — `initializeNFTPool`

Admin method mints every ID from 1 to `totalSupplyCap` (8,888) to the canister itself:

```157:187:src/backend/mixins/icrc7-api.mo
  public shared({caller}) func initializeNFTPool() : async {
    initialized : Nat;
    skipped     : Nat;
  } {
    AccessControl.requireAdmin(accessControlState, caller);
    let self : ICRC7.Account = {
      owner      = selfPrincipal();
      subaccount = null;
    };
    // ...
    while (tokenId <= totalSupplyCap) {
      switch (icrc7Owners.get(tokenId)) {
        case (?_) { skipped += 1 };
        case null {
          switch (IcrcLib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, null, self)) {
            case (#ok) { initialized += 1 };
            // ...
          };
        };
      };
      tokenId += 1;
    };
    { initialized; skipped };
  };
```

**Token ID:** fixed integers 1–8,888 (not allocated from a counter).

**Ownership:** written by `assignOwnership(..., null, self)`.

**Metadata:** **not** set during mint. Loaded separately via `loadStaticMetadata`. Until that runs, `icrc7_token_metadata` returns `null` for those IDs.

**Distribution to buyers:** `adminTransferFromPool` moves Self-owned tokens to recipients (sales, claims). Soulbound badges are rejected on this path too.

### (b) Soulbound achievement badge — `AchievementsLib.mintBadge`

Called from game validation (`src/backend/lib/slicer-badges.mo`), masterclass pass (`src/backend/lib/masterclass.mo`), or admin API (`mintAchievementBadge` in `src/backend/mixins/achievements-api.mo`).

```148:171:src/backend/lib/achievements.mo
    let owner = LinkedIdentity.canonicalPrincipal(recipient, walletToIdentity);
    let tokenId = nextAchievementTokenId.value;
    if (tokenId < ACHIEVEMENT_TOKEN_START) {
      return #err("achievement token counter below reserved range");
    };
    let ownerAccount : ICRC7.Account = { owner; subaccount = null };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, null, ownerAccount)) {
      case (#err(e)) { return #err("Mint failed: " # e) };
      case (#ok) {};
    };

    let rec : AchievementTypes.BadgeRecord = { /* badgeType, tier, earnedAt, owner, metadataJson, source */ };
    badgeRegistry.add(tokenId, rec);
    badgeByOwnerType.add(ownerTypeKey(owner, badgeType), tokenId);
    nextAchievementTokenId.value += 1;
    #ok(tokenId);
```

**Token ID:** monotonic counter starting at `200_000` (`nextAchievementTokenId` in `main.mo`).

**Ownership:** minted directly to the user's principal (canonical II if wallet-linked).

**Metadata:** stored in `badgeRegistry`; exposed via `buildMetadataEntries` at query time. No JSON file involved.

**Idempotency:** `badgeByOwnerType` prevents duplicate badges of the same `badgeType` across linked principals.

### Bonus: Grower provenance mint

`mintGrowerProvenanceToken` in `src/backend/mixins/coop-api.mo` allocates from `nextGrowerTokenId` (starts at `100_000`), then calls `GrowerProvLib.mintGrowerToken`, which assigns ownership and writes `growerProvenanceMeta`.

---

## 7. The token-ID range scheme

IC SPICY overloads **numeric ranges** as semantics on a single ICRC-7 ledger:

| Range | Kind | Mint mechanism | Metadata source |
|---|---|---|---|
| **1 – 8,888** | Pre-generated collection (incl. 888 PepperHeads) | `initializeNFTPool` | `icrc7TokenMetadataRaw` |
| **100,000 – 199,999** | Grower provenance (per-plant) | `mintGrowerProvenanceToken` | `growerProvenanceMeta` |
| **200,000+** | Soulbound achievement badges | `mintBadge` (games, masterclass, admin) | `badgeRegistry` |

### Where boundaries are enforced

**Achievement / soulbound (≥ 200,000):**

```17:33:src/backend/lib/achievements.mo
  public let ACHIEVEMENT_TOKEN_START : Nat = 200_000;

  public func isAchievementToken(tokenId : Nat) : Bool {
    tokenId >= ACHIEVEMENT_TOKEN_START;
  };
```

**Grower range [100,000, 200,000):**

```16:24:src/backend/lib/grower-provenance.mo
  public let GROWER_TOKEN_START : Nat = 100_000;
  public let GROWER_TOKEN_END : Nat = 200_000;

  public func isGrowerProvenanceToken(tokenId : Nat) : Bool {
    tokenId >= GROWER_TOKEN_START and tokenId < GROWER_TOKEN_END;
  };
```

**Plant inventory pool (excludes grower + badge ranges):**

```18:24:src/backend/lib/nft-pool.mo
  func isPlantPoolToken(tokenId : Nat) : Bool {
    if (tokenId == 0) return false;
    if (tokenId >= 100_000) return false;
    if (tokenId > MAX_TOKEN) return false;
    tokenId < PH_START or tokenId >= PH_END;
  };
```

**Co-op discount logic** uses the same grower band (`src/backend/lib/coop.mo`).

**Counters initialized in `main.mo`:**

```430:430:src/backend/main.mo
  let nextAchievementTokenId = { var value : Nat = 200_000 };
```

```550:550:src/backend/main.mo
  let nextGrowerTokenId = { var value : Nat = 100_000 };
```

### Soulbound transfer rejection

Soulbound behavior is **not** a separate ICRC standard extension. Transfers are rejected in the transfer pipeline:

```375:381:src/backend/mixins/icrc7-api.mo
    if (AchievementsLib.isAchievementToken(arg.token_id)) {
      return #Err(#GenericError {
        error_code = 200_000;
        message = "soulbound: achievement badges are non-transferable";
      });
    };
```

The same guard exists in `processTransferFromOne` (ICRC-37 `transfer_from`) and `adminTransferFromPool`.

### Idiosyncrasy to avoid copying blindly

There is **no hard stop** in `mintGrowerProvenanceToken` preventing `nextGrowerTokenId` from reaching `200_000` and colliding with the badge range. The design assumes grower volume stays below 100,000 tokens. A production collection should enforce `nextGrowerTokenId < GROWER_TOKEN_END` explicitly.

---

## 8. Seeding from local data — the direct answer to "how are you using a JSON file?"

End-to-end flow for the 8,888 collection:

```
nft_collection/metadata/nft_1.json   (local, gitignored)
        │
        ▼
scripts/template-metadata.js         (substitute canister IDs, image URLs, names)
        │
        ▼
nft_collection_templated/metadata/   (gitignored output)
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
scripts/load-icrc7-metadata.mjs        scripts/upload-nft-assets.js
        │                                      │
        ▼                                      ▼
backend.loadStaticMetadata()           nft_assets canister
  → icrc7TokenMetadataRaw[id]=blob       /images/nft_N.png
                                         /metadata/nft_N.json (mirror)
```

### `load-icrc7-metadata.mjs` pattern

```177:193:scripts/load-icrc7-metadata.mjs
for (let i = 0; i < sorted.length; i += batchSize) {
  const slice = sorted.slice(i, i + batchSize);
  const entries = await Promise.all(
    slice.map(async ({ id, file }) => {
      const bytes = await readFile(join(metaDir, file));
      return [BigInt(id), bytes];
    }),
  );
  // ...
  result = await actor.loadStaticMetadata(entries);
}
```

Key properties:

- **Admin-authenticated** update calls (not public mint)
- **Idempotent** — already-loaded IDs are skipped
- **Parse-on-load** — bad JSON fails during seeding, not on first wallet query
- Default batch size: 100 entries per call

### Original JSON placeholders

From `PROJECT_CONTEXT.md` / `docs/WHITEPAPER.md`, source files contain:

| Placeholder | Replaced with |
|---|---|
| `YOUR_ICP_CANISTER_ID` | `nft_assets` canister ID |
| `YOUR_CANISTER_ID` | `backend` canister ID |
| `YOUR_PRINCIPAL_ID` | Creator/admin principal |
| `YOUR_COLLECTION_ID` | Stable collection identifier |
| Image URL `...raw.ic0.app/N.png` | `https://<nft_assets>.icp0.io/images/nft_N.png` |

**Nothing in this pipeline uploads JSON to the backend as a file.** The script reads bytes and passes them as `Blob` in a Candid tuple `(Nat, Blob)`.

---

## 9. A minimal "if I were starting fresh" checklist

For a new developer shipping a **simple** ICRC-7 collection (not IC SPICY's multi-range marketplace ledger):

1. **Read the spec** — [ICRC-7](https://github.com/dfinity/ICRC/tree/main/ICRCs/ICRC-7) and, if you need approvals/marketplaces, [ICRC-37](https://github.com/dfinity/ICRC/tree/main/ICRCs/ICRC-37).

2. **Choose implementation strategy**
   - *Fastest:* fork [PanIndustrial `icrc_nft.mo`](https://github.com/PanIndustrial-Org/icrc_nft.mo) or deploy [ORIGYN `nft`](https://github.com/ORIGYN-SA/nft) (Rust).
   - *Custom app coupling:* embed library modules in your own actor (what IC SPICY did, but heavier).

3. **Create canisters first**
   - `dfx canister create <ledger>`
   - `dfx canister create <assets>` (if images are large — **do not** put MB-scale PNGs in ledger heap)

4. **Deploy ledger wasm** — `dfx deploy <ledger>` locally; verify Candid UI shows `icrc7_name`, `icrc7_transfer`, etc.

5. **Prepare local metadata** — JSON files or an in-canister mint map; if using JSON, plan a seeding script (our pattern: Node + `@dfinity/agent` + admin identity).

6. **Template external URLs** — replace placeholder image hosts with your real `nft_assets` canister ID **before** loading metadata.

7. **Upload images** to asset canister; confirm `https://<assets_id>.icp0.io/images/...` resolves.

8. **Mint tokens** — either bulk-mint to a pool account (our `initializeNFTPool` pattern) or per-user `mint` calls if your library provides them.

9. **Load metadata into ledger state** — call your equivalent of `loadStaticMetadata` or set metadata at mint time. Confirm with `icrc7_token_metadata([1])`.

10. **Test transfer + wallet** — transfer one token, query `icrc7_owner_of`, `icrc7_balance_of`. If using a marketplace flow, wire ICRC-37 approvals.

---

## Idiosyncrasies — do not copy blindly

| IC SPICY choice | Why it's unusual | Safer default for a new collection |
|---|---|---|
| NFT ledger = same actor as shop/plants/games | Massive coupled upgrade surface | Dedicated ICRC-7 canister |
| Collection metadata as raw JSON `Blob` | Works for bulk static traits + certified blob path | Typed `Value` map at rest, or library-managed storage |
| JSON also on `nft_assets` but queries use backend map | Two copies can drift if you re-seed one side only | Single source of truth |
| Numeric ID ranges as product semantics | Requires manual guards on every code path | Separate canisters or explicit `token_category` metadata |
| Soulbound = transfer rejection only | Badges still appear in `icrc7_tokens_of`; no burn path documented | Document wallet UX expectations explicitly |
| Badge `image` points at frontend SVG | Not on `nft_assets` | Upload badge art to asset canister |
| `totalSupplyCap = 8888` but `icrc7_total_supply()` returns `icrc7Owners.size()` | Includes grower + badge mints in "total supply" count | Override or document that supply is dynamic |
| No grower counter ceiling at 200,000 | Theoretical range collision | Add `assert (tokenId < GROWER_TOKEN_END)` before mint |

---

## Quick reference — key files

| File | Purpose |
|---|---|
| `src/backend/types/icrc7.mo` | `Account`, `Value`, `TransferArgs` |
| `src/backend/lib/icrc7.mo` | `assignOwnership`, `isPepperHead`, transfer helpers |
| `src/backend/lib/icrc37.mo` | Approval map helpers |
| `src/backend/mixins/icrc7-api.mo` | Public ICRC-7 API, `loadStaticMetadata`, `initializeNFTPool`, `icrc7_token_metadata` |
| `src/backend/lib/grower-provenance.mo` | Grower mint + metadata builder |
| `src/backend/lib/achievements.mo` | Badge mint + soulbound metadata |
| `src/backend/main.mo` | State maps: `icrc7Owners`, `icrc7TokenMetadataRaw`, `badgeRegistry`, counters |
| `scripts/template-metadata.js` | Local JSON → templated JSON |
| `scripts/load-icrc7-metadata.mjs` | Templated JSON → `loadStaticMetadata` |
| `scripts/upload-nft-assets.js` | PNG + JSON → `nft_assets` |
| `PROJECT_CONTEXT.md` | Locked architecture decisions |
| `.cursor/rules/icspicy.md` | Mainnet canister IDs |

---

*Document generated from IC SPICY repository state. No on-chain changes were made to produce this file.*
