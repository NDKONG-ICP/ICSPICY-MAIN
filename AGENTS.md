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
- **typecheck:** `mops check --fix`
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

[No learnings yet]

---

## Last updated
- Initial version: written for Claude Code in Cursor workflow, post-design-session
- Owner: project lead — keep this file in sync with actual workflow as it evolves
