# Task 05 — Fix treasury `executeTransfer` trap-after-compensation (F-05, High)

## Goal
Ensure a failed treasury transfer returns the proposal to `#pending` instead of sticking in
`#executing` forever, and add a recovery path for already-wedged proposals.

## Files to read first
- `src/treasury_canister/main.mo` (`executeTransfer` :317-379; `ProposalStatus` :171;
  `statusOf`, `proposalStatus`)
- Fetch `canister-security` SKILL.md "state changes around await" / trap-rollback section.

## Change description
The bug: `proposalStatus.add(id, #pending)` at `:359` and `:375` runs **after** the ledger
`await`, so the subsequent `Runtime.trap` rolls it back; the `#executing` write at `:333`
(committed at the first await) survives.

Fix — do not trap after mutating:
1. Change `executeTransfer` to return a `Result`/variant on ledger failure instead of
   trapping, e.g. `: async { #ok : Nat; #failed : Text }`. On `#Err`/`catch`, set
   `proposalStatus.add(id, #pending)` and **return** the failure value (no trap) so the
   `#pending` write commits.
2. If the method signature must stay `: async Nat` for callers, instead set status to
   `#pending` and return normally with a sentinel is not acceptable — prefer the variant
   return, or move compensation to a path that does not trap. Document the chosen shape.
3. Add `resetStuckProposal(id)` (admin, audit-logged): if `statusOf(id) == #executing` and
   no `#executed` block was recorded, reset to `#pending`. This recovers proposals already
   wedged on mainnet.
4. Keep `#executing` as the pre-await reentrancy marker; only the failure path changes.

## Acceptance criteria
- With a ledger stub that returns `#Err`, after `executeTransfer` the proposal is `#pending`
  (not `#executing`) and re-execution is possible.
- `resetStuckProposal` moves an `#executing` proposal (no block recorded) back to `#pending`.
- A successful transfer still records `#executed(block)` and appends the burn log when applicable.

## Tests to add
- `scripts/audit/treasury-fail.sh` (local): deploy a mock ICRC-1 ledger that returns
  `#Err(#TooOld)`; propose + 2 approvals + elapse timelock (use a short local timelock build
  flag or admin time shim if available, else document manual steps); execute; assert status
  is `#pending`.

## Local verification
```bash
cd src/treasury_canister && $(mops toolchain bin moc) $(mops sources) main.mo --check
cd ../.. && dfx deploy --network local treasury_canister && bash scripts/audit/treasury-fail.sh
```

## Mainnet deploy notes (human only)
Treasury upgrade. **UPGRADE FREEZE check first** (AGENTS.md: SONS CustomCall open proposals
targeting policy canister — treasury itself is not a CustomCall target, but verify no in-flight
proposals depend on treasury behavior). No stable migration if `ProposalStatus` is unchanged
(it is). If the return type changes, regenerate declarations and update any caller.

## Risks & rollback
- Risk: changing the return type is a Candid change → two interactive prompts on upgrade
  (see AGENTS.md workaround). Keep `ProposalStatus` variant identical to avoid M0170.
- Rollback: revert; `resetStuckProposal` can still be kept as a safety valve.
