# Agent Workflow Rules

> Operational rules for coding agents (Claude Code, Cursor, etc.) working in this repository.
> Read `PROJECT_CONTEXT.md` first for architectural decisions; this file covers *how to work*, not *what to build*.

---

## Before writing any code

1. **Read `PROJECT_CONTEXT.md` in full.** Architectural decisions are locked there. Don't relitigate them.
2. **Identify which IC skills are relevant** to the task. Skill list and URLs are in `PROJECT_CONTEXT.md` under "Skills repository."
3. **Fetch the relevant `SKILL.md` fresh** from `https://skills.internetcomputer.org/.well-known/skills/<skill-name>/SKILL.md`. Skills update frequently — do not rely on cached or training-data versions.
4. **Outline the plan** in markdown before modifying files. List: files touched, methods added/changed, expected behavior, test approach.
5. **Wait for explicit user approval** before implementing the plan. The user reviews and confirms; only then do you modify files.

This four-step process is not optional. The user has explicitly chosen plan-then-execute as the working mode.

---

## User Preferences

- **Plan-then-execute, always.** No "let me also fix this while I'm here" scope creep. If you notice something outside scope, mention it for a future task; don't act on it.
- **Concise reasoning.** When proposing a plan, keep prose short. Markdown tables and bullet lists for structured choices.
- **Show diffs before saving.** When modifying existing code, output the proposed diff first; user approves; then apply.
- **Mainnet deploys are ALWAYS gated by explicit confirmation.** Never run `dfx deploy --network ic` without the user typing "yes, deploy to mainnet" in response to a deploy plan.

---

## Verified Commands

### Frontend (run from `src/frontend/`)
- **install:** `pnpm install --prefer-offline`
- **typecheck:** `pnpm typecheck`
- **lint fix:** `pnpm fix`
- **build:** `pnpm build`

### Backend (run from `src/backend/`)
- **install:** `mops install`
- **typecheck:** `$(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check`
- **build:** `mops build`

### Local replica (run from project root)
- **start:** `dfx start --background --clean`
- **stop:** `dfx stop`
- **deploy local:** `dfx deploy --network local`
- **bindgen:** `dfx generate <canister-name>` (replaces former `caffeine-bindgen`)
- **call query:** `dfx canister --network local call <canister> <method> '(<args>)'`
- **status:** `dfx canister --network local status <canister>`

### Mainnet (REQUIRE EXPLICIT USER CONFIRMATION)
- **deploy:** `dfx deploy --network ic` — CONFIRM CYCLES COST + CANISTER IDS FIRST
- **canister status:** `dfx canister --network ic status <canister>`
- **add controller:** `dfx canister --network ic update-settings <canister> --add-controller <principal>`
- **freezing threshold:** `dfx canister --network ic update-settings <canister> --freezing-threshold 7776000` (90 days)

---

## Deploy rules

### Local first, always
1. Implement the change
2. `mops check` — must pass
3. `dfx deploy --network local` — must succeed
4. Test the changed behavior with `dfx canister --network local call`
5. Only after green local: discuss mainnet deploy with user

### Mainnet deploy checklist
Before any `dfx deploy --network ic`:
1. State the change being deployed in plain language
2. List the canisters affected
3. State the cycles cost (use `dfx canister --network ic status` to estimate)
4. List any state migrations or breaking changes
5. Confirm the user has a backup of current canister state if upgrading
6. Get explicit user "yes, deploy to mainnet" response
7. Run the deploy
8. Verify via post-deploy queries

### Cycle hygiene
- Set freezing threshold to 90 days for production canisters
- Add a `getCycleBalance()` admin method on every canister
- Top up via Cycles Minting Canister, not raw `--with-cycles` flags

---

## Mode of operation

### Default: plan-then-execute
The user's working pattern is:
1. User issues a goal
2. Agent reads context, fetches relevant skills, drafts plan
3. User reviews plan, confirms or adjusts
4. Agent implements
5. Agent runs `mops check` + local deploy + smoke test
6. Agent shows diff/results
7. User commits via git when satisfied

