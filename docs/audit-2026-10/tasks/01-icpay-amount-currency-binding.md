# Task 01 — Bind ICPay verification to amount, currency, and order (F-01, Critical)

## Goal
Make `verifyICPayPayment` return the charged amount + currency + metadata and have every
caller reject payments that don't match the order/SKU being settled.

## Files to read first
- `src/backend/mixins/payment-api.mo` (`verifyICPayPayment` :311; `doConfirmICPay` :376;
  `doPurchasePepperHead` :910; `doPurchasePlantICPay` :1128; `getTextField` :292)
- `src/backend/lib/json-mini.mo` (the `#Map`/`#Text`/`#Number` value shape)
- `src/backend/types/marketplace.mo` (`Order.total_cents`)
- ICPay API: confirm the `GET /sdk/payments/:id` JSON shape (amount, currency, metadata)
  from the project's ICPay dashboard/docs — **do not guess field names.**

## Change description
1. Add a numeric accessor next to `getTextField`:
   `func getNumberField(entries, key) : ?Float|?Nat` (match `JsonMini`'s number variant).
2. Change `verifyICPayPayment(paymentId : Text)` to
   `verifyICPayPayment(paymentId : Text) : async Result.Result<{ amountMinor : Nat; currency : Text; orderRef : ?Text }, Text>`
   parsing the amount (in the smallest currency unit), currency code, and
   `metadata.order_id` (or equivalent) from the response. Keep the existing id + status checks.
3. In `doConfirmICPay` (:400) assert, after verify:
   - `currency` equals the expected settlement currency (e.g. `"usd"`), else `#err`.
   - `amountMinor >= order.total_cents` (both in cents; convert if ICPay reports dollars).
   - `orderRef == ?Nat.toText(orderId)` (require ICPay metadata to carry the order id; the
     frontend must set it at charge creation).
4. In `doPurchasePepperHead` (:918): assert `amountMinor >= PH_PRICE_CENTS` and
   `currency == "usd"` and `orderRef == ?"pepperhead"` (or a dedicated sku marker).
5. In `doPurchasePlantICPay` (:1137): require a server-side plant price. If plant listings
   carry a price (`plantPrices`), assert `amountMinor >= thatPrice`; also require the
   metadata to bind the plantId.
6. No stable-memory changes (no new `var` fields / variants) — all checks are in method
   bodies. Keep `icpaySessionsConsumed` idempotency exactly as is.

## Acceptance criteria
- A payment whose amount is below the order/PH/plant price is rejected with a clear message
  and the order is **not** settled and `icpaySessionsConsumed` is **not** marked.
- A payment with a mismatched currency or missing/mismatched order metadata is rejected.
- A correct payment still settles exactly once.

## Tests to add
- `scripts/audit/icpay-amount.sh` (bash+dfx, local): stub the HTTPS outcall transform or use
  an admin-set mock ICPay response (if available) to drive verify with low/wrong/correct
  amounts; assert pipeline outcomes only (settled vs rejected), not JSON internals.
- Frontend: ensure the ICPay charge is created with `metadata.order_id`/sku set; add a unit
  test on the charge-builder.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx start --background --clean && dfx deploy --network local backend
bash scripts/audit/icpay-amount.sh
```

## Mainnet deploy notes (human only)
Backend upgrade; `wasm_memory_persistence: keep`. No stable migration. Frontend must be
redeployed so ICPay charges include `metadata.order_id`/sku **before or with** the backend,
or legitimate payments missing metadata will be rejected — coordinate the two deploys.

## Risks & rollback
- Risk: ICPay field names differ from assumptions → verify against real API first; gate
  behind a feature flag (`icpayStrictChecks` admin bool) so it can be toggled off if the
  parse is wrong, defaulting **on**.
- Rollback: revert the commit; the idempotency guard remains, so no double-settlement risk
  is introduced by rollback.
