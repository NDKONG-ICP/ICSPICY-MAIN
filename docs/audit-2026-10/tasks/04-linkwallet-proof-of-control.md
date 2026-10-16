# Task 04 — Require proof of control in `linkWallet` (F-04, High)

## Goal
Prevent a user from linking a wallet principal they do not control (to steal its discount /
DAO / co-op weight) and prevent the grief-lock where an attacker claims a victim's wallet.

## Files to read first
- `src/backend/main.mo` (`linkWallet` :1494; `unlinkWallet` :1532; `walletToIdentity`,
  `linkedWallets` state :604)
- Consumers of linked wallets: `lib/nft-discount.mo` (`callerDiscountFromBalances`),
  `lib/marketplace-order.mo:36`, `DAOAPI`, co-op mixin
- Wallet signer docs: fetch `wallet-integration` SKILL.md (ICRC-25/49) fresh.

## Change description
Add a challenge/response so the wallet proves control before linking:
1. New state: `walletLinkChallenges : Map.Map<Principal, { nonce : Text; expiresAt : Int }>`
   (side map; no `var` in a stable record).
2. `requestWalletLinkChallenge(walletPrincipal) : async Text` (authenticated) — generates a
   `raw_rand`-based nonce, stores it keyed by `(caller, walletPrincipal)` with a short TTL,
   returns it for the frontend to sign with the wallet via ICRC-49 `icrc49_call_canister`
   (or a plain signed message).
3. Change `linkWallet(walletPrincipal, signature : Blob)` to verify the signature over the
   nonce against `walletPrincipal`'s public key before adding the link. Reject expired /
   missing / invalid.
4. Alternative if signature verification in-canister is impractical: require a **micro
   self-transfer** — the wallet sends a tiny ICRC-1 transfer to the canister with a memo ==
   nonce; `linkWallet` confirms the on-ledger transfer before linking. Document which path
   is chosen.
5. Keep the one-to-one `walletToIdentity` guard, but only reachable after proof — this
   removes the grief-lock (an attacker can no longer claim someone else's wallet without
   signing for it).

## Acceptance criteria
- `linkWallet` without a valid, unexpired proof for `walletPrincipal` is rejected.
- A wallet the caller controls can be linked end-to-end (challenge → sign → link).
- An attacker cannot pre-claim a victim's wallet (no proof → no link → no lock).

## Tests to add
- `scripts/audit/linkwallet.sh` (local): assert link fails without proof; assert a valid
  nonce flow succeeds (use the micro-transfer path on a local ICP ledger for determinism).

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx deploy --network local backend && bash scripts/audit/linkwallet.sh
```

## Mainnet deploy notes (human only)
Backend upgrade + frontend (new challenge/sign step). No stable migration (side map is
additive). Existing links remain; consider a one-time re-verification campaign for
discount/vote-bearing links.

## Risks & rollback
- Risk: existing (unproven) links already grant benefits. Mitigation: after deploy, treat
  pre-existing links as unproven for discount/vote purposes until re-verified (flag them).
- Rollback: revert; links created under the new flow stay valid.
