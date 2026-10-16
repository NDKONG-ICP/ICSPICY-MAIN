# Task 11 — Forbid admin seizure of externally-owned NFTs (F-11, High)

## Goal
`adminReturnToPool` (and Hedera relock / airdrop) must not move an NFT that is currently
owned by a non-nursery principal.

## Files to read first
- `src/backend/mixins/icrc7-api.mo` (`adminReturnToPool` :956-987; `adminRelockHederaTwin`
  :905; `adminSyncHederaTwin` :867; `adminBatchAirdrop` :989)
- `src/backend/lib/icrc7.mo` (`assignOwnership`, `accountsEqual`)

## Change description
1. In `adminReturnToPool`, before transferring, assert the current owner is the canister
   (pool or a canister subaccount) or an admin principal. If the token is owned by any other
   principal, return `#Err(#Unauthorized)` with a message like "cannot reclaim an
   externally-owned NFT". Do not allow unconditional seizure.
2. Apply the same precondition to `adminRelockHederaTwin`/`adminSyncHederaTwin` (only lock
   tokens held by the nursery, never a user's).
3. If the business genuinely needs to reclaim a user-held NFT (e.g. chargeback/fraud), route
   it through a two-admin + timelock proposal (reuse the treasury pattern or add a backend
   equivalent), never a single-admin instant move.
4. Keep `adminBatchAirdrop` restricted to pool-owned tokens (it already checks
   `accountsEqual(currentOwner, poolAccount)` at :1036 — confirm and keep).

## Acceptance criteria
- `adminReturnToPool(tokenId)` on a token owned by a non-admin user returns `#Err`
  (no ownership change).
- `adminReturnToPool` on a pool/canister-held token still works.
- Any path that can move a user-held NFT requires two admins + timelock (or is removed).

## Tests to add
- `scripts/audit/admin-nft-move.sh` (local): mint + transfer a token to a user principal;
  call `adminReturnToPool` as admin; assert the token still belongs to the user.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx deploy --network local backend && bash scripts/audit/admin-nft-move.sh
```

## Mainnet deploy notes (human only)
Backend upgrade, no stable migration. Confirm no legitimate ops flow currently relies on
reclaiming user-held NFTs before tightening.

## Risks & rollback
- Risk: an existing admin workflow may expect to pull back mis-sent NFTs → provide the
  two-admin+timelock path as the sanctioned replacement.
- Rollback: revert.
