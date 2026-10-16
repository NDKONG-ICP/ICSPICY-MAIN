# Task 12 — Minimize backend admins and gate token withdrawals (F-12, High)

## Goal
Reduce single-key blast radius: the backend (which holds all funds + 8,888 NFTs) should not
have 5 full-power admins, and `adminWithdrawTokens` should not be a single-admin, no-timelock
drain.

## Files to read first
- `src/backend/main.mo` (admin API: `addAdmin`/`removeAdmin`/`getAdmins`; `accessControlState`)
- `src/backend/lib/access-control.mo`
- `src/backend/mixins/payment-api.mo` (`adminWithdrawTokens` :654-735; rate limit :660)
- Live admin set (from AUDIT.md): deployer, OHSHII, OISY, + two others.

## Change description
Split into two deployable steps:

**Step A — admin-set review (operational, owner decision):**
1. Decide which principals truly need backend admin. Third-party governance (OHSHII) belongs
   on `spicy_policy_canister`; wallet-display testing (OISY) does not need fund/NFT admin.
2. Via the existing `removeAdmin` (owner-run on mainnet), reduce to the operator's keys
   (ideally 2 operator-controlled keys for rotation, not 5). This is a config change, not a
   code change — document the target set and the commands in LIVE-CHECKS.md.

**Step B — gate withdrawals (code):**
1. Route `adminWithdrawTokens` through a two-admin + timelock proposal (reuse the treasury
   proposal pattern, or move custody so the backend forwards receipts to `treasury_canister`
   and withdrawals happen only there).
2. Minimum: require a second distinct admin approval for any withdrawal above a small
   threshold, and audit-log both approvals. Keep the 3/hr rate limit.

## Acceptance criteria
- `getAdmins()` returns only operator-controlled keys after Step A.
- A single admin cannot withdraw more than the threshold without a second approval + delay.
- Existing legitimate low-value ops still function (or clearly require the new flow).

## Tests to add
- `scripts/audit/withdraw-gate.sh` (local): assert a single-admin large withdrawal is
  rejected/pending; assert two approvals + elapsed timelock executes.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx deploy --network local backend && bash scripts/audit/withdraw-gate.sh
```

## Mainnet deploy notes (human only)
Step A is owner-run `removeAdmin` calls (read the current set first; keep ≥2 operator keys).
Step B is a backend upgrade with new proposal state (additive). **Do not remove the
operator's own key.** Verify `getAdmins()` after each change.

## Risks & rollback
- Risk: removing an admin that some ops script depends on → inventory admin-gated automations
  first.
- Rollback (A): `addAdmin` to restore; (B) revert the upgrade.
