# Task 06 — Timelock treasury admin rotation + economic setters (F-06, High)

## Goal
Remove the single-admin bypass of the two-admin+timelock control: a lone admin must not be
able to add a second controlled principal or change economic config instantly.

## Files to read first
- `src/treasury_canister/main.mo` (`addAdmin` :538; `removeAdmin` :546; `setSpicyLedger`
  :510; `setIcpswapPool` :517; `setPolicyCanister` :524; `setIcpLedger` :531; the transfer
  proposal/approval/timelock machinery :250-379)

## Change description
Apply the existing proposal pattern (two distinct live admins + 7-day timelock) to admin
rotation and economic config, not just transfers:
1. Introduce a generic `ConfigProposal` variant covering: `#addAdmin p`, `#removeAdmin p`,
   `#setSpicyLedger t`, `#setIcpswapPool t`, `#setPolicyCanister t`, `#setIcpLedger t`.
   Store proposals with the same `proposedAt`/`executableAt`/approvals maps used for
   transfers (reuse `approvalsOf`, `liveApprovalCount`, `TIMELOCK_NS`).
2. `proposeConfig(change)` (admin) counts as proposer approval; `approveConfig(id)`;
   `executeConfig(id)` requires `liveApprovalCount >= 2` and `Time.now() >= executableAt`,
   then applies the change and audit-logs it.
3. Delete the direct single-admin `addAdmin`/setters (or keep `removeAdmin` of a **known
   compromised** key as an emergency single-admin action guarded by the two-admin minimum
   size check already at :549 — decide and document).
4. Keep anonymous-reject `inspect` (:563) intact.

Note: `removeAdmin`'s existing two-admin-minimum size guard (`:549`) stays; adding a
timelock to rotation means a compromised admin cannot instantly mint a co-conspirator.

## Acceptance criteria
- `addAdmin`/economic setters cannot take effect without a second distinct admin approval
  and the 7-day timelock.
- A single admin acting alone cannot satisfy the transfer two-admin quorum by self-adding.
- Emergency `removeAdmin` of a compromised key still works per the documented policy.

## Tests to add
- `scripts/audit/treasury-config-timelock.sh` (local): assert `executeConfig` traps before
  timelock and before a second approval; succeeds after both.

## Local verification
```bash
cd src/treasury_canister && $(mops toolchain bin moc) $(mops sources) main.mo --check
cd ../.. && dfx deploy --network local treasury_canister && bash scripts/audit/treasury-config-timelock.sh
```

## Mainnet deploy notes (human only)
Treasury upgrade; new stable state (proposal maps) is additive. Regenerate declarations.
Confirm current admin set and that two keys are available to drive the new flow before
deploying (otherwise you can lock yourself out of config changes).

## Risks & rollback
- Risk: operational friction — legitimate config changes now take 7 days. Provide a clearly
  documented emergency path for key compromise only.
- Rollback: revert; existing admins/config unchanged.
