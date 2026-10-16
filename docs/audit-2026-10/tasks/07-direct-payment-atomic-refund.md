# Task 07 — Atomic direct-payment settlement with refund on failure (F-07, High)

## Goal
Never capture funds without delivering NFTs: pre-validate the whole order before pulling
funds, settle all-or-nothing, and refund if post-transfer settlement fails.

## Files to read first
- `src/backend/mixins/payment-api.mo` (`doConfirmOrderPaymentDirect` :507-620; transferFrom
  :565; settlement error return :586)
- `src/backend/lib/product-nft.mo` (`settleOrderLineItems` :238-342 — mid-loop `return #err`)
- `src/backend/lib/icrc-payment.mo` (`transferOut` for refunds)

## Change description
1. Add a pure pre-check `canSettleOrder(order, …) : Result<(), Text>` in `product-nft.mo`
   that verifies, without mutating, that **every** line has an available, canister/nursery-
   owned NFT and valid quantity. Call it **before** `transferFrom` in
   `doConfirmOrderPaymentDirect` (and in the ICPay confirm path). If it fails, return before
   taking funds.
2. After a successful `transferFrom`, call `settleOrderLineItems`. If it returns `#err`
   (should be rare after the pre-check, but handle races), issue a refund:
   `IcrcPayment.transferOut(ledgerCanisterId, caller, amount - fee, …)`, append a
   `"order_payment_refunded"` audit entry, and return failure. Document the compensation.
3. Make settlement itself atomic: have `settleOrderLineItems` compute all line token
   assignments first (no mutation), and only apply ownership changes once every line is
   resolved — so a later-line failure cannot leave earlier-line NFTs transferred.
4. Apply the same pre-check + refund discipline to the ICPay confirm path (`doConfirmICPay`)
   where it transfers no funds itself but should still be atomic across lines.

## Acceptance criteria
- A multi-line order where any line cannot settle is rejected **before** funds are pulled.
- If settlement fails after funds are pulled (simulated race), the buyer is refunded
  (amount − fee) and no NFTs are transferred.
- A fully valid order settles all lines and marks the order paid exactly once.

## Tests to add
- `scripts/audit/direct-pay-atomic.sh` (local): (a) two-line order with line 2 unavailable →
  assert no transferFrom occurred and no NFT moved; (b) force a post-transfer settlement
  error via a stubbed pool-empty condition → assert refund block index recorded.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx deploy --network local backend && bash scripts/audit/direct-pay-atomic.sh
```

## Mainnet deploy notes (human only)
Backend upgrade, no stable migration. Refund path makes an extra ICRC-1 transfer — ensure
the canister holds enough of each payment token to cover refunds (it just received the
payment, so yes, minus fee).

## Risks & rollback
- Risk: refund could itself fail (ledger issue) → log to audit and surface to admin for
  manual reconciliation; do not trap (would roll back the audit entry).
- Rollback: revert; pre-check is independently safe to keep.
