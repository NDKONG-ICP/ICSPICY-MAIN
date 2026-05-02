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
- **QR claim attack surface (Phase 3 design note).** `redeemClaim` correctly binds to `caller`, but anyone who physically scans a QR code can redeem the claim if they are authenticated. No secret or hold-time check prevents early redemption. Phase 3 NFT design should add either: (a) hold-time lock on claim tokens, or (b) admin-cosign requirement before redemption.
- **DAO subsystem is a Phase 8 deletion target.** `voteOnProposal`, `createDAOProposal`, `listDAOProposals`, `getDAOProposal`, `hasDAOAccess` — the real DAO lives on OHSHII (per PROJECT_CONTEXT.md). This custom on-canister DAO is dead code. Remove in Phase 8 when OHSHII integration is built.
- **Simulated wallet is a Phase 4 deletion target.** `mixins/wallet-api.mo` and `lib/wallet.mo` simulate ICP/ckBTC/ckETH balances. Replaced by real ICRC-2 ledger integration in Phase 4. Guards are applied in Phase 1 for correctness, but the entire subsystem will be deleted.
- **`_immutableObjectStorageCreateCertificate` was a Caffeine blob-tree cert shim — deleted in Phase 1 G.** The method had no auth check and allowed any caller to overwrite the canister's single `CertifiedData` slot via caller-supplied hash. Investigation found zero app-code callers (all references were generated/declaration/mock files). Both `_immutableObjectStorageCreateCertificate` and `_immutableObjectStorageGetCertificate` deleted along with `import CertifiedData`. Regenerate bindings with `dfx generate backend` after deletion.
- **`offers-api.mo` and `wallet-api.mo` use inline `isAnonymous()` instead of `requireAuthenticated`.** Functionally identical for the anonymous check, but inconsistent with the rest of the codebase. Normalize to `requireAuthenticated` in Phase 1 cleanup or Phase 4 (wallet goes away entirely in Phase 4 anyway).
- **Several `shared` methods should be `query` — no state mutation, but they go through consensus.** `getMyWeatherRecords`, `listArtworkLayers`, `listMyPlants`, `getMySchedules` all return read-only user data. Converting to `query` eliminates consensus cost and latency. Likely a Caffeine default from the migration. Fix in Phase 4+ optimization pass.

### Phase 1 — Stage F/G: inspect_message

- **inspect_message shape: one ALLOW, everything else BLOCK.** Exactly one update method allows anonymous ingress: `_initializeAccessControl` (frontend calls it on every actor init including unauthenticated sessions). All 103 other update methods block anonymous. The implementation is a simple two-arm switch — explicit ALLOW for `#_initializeAccessControl`, `not caller.isAnonymous()` default for all others.
- **Variant tag for `_initializeAccessControl` preserves the leading underscore.** If Motoko's inspect_message codegen has issues with leading-underscore variant names, it will surface at typecheck time.
- **Five `plants-api.mo` methods lack mixin-level `requireAuthenticated` — guarded only in lib.** `updateCellData`, `toggleCooked`, `transplantCell`, `addPlantPhoto`, `removePlantPhoto` pass `caller` into lib functions that check owner-or-admin. Anonymous always fails in the lib, but inspect_message blocks them at ingress before any lib code runs.

---

## Last updated
- Initial version: written for Claude Code in Cursor workflow, post-design-session
- Owner: project lead — keep this file in sync with actual workflow as it evolves
