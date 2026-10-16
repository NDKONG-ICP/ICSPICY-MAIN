# Task 03 — Close RAVEN amount-validation bypass (F-03, Critical)

## Goal
Stop the direct-payment and PepperHead-direct paths from accepting any RAVEN amount because
RAVEN has no server-side oracle.

## Files to read first
- `src/backend/mixins/payment-api.mo` (`oracleTokenFromPayment` :496; `confirmOrderPaymentDirect`
  path :537-562; `doPurchasePepperHeadDirect` :868-892)
- `src/backend/lib/icrc-payment.mo` (`#RAVEN` :88, `isAllowedLedgerId` :115)
- `src/backend/lib/price-oracle.mo`

## Change description
Two options — ship **A** in Phase 0 (hours), upgrade to **B** later:

**Option A (fast, safe):** remove RAVEN from the *payment* allow-list.
1. In `lib/icrc-payment.mo`, keep `#RAVEN` for balance/discount reads but make
   `isAllowedLedgerId` (used by `adminWithdrawTokens`) and the payment token resolution
   (`tokenFromLedgerId`, `payment-api.mo:486`) **exclude** RAVEN, so
   `confirmOrderPaymentDirect`/`purchasePepperHeadDirect` return `"Unsupported ledger"` for
   RAVEN until an oracle exists.
2. Remove RAVEN from the frontend payment-method list (grep `src/frontend/src` for `RAVEN`).

**Option B (keep RAVEN as payment):** add a server-side RAVEN/ICP quote.
1. Query the RAVEN/ICP ICPSwap pool from the canister (typed call), cache it like other
   oracle tokens (extend `OracleToken` with `#RAVEN` and `defaultPrice`/refresh).
2. Make `oracleTokenFromPayment(#RAVEN)` return `?#RAVEN` so
   `isPaymentAmountSufficient` runs with the volatile 95%-tolerance branch.
3. Remove the `case null {}` "client validated" branches at `:561` and `:891`.

## Acceptance criteria
- A RAVEN direct payment of dust for a priced order/PH is **rejected** (A: unsupported
  ledger; B: amount insufficient).
- Non-RAVEN tokens are unaffected.

## Tests to add
- `scripts/audit/raven-dust.sh` (local): attempt `confirmOrderPaymentDirect(order, ravenId, 1)`
  and `purchasePepperHeadDirect(ravenId, 1)`; assert rejection.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx deploy --network local backend && bash scripts/audit/raven-dust.sh
```

## Mainnet deploy notes (human only)
Backend upgrade, no stable migration. If choosing A, coordinate the frontend change so the
RAVEN option disappears from checkout.

## Risks & rollback
- Risk: RAVEN holders currently able to pay lose that option under A (acceptable; it was
  unsound). Communicate.
- Rollback: revert commit.
