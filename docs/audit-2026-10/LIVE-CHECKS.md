# IC SPICY — Live Checks (read-only + admin-only) for F-01..F-03 exploitation & posture

> All `dfx` commands here are **read-only queries** or **admin-only reads**. None mutate
> state. Use a non-deployer identity for anonymous queries to avoid touching the deployer
> key:
>
> ```bash
> export DFX_WARNING=-mainnet_plaintext_identity
> ```
>
> Anonymous read example used during this audit:
> `dfx canister --network ic --identity anonymous call backend getTokenPrices '()'`.
>
> Admin-only reads must be run by the owner with an admin identity (not committed). The
> commands below are templates — fill in the admin identity flag.

## A. Posture snapshot (anyone can run, anonymous)

```bash
# Oracle cache — empty means fallbacks in use (F-13)
dfx canister --network ic --identity anonymous call backend getTokenPrices '()'

# Backend admin set — expect ONLY operator keys after Task 12 (F-12)
dfx canister --network ic --identity anonymous call backend getAdmins '()'

# PepperHead supply sanity (F-01/F-02 blast-radius context)
dfx canister --network ic --identity anonymous call backend isPepperHeadAvailable '()'

# CSP / frame headers on the live site (F-09, F-19)
curl -sI https://www.icspicy.app/ | grep -iE 'content-security-policy|x-frame|frame-ancestors|x-content-type|strict-transport'
curl -sID https://icspicy.app/     | grep -iE 'server|location'   # expect NO ec2.internal after F-19

# Treasury public logs (F-05/F-06 context) — adjust method names to the canister's candid
dfx canister --network ic --identity anonymous call treasury_canister getBurnLog '()'
dfx canister --network ic --identity anonymous call treasury_canister getGovernanceAuditLog '()' 2>/dev/null || true

# Policy canister governance audit (F-06)
dfx canister --network ic --identity anonymous call spicy_policy_canister getGovernanceAuditLog '()'
```

Verify metadata is published (supports SONS CustomCall trust model):
```bash
dfx canister --network ic metadata spicy_policy_canister candid:service | head
```

## B. Did F-01 / F-03 happen? (admin-only — payment vs. amount cross-check)

The backend keeps an **audit log** and `icpaySessionsConsumed`/`orderLineNftTokenIds` maps.
There is no public amount field recorded (that is the F-01 gap), so detection relies on
cross-referencing settled orders against the ICPay/ledger side. Run as admin:

```bash
ADMIN="--identity <your-admin-identity>"

# 1. Dump the audit log and look for settlement actions.
dfx canister --network ic $ADMIN call backend getAuditLog '()' > audit.txt
grep -E 'payment_confirmed|order_payment_direct|plant_purchased_icpay|pepperhead_purchased' audit.txt

# 2. For each "payment_confirmed order=<id> ref=icpay:<paymentId>", verify in the ICPay
#    dashboard that paymentId's charged AMOUNT and CURRENCY match that order's total.
#    (This cannot be done on-chain today — F-01 is precisely the missing binding.)
#    Export orders and compare:
dfx canister --network ic $ADMIN call backend getOrder '(<id> : nat)'   # admin sees total_cents + items

# 3. For direct ICRC-2 settlements, cross-check the ledger:
#    audit detail is "order=<id> ledger=<ledgerId>" but NOT the amount. Pull the canister's
#    inbound transfers from each ledger around the settlement timestamp and confirm the
#    received amount >= the order total in that token.
dfx canister --network ic --identity anonymous call <ledgerId> icrc1_balance_of \
  "(record { owner = principal \"ghxmp-xiaaa-aaaao-ba4sq-cai\"; subaccount = null })"
```

**Red flags of F-01/F-03 abuse:**
- A `plant_purchased_icpay` / `pepperhead_purchased` whose ICPay charge amount is far below
  the plant/PH price.
- An `order_payment_direct` using the RAVEN ledger (`4k7jk-vyaaa-aaaam-qcyaa-cai`) for a
  priced order — RAVEN had no server-side amount check (F-03).
- A single `paymentId` associated with a high-value settlement but a tiny ICPay charge.

## C. Did F-02 happen? (admin-only — plant_id injection)

```bash
ADMIN="--identity <your-admin-identity>"

# For each settled order, compare the line's product vs. the NFT token that was transferred.
# orderLineNftTokenIds maps order -> [tokenId]; an order for a cheap catalog product that
# settled a token belonging to an expensive live-plant listing is the signature.
dfx canister --network ic $ADMIN call backend getOrder '(<id> : nat)'          # items incl. product_id, plant_id
dfx canister --network ic $ADMIN call backend getOrderPickupClaimTokens '(<id> : nat)'
# Then check which plant the settled tokenId belonged to:
dfx canister --network ic --identity anonymous call backend icrc7_owner_of "(vec { <tokenId> : nat })"
```

**Red flags:** an order whose items reference a low-price `product_id` but whose settled
token maps (via NIMS) to a high-value plant; a product that became `active = false`
immediately after an unrelated cheap order; a buyer holding a plant NFT with no matching
high-value payment.

## D. Did F-04 happen? (admin-only — unproven wallet links)

```bash
ADMIN="--identity <your-admin-identity>"
# Enumerate linked wallets and look for links to known whale/team principals the linking
# identity shouldn't control, or multiple identities contesting one wallet (grief attempts).
dfx canister --network ic $ADMIN call backend adminListLinkedWallets '()' 2>/dev/null \
  || echo "add an admin query to enumerate linkedWallets if absent"
```
If no admin enumeration exists, add one (small task) to review links before the F-04 fix
treats pre-existing links as unproven.

## E. Did F-11 / admin NFT moves happen? (admin-only)

```bash
ADMIN="--identity <your-admin-identity>"
dfx canister --network ic $ADMIN call backend getAuditLog '()' | grep -E \
  'unstick_pepperhead|claim_redeemed|claim_request_approved|pepperhead_purchased|treasury_withdrawal'
# Look for adminReturnToPool / relock actions moving tokens away from non-nursery owners.
# Until ICRC-3 (Task 20) exists, the audit log is the only trail — scan for ownership moves
# not preceded by a matching payment/claim.
```

## F. Standing monitors to add (post-fix)
- Alert if `getTokenPrices()` is empty for >1h (oracle down → fail-closed per Task 13).
- Alert if `getAdmins()` length changes unexpectedly (admin rotation).
- Daily job: reconcile each `payment_confirmed`/`order_payment_direct` audit entry against
  the ICPay dashboard / ledger inbound transfers and flag amount mismatches (this is the
  historical detector for F-01/F-03 until the on-chain binding from Task 01 is in place).
- Header monitor: fail if `www.icspicy.app` ever serves without CSP/`frame-ancestors` again.
