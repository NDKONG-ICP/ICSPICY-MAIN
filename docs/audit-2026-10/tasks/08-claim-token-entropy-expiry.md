# Task 08 — Unguessable claim tokens, bounded expiry, safe redeem authz (F-08, High)

## Goal
Make QR claim tokens cryptographically random, expire auto-armed pickup tokens, and stop
`redeemClaim` from moving an NFT that already belongs to a non-nursery holder.

## Files to read first
- `src/backend/lib/nft-claim.mo` (`makeClaimToken` :30; `registerClaimToken` :36)
- `src/backend/mixins/claim-api.mo` (`redeemClaim` :167; `holderOk` :201-218; auto-arm
  callers set expiry null)
- `src/backend/mixins/payment-api.mo` (auto-arm :441, :604)
- `src/backend/types/claim.mo` (`ClaimArm`)
- Fetch `motoko` SKILL.md for `Random`/`raw_rand` usage patterns.

## Change description
1. **Entropy.** Make `registerClaimToken` async (or seed it from a caller-provided
   `raw_rand` blob fetched once per settlement batch) and build the token from ≥128 bits of
   `Random.blob()`:
   - Add `func makeClaimTokenRandom(entropy : Blob) : Text` producing `"spcy_" #` hex of
     ≥16 random bytes. Replace all `makeClaimToken(tokenId, now, count)` call sites.
   - Settlement already runs inside an update; fetch `await Random.blob()` once and derive
     per-line tokens (e.g. HMAC/hash of blob+index) to avoid N outcalls.
2. **Expiry.** In the two auto-arm sites (`payment-api.mo:441,604`) set
   `expiresAt = ?(Time.now() + PICKUP_ARM_WINDOW_NS)` (e.g. 30 days) instead of `null`.
   Add an admin `rearmPickupToken` for legitimately late pickups.
3. **Redeem authz.** In `redeemClaim` `holderOk` (`:201-218`), treat only the
   canister-pool and admin holders as transferable sources. Remove the
   "`plantOwners[plantId] == currentOwner.owner`" branch, or restrict it to the case where
   the current owner is the **nursery** (admin/canister), not an arbitrary buyer. Once an NFT
   is owned by a non-nursery principal, a claim token must not move it.

## Acceptance criteria
- Two tokens generated for the same tokenId at the same time differ and are not derivable
  from tokenId/time/count.
- An auto-armed pickup token past its window is rejected by `redeemClaim`.
- `redeemClaim` cannot transfer an NFT currently owned by a non-nursery buyer, even with a
  valid armed token.

## Tests to add
- `scripts/audit/claim-token.sh` (local): generate many tokens, assert uniqueness and no
  collision with the old deterministic formula; arm with past expiry → redeem rejected;
  set NFT owner to a non-admin principal → redeem rejected.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx deploy --network local backend && bash scripts/audit/claim-token.sh
```

## Mainnet deploy notes (human only)
Backend upgrade. `ClaimArm.expiresAt` is already `?Int` — no type change. Existing
never-expiring armed tokens on mainnet stay valid; consider an admin sweep to set expiries.
Previously-issued deterministic tokens remain redeemable until used — acceptable, but flag
high-value unredeemed ones for re-issue.

## Risks & rollback
- Risk: making `registerClaimToken` async changes call signatures in settlement — ensure all
  callers `await`. Keep the random derivation single-outcall per batch to avoid cycle cost.
- Rollback: revert; expiry change is independently safe.
