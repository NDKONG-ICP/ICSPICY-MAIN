# Task 20 — Add an ICRC-3 transaction log for NFT ownership changes (F-11 companion, Medium)

## Goal
Make every NFT mint/transfer/burn/admin-move independently queryable as an ICRC-3 block, so
holders and auditors can verify and detect ownership changes.

## Files to read first
- `src/backend/lib/icrc7.mo` (`assignOwnership` — the single mutation entry point per
  PROJECT_CONTEXT ICRC-7 rules)
- `src/backend/mixins/icrc7-api.mo` (`nextBlockIndex` usage; transfer/airdrop/return methods)
- `src/backend/lib/icrc37.mo`
- ICRC-3 spec (hashes pinned in PROJECT_CONTEXT "ICRC standards version pins" — read that
  section; ICRC-3 is not yet pinned there, add it).

## Change description
1. Define an ICRC-3 block type (hash-linked: `phash`, `btype`, `ts`, transaction fields) in a
   new `types/icrc3.mo`. Store blocks in a stable structure (append-only; avoid `var` fields
   in stable records per PROJECT_CONTEXT Pattern 1 — use immutable records keyed by index).
2. Emit one block from inside `assignOwnership` (the sole mutation point) for every ownership
   change, tagging the `btype` (`7mint`, `7xfer`, `7burn`, `37xfer`) and from/to accounts.
   This guarantees no mutation escapes the log.
3. Implement `icrc3_get_blocks`, `icrc3_get_tip_certificate`, and
   `icrc3_supported_block_types` queries per spec.
4. Pin the ICRC-3 spec commit hash in PROJECT_CONTEXT "ICRC standards version pins".
5. Consider archiving/pagination for growth (blocks are unbounded) — at minimum paginate
   `icrc3_get_blocks`.

## Acceptance criteria
- Every mint/transfer/burn/admin-move produces exactly one ICRC-3 block.
- `icrc3_get_blocks(start, length)` returns the hash-linked chain; tip certificate verifies.
- An admin NFT move (F-11) is visible in the log.

## Tests to add
- Motoko/replica test: perform mint → transfer → admin move, assert block count and
  `phash` linkage; assert `assignOwnership` never mutates without emitting a block.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check && mops test
cd ../.. && dfx deploy --network local backend
```

## Mainnet deploy notes (human only)
Backend upgrade with new stable append-only state (additive; no migration of existing types).
Historical pre-log transfers won't have blocks — document the log's genesis point. Watch
memory growth; plan archiving before scale.

## Risks & rollback
- Risk: unbounded block growth → paginate and plan an archive canister.
- Rollback: revert; log is additive and safe to drop via migration if needed.