### When the user asks a research question
- Answer in chat. Do not modify files.
- Cite sources (skill URLs, doc links).
- Don't proactively offer to "go ahead and implement it."

### When the user asks "do X" (action)
- Confirm scope first if X is large or ambiguous.
- Small, scoped, clear tasks: proceed with plan-then-execute.
- Large, ambiguous tasks: break into sub-tasks, get user buy-in on the breakdown.

### Long sessions
- After ~50+ exchanges in a session, context may decay. If you notice yourself making decisions inconsistent with `PROJECT_CONTEXT.md`, alert the user and re-read the file.
- Prefer fresh sessions for new phases. Start with: "Read `PROJECT_CONTEXT.md` and `AGENTS.md`. We're starting Phase N. Here's the goal..."

---

## Skill usage protocol

When a task touches an area covered by an IC skill, follow this protocol:

1. **Identify the skill.** Reference the skill table in `PROJECT_CONTEXT.md`.
2. **Fetch fresh.** `WebFetch` or equivalent against `https://skills.internetcomputer.org/.well-known/skills/<name>/SKILL.md`.
3. **Read in full.** Do not skim.
4. **Cross-reference with `PROJECT_CONTEXT.md`.** If the skill suggests something we've already decided against, defer to `PROJECT_CONTEXT.md`. (Example: skill might recommend a generic ICRC-7 pattern; we have specific anti-arbitrage requirements that override defaults.)
5. **Cite the skill** in your plan: "Per `icrc-ledger` SKILL.md (fetched <date>): ..."

If the skill isn't accessible (network failure), **stop and ask the user** rather than proceeding from training-data assumptions about the skill's contents.

---

## Code patterns to follow

These come from `PROJECT_CONTEXT.md` but bear repeating in operational form:

### Every authenticated method starts with:
```motoko
public shared({caller}) func someMethod(...) : async ... {
  requireAuthenticated(caller);  // or requireAdmin(caller)
  let _guard = acquireGuard(caller);  // if method is async + mutates state
  
  // ... method body ...
  
  // Guard auto-released by try/finally wrapper
};
```

### State changes around `await`:
```motoko
// 1. Validate inputs
// 2. Mutate state to reflect intent (e.g., mark NFT as burned)
// 3. await external call (ledger transfer, outcall)
// 4. On success: log block index, finalize
// 5. On failure: COMPENSATION — un-mutate the state from step 2
```

### Actor declaration:
```motoko
shared(msg) persistent actor class CanisterName() = Self {
  transient let owner = msg.caller;  // captured at deployment
  // ...
};
```

### Cross-canister calls:
```motoko
transient let icpLedger : ICRC1Ledger = actor("ryjl3-tyaaa-aaaaa-aaaba-cai");
// Always type-alias the actor reference
// Always handle every error variant
// Always set created_at_time for dedup
```

---

## Anti-patterns (DO NOT)

- ❌ Use `--default-persistent-actors` flag or `caffeineai-*` deps (legacy Caffeine, removed in Phase 0.5)
- ❌ Hardcode admin principals in source code (use `shared(msg)` capture)
- ❌ Hardcode ledger fees (always look up via `icrc1_fee()`)
- ❌ Store images, large blobs, or unbounded data in backend canister heap
- ❌ Mutate state after `await` without reentrancy lock
- ❌ Trust amounts/discounts/prices from frontend (always recompute server-side)
- ❌ `Debug.print` user content (breaks zero-log policy on chatbot)
- ❌ Deploy to mainnet without local testing
- ❌ Auto-commit secrets (Stripe keys, principal IDs) to the repo (use admin-set state methods)
- ❌ Make scope-creep "improvements" without user approval
- ❌ Skip `mops check` before reporting "done"

---

## Learnings

> Append to this section as you discover project-specific gotchas during development.

### Phase 0.5 — Caffeine → standard moc migration (2025-05)

- **`--implicit-package=core` was masking dozens of missing imports.** Every lib/*.mo file that used `Map<NatKey>`, dot-methods (`.toText()`, `.concat()`, `.filter()`, `.toArray()`), or `Principal.isAnonymous` needed explicit imports added. Pattern: `Nat` for Nat-keyed maps and Nat methods; `Text` for Text-keyed maps and string methods; `Principal` for Principal-keyed maps; `Array` for `.concat()`/`.map()`/`.filter()`/`.sliceToArray()` on arrays; `Iter` for `.filter()`/`.toArray()` on iterators/lists.
- **M0236 is a hard error in standard moc.** `Array.concat(a, b)` triggers it; use dot notation `a.concat(b)` instead (but still import `Array` so the method resolves).
- **`--actor-idl` path is relative to CWD.** When running moc from `src/backend/`, use `--actor-idl system-idl` — not `--actor-idl src/backend/system-idl`.
- **`mops check --fix` does not exist in standard mops.** The correct typecheck command is `$(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check` run from `src/backend/`.
- **`is_replicated = null` (replicated) for all HTTP outcalls that mutate state.** Non-replicated (`?false`) must never be used for state-mutating calls.
- **Project root path has a space (`IC SPICY MAIN`).** `dfx deploy` via `moc-wrapper` emits spurious path warnings but still succeeds. Not a real error — canister installs cleanly.

### Phase 1 — Security foundations (2025-05)

- **Actor class signature change requires `--mode reinstall` locally.** Switching from `persistent actor ICSpicy {` to `shared(msg) persistent actor class ICSpicy() = Self {` is upgrade-incompatible. Use `dfx deploy --network local --mode reinstall backend --yes` for local. On mainnet this requires a canister wipe — schedule only during a planned migration window.
- **`msg.caller` via `shared(msg)` captures the DEPLOYING identity.** For local deploys with `dfx deploy`, that is the current `dfx identity`. Verify with `dfx identity get-principal` before deploying to confirm admin #1 is correct.
- **Two-admin minimum must be verified locally before phase is considered complete.** Call `getAdmins()` and assert length ≥ 2. Single-admin is a single point of failure regardless of environment.
- **`hasPermission(state, caller, #user)` was the auth check for "authenticated user" actions.** Removed entirely in Phase 1 — replaced by `requireAuthenticated(caller)`. The new function does NOT accept `#guest` or `#admin` role — it only rejects anonymous.
- **`refreshTokenPrices` is admin-only — causes stale prices during checkout.** TODO Phase 4: convert to timer-driven refresh or rate-limited public call. Admin-only is a temporary convenience guard.
- **`deleteTray` and `updateTrayName` had no ownership check in lib/plants.mo.** Any authenticated user could delete/rename another user's tray. Fixed in Phase 1 E.0 by adding the `caller, trayOwners, adminCheck` pattern matching all other tray mutation functions.
- **QR claim arming gate (fixed 2026-09).** `redeemClaim` requires the token to be *armed*: staff arm printed QR tags at the point of sale via `armClaimToken` (default 72h window, admin-only, audit-logged); paid-order pickup tokens are auto-armed at payment settlement with no expiry. Arming state lives in the `nftClaimArms` side map (`Text → ClaimArm`) — a side map because `NftClaimEntry` has a `var` field and is therefore type-invariant in stable memory. `disarmClaimToken` and `revokeClaimTokenAdmin` clear the arm record. Admin UI: Armed badge + Arm/Disarm in the QR Labels tab.
- **DAO subsystem is a Phase 8 deletion target.** `voteOnProposal`, `createDAOProposal`, `listDAOProposals`, `getDAOProposal`, `hasDAOAccess` — the real DAO lives on OHSHII (per PROJECT_CONTEXT.md). This custom on-canister DAO is dead code. Remove in Phase 8 when OHSHII integration is built.
- **Simulated wallet is a Phase 4 deletion target.** `mixins/wallet-api.mo` and `lib/wallet.mo` simulate ICP/ckBTC/ckETH balances. Replaced by real ICRC-2 ledger integration in Phase 4. Guards are applied in Phase 1 for correctness, but the entire subsystem will be deleted.
- **`_immutableObjectStorageCreateCertificate` was a Caffeine blob-tree cert shim — deleted in Phase 1 G.** The method had no auth check and allowed any caller to overwrite the canister's single `CertifiedData` slot via caller-supplied hash. Investigation found zero app-code callers (all references were generated/declaration/mock files). Both `_immutableObjectStorageCreateCertificate` and `_immutableObjectStorageGetCertificate` deleted along with `import CertifiedData`. Regenerate bindings with `dfx generate backend` after deletion.
- **Auth-check style is normalized to `requireAuthenticated` (done 2026-09).** `offers-api.mo`'s inline `isAnonymous()` traps were replaced with `AccessControl.requireAuthenticated`; `wallet-api.mo` was deleted in Phase 4.
- **Read-only user-data methods are `query` (done 2026-09).** `getMyWeatherRecords`, `listArtworkLayers`, `listMyPlants`, `getMySchedules` were converted from `shared` to `query` — no consensus cost or update-call latency for pure reads.

### Phase 1 — Stage F/G: inspect_message

- **inspect_message shape: one ALLOW, everything else BLOCK.** Exactly one update method allows anonymous ingress: `_initializeAccessControl` (frontend calls it on every actor init including unauthenticated sessions). All 103 other update methods block anonymous. The implementation is a simple two-arm switch — explicit ALLOW for `#_initializeAccessControl`, `not caller.isAnonymous()` default for all others.
- **Variant tag for `_initializeAccessControl` preserves the leading underscore.** If Motoko's inspect_message codegen has issues with leading-underscore variant names, it will surface at typecheck time.
- **All plants-api mutation methods now carry mixin-level `requireAuthenticated` (done 2026-09).** `updateCellData`, `toggleCooked`, `transplantCell`, `addPlantPhoto`, `removePlantPhoto` previously relied on lib-level owner-or-admin checks plus inspect_message; the explicit mixin guard was added for defense in depth and consistency.

## Phase 4 wiring requirements (set up in Phase 1, deferred for completion)

### CallerGuard reentrancy protection

Phase 1 established the CallerGuard infrastructure (`lib/caller-guard.mo`)
and declared the state variable (`main.mo` `_callerGuards`). The wiring to
mixins was deferred because no settlement method currently has an async
`await` — Motoko's single-threaded model makes the guard a no-op on synchronous
code, so wiring now would add complexity without protection.

Phase 4 introduces async ICRC-2 `transferFrom` calls in:

- `mixins/marketplace-api.mo`: `placeOrder` (when crypto payment path is added)
- `mixins/offers-api.mo`: `acceptOffer` (when offer settlement triggers transfer)
- Any new payment confirmation methods (`confirmStripePayment`, `purchaseWithSpicy`)

When wiring in Phase 4:

1. Rename `_callerGuards` → `callerGuards` in `main.mo` (drop the unused-marker prefix)
2. Add `callerGuards : CallerGuard.GuardMap` to the relevant mixin's parameter signature
3. Update `main.mo`'s mixin `include` to pass `callerGuards`
4. Wrap each async-settlement method body:

```motoko
AccessControl.requireAuthenticated(caller);
switch (CallerGuard.acquire(callerGuards, caller)) {
  case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
  case (#ok) {};
};
try {
  // existing method body, INCLUDING the new async transferFrom await
} finally {
  CallerGuard.release(callerGuards, caller);
};
```

**Critical:** the `try/finally` is non-negotiable. If `release` doesn't run on every
code path, the lock leaks and the caller is permanently locked out.

Smoke test for Phase 4 to verify guard works:

1. Legit single call succeeds
2. Two overlapping calls from same caller — second is rejected with "Request already in flight"
3. After first call completes, third call from same caller succeeds (lock was released)

---

### Phase 2 — Asset infrastructure (2026-05)

- **`"build": []` in dfx.json does NOT suppress dfx 0.29.1's `npm run build` for asset canisters.** Symptom: `dfx deploy nft_assets` fails with `The post-build step failed… "npm" "run" "build"… sh: pnpm: command not found`. Diagnosis: dfx 0.29.1 always runs the project-root `npm run build` as the "post-build" step for `type: assets` canisters, even when `"build": []` is set. The root `package.json` `build` script calls `pnpm`, which is installed only as a corepack shim and is not in the subprocess PATH. **Workaround — use `dfx canister install` directly instead of `dfx deploy` for asset canisters:**

  ```bash
  dfx canister create --network <net> nft_assets           # registers canister, gets ID
  dfx build --network <net> nft_assets                      # builds wasm into .dfx/<net>/canisters/nft_assets/
  dfx canister install --network <net> nft_assets \
    --wasm ".dfx/<net>/canisters/nft_assets/nft_assets.wasm.gz" \
    --argument '(null)'                                      # installs wasm, skips npm run build
  # Then use upload-nft-assets.js to push actual files

  ```

  If `dfx build` also triggers the npm run build failure, fetch the wasm from the already-built local path (`.dfx/local/canisters/nft_assets/nft_assets.wasm.gz`) and install it with the explicit `--wasm` flag. Verified on dfx 0.29.1; may be fixed in later versions.
- **Asset canister `"unmatched configuration"` warnings are expected on first install.** `.ic-assets.json5` rules for `images/**` and `metadata/**` emit WARN at install time because those directories don't exist in the source folder yet. Warnings are harmless — rules apply correctly once the upload script populates the paths.
- **`@dfinity/identity` v3.4.3 has a deprecated stub `Secp256k1KeyIdentity` with no `fromPem`.** Use `@dfinity/identity-secp256k1` (separate package, same version `3.4.3`) for Secp256k1 PEM loading. `dfx` identities created with default settings use `EC PRIVATE KEY` (Secp256k1), not Ed25519. Check with `head -1 ~/.config/dfx/identity/<name>/identity.pem`.
- **`AssetManager.list()` returns keys with a leading slash** (e.g. `/images/nft_1.png`). The resume skip-set must use the same format — compare with leading slash on both sides.
- **`batch.store()` for `Uint8Array` requires `fileName` in config.** Omitting it causes a type error at runtime. `path` is the directory portion (e.g. `/images`); `fileName` is the filename (e.g. `nft_1.png`). The resulting asset key is `{path}/{fileName}`.
- **Metadata image URL path uses bare number in originals (`/1.png`), not the `nft_` prefix.** Template script replaces the full URL as a unit using the NFT number extracted from the filename, before the bare `YOUR_ICP_CANISTER_ID` substring replacement runs. Order matters — doing it the other way breaks the URL replacement.
- **`nft_collection_templated/` must be regenerated for mainnet with real canister IDs.** The local smoke-test run writes IDs for local replica canisters. Delete and re-run `template-metadata.js` with mainnet IDs before the mainnet upload. The templated output directory is gitignored.
- **Asset canister `dfx deploy` auto-build also fails on mainnet** with `pnpm: command not found` — same root cause as local (config-only source folder, no `package.json` of its own), but the error only surfaces when attempting `dfx deploy --network ic`. Workaround is the same manual install path documented above, using the mainnet network flag:

  ```bash
  dfx canister create --network ic nft_assets
  dfx build --network ic nft_assets
  dfx canister install --network ic nft_assets \
    --wasm ".dfx/ic/canisters/nft_assets/assetstorage.wasm.gz" \
    --argument '(null)'
  ```

- **Bulk upload cycle sizing: provision 9–10T before starting, not 6T.** The initial 6T allocation was sized for steady-state storage (~14 months runway) but bulk-upload-time consumption hit the 90-day freezing threshold buffer at ~96% completion. Upload exited with an "out of cycles" error (misleading — canister had cycles, but not enough to maintain the freezing-threshold buffer above the minimum). Fixed by topping up an additional 3T mid-upload. For future bulk uploads of similar volume (1.3GB / ~17K assets), top up to 9–10T before starting to avoid mid-run interruption.
- **Identity migration `--storage-mode plaintext → keyring` is safe mid-deploy.** `ic_deploy` identity successfully migrated after Phase 2; principal was preserved (`gqkko-43bbx-...`), wallet re-associated via `dfx identity --network ic set-wallet daf6l-...`. Per-keychain prompts now appear during `dfx` operations — allow them. Plaintext PEM should be securely deleted post-migration.

- **`set_asset_properties` does NOT update the certified Merkle tree.** Calling it after upload to set `headers` (e.g. `Cache-Control`) produces a 503 "Invalid tree root hash" because the boundary node verifies response headers against the tree built at `commit_batch` time. **Fix:** pass headers inside `batch.store({ headers: [...] })` so they are included in `CreateAsset` during `commit_batch`. Only use `set_asset_properties` post-upload for `is_aliased` (routing metadata — does not affect certified response hash).
- **`AssetManager.store()` with `path = '/'` produces `//filename` keys (double slash).** Root-level files (e.g. `index.html`, `.ic-assets.json5`) must use `path = ''` (empty string), not `'/'`. With `path = ''`, the key becomes `/filename` (correct). With `path = '/'`, the key becomes `//filename` (wrong — causes 503 on the boundary node because `get('/')` can't resolve to `//index.html`). Fix in upload scripts: `parts.length > 0 ? '/' + parts.join('/') : ''`.

---

### Phase 4 — Mainnet upgrade: stable-memory migration (2026-05-16)

- **Mutable record fields (`var`) are type-invariant in stable memory.** Adding even a `?Text` field with `var` breaks the upgrade. Store per-record mutable state in a side map (`Map.Map<Id, T>`) keyed by record ID, not inside the record itself.
- **Variant types in `var` fields are also invariant.** Adding `#Paid` or `#AwaitingPayment` to `OrderStatus` blocked the upgrade because `var status : OrderStatus` is invariant. Phase 4 fix: track payment confirmation via `icpaySessionsConsumed` map + audit log. Never add variant cases to a variant used in a `var` field without an explicit migration.
- **Dropping stable variables requires an explicit migration.** Deleting `lib/wallet.mo` without keeping ghost `wallets`/`txLog` declarations in `main.mo` triggered M0169. Always convert deleted-mixin state to ghost declarations (`// Ghost — stable compat`) and remove them later via explicit migration.
- **`wasm_memory_persistence: keep` must be in `dfx.json` for persistent actor class.** Without it, the replica rejects upgrades with IC0504. `dfx canister install` ignores this key — only `dfx deploy` reads it. Use `dfx deploy` for all backend upgrades.
- **Two interactive prompts require two `yes` answers.** Upgraded backends with both Candid and stable-interface warnings show two separate prompts. Workaround: `TERM=xterm-256color dfx deploy --network ic backend <<< $'yes\nyes\n'`
- **Frontend canister ID: `7rukv-hqaaa-aaaao-ba6ma-cai`.** Deployed 2026-05-16. `ii_derivation_origin` set to `https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io`. ICPay publishable key embedded in build.

### Phase 8 prep — spicy_policy_canister (2026-09)

- **`spicy_policy_canister` (`xug4g-6aaaa-aaaao-bbjwq-cai`) is the only SONS CustomCall target.** Never target `backend` with governance proposals — SONS pins the module hash at proposal creation and any upgrade kills open proposals. UPGRADE FREEZE: before upgrading `spicy_policy_canister`, check SONS for open CustomCall proposals targeting it.
- **Canister creation on our subnet costs 0.5T cycles** (not 0.1T). `--with-cycles 550000000000` left only ~49B after the creation fee — install then failed with IC0207 needing ~277B more. Budget ≥ 1.3T when creating a new mainnet canister (0.5T fee + ~0.3T install/reserve + runway).
- **`adminDepositCycles(target, amount)` on backend** (admin-only, 2T per-call cap, audit-logged) transfers cycles to fleet canisters via the management canister's `deposit_cycles`. Use this instead of buying ICP when the backend has surplus. Syntax note: `await (with cycles = amount) ic.deposit_cycles({ canister_id })` works on moc 1.3.
- **Cycles wallet (`daf6l`) is low (~0.16T)** after the policy-canister creation. Top up before the next canister creation.

## Last updated
- Initial version: written for Claude Code in Cursor workflow, post-design-session
- Owner: project lead — keep this file in sync with actual workflow as it evolves
