# Task 01 — Remove ICPay entirely (resolves F-01, Critical)

## Goal
Delete the ICPay payment path from backend and frontend. This eliminates F-01 (ICPay
verification trusted id+status only, never amount/currency/order) by removing the vulnerable
surface. PayPal and direct ICRC-2 (OISY/Plug) remain the checkout paths.

## Decision (owner, 2026-10-16)
ICPay is being dropped. Do **not** add amount/currency binding — remove the integration.

## Files to read first
- `src/backend/mixins/payment-api.mo` (ICPay: `setICPaySecretKey` :114; `icpayTransform` :184;
  `verifyICPayPayment` :311; `confirmICPayPayment` :354 + `doConfirmICPay` :376;
  `purchasePepperHead(paymentId)` :815 + `doPurchasePepperHead` :910;
  `purchasePlantICPay` :1101 + `doPurchasePlantICPay` :1128)
- `src/backend/main.mo` (`icpaySecretKey` :659; `icpaySessionsConsumed` :660; mixin wiring
  :1027-1028, :1063)
- `src/backend/lib/admin-orders.mo` (`orderIsPaid` / `is_paid` read `icpaySessionsConsumed`
  :14-17, :90, :101-110 — **keep these reads**, they report historical paid orders)
- `src/backend/lib/rate-limits.mo` (`icpay` bucket)
- `src/backend/types/marketplace.mo:110` (comment referencing icpaySessionsConsumed)
- Frontend: `src/frontend/src/hooks/useICPay.ts`, `src/frontend/src/lib/icpay.ts`,
  `src/frontend/src/components/PlantCheckoutPanel.tsx`, `src/frontend/src/hooks/useBackend.ts`,
  `src/frontend/src/hooks/useNims.ts`, `src/frontend/src/backend.ts`,
  `src/frontend/src/pages/legal/PrivacyPage.tsx`, `src/frontend/env.json`,
  `src/frontend/package.json` (ICPay SDK dependency)
- PROJECT_CONTEXT.md "Stable Memory Migration Patterns" (Pattern 3 — do NOT drop a stable var
  without a migration).

## Change description

### Backend
1. **Remove ICPay methods** from `payment-api.mo`: `setICPaySecretKey`, `icpayTransform`,
   `verifyICPayPayment`, `confirmICPayPayment` + `doConfirmICPay`, `purchasePlantICPay` +
   `doPurchasePlantICPay`, and the **ICPay** PepperHead method `purchasePepperHead(paymentId)`
   + `doPurchasePepperHead`. **Keep** `purchasePepperHeadDirect` (ICRC-2) and the PayPal
   methods.
2. **Remove `icpaySecretKey`** state (`main.mo:659`) and drop it from the mixin parameter
   lists. `icpaySecretKey` is a `{ var value : Text }` record, not a stable map — removing it
   is a stable-variable drop, so either (a) keep it declared but unused as
   `// Ghost — stable compat`, or (b) include it in an explicit migration. **Prefer (a)** to
   avoid a migration this phase.
3. **`icpaySessionsConsumed` — KEEP the stable declaration** (`main.mo:660`). It is the
   order-"paid" ledger read by `admin-orders.mo`. Stop all ICPay **writes** to it (those code
   paths are being deleted), but keep the declaration and the `orderIsPaid`/`is_paid` reads so
   historical paid orders still report correctly. Add a `// Retained: historical order-paid
   ledger; no longer written (ICPay removed)` comment. This avoids an M0169 migration.
4. **Remove the `rateLimits.icpay` bucket** usages tied to the deleted methods; if the bucket
   field itself is in a stable record, leave the field (ghost) to avoid a migration and just
   stop referencing it.
5. Remove ICPay audit-action strings only from deleted code (leave historical audit log
   entries intact — they are immutable history).
6. Regenerate declarations: `dfx generate backend`.

### Frontend
7. Delete `hooks/useICPay.ts` and `lib/icpay.ts`. Remove the ICPay SDK dependency from
   `package.json` and the ICPay publishable key from `env.json`.
8. Remove the ICPay option/branch from `PlantCheckoutPanel.tsx` and any checkout
   path-ordering (Stripe → ICPay → Wallet becomes Stripe/PayPal → Wallet; confirm the actual
   options rendered). Remove ICPay calls from `backend.ts`, `useBackend.ts`, `useNims.ts`.
9. Update `PrivacyPage.tsx` to drop the ICPay reference.
10. Ensure at least one working checkout path remains in the UI (PayPal and/or Wallet/ICRC-2).

## Acceptance criteria
- `grep -rni icpay src/backend` returns only: the retained `icpaySessionsConsumed`
  declaration + its `admin-orders.mo` reads (+ ghost comments). No ICPay method, outcall, or
  secret remains.
- `grep -rni icpay src/frontend/src` returns nothing (except possibly a historical changelog).
- Backend typechecks and **upgrades cleanly against the current mainnet interface locally
  with `--mode upgrade`** (no M0169/M0170) — prove the no-migration claim.
- The shop still presents a working payment path (PayPal and/or Wallet) and completes a test
  purchase on the local replica.
- `is_paid` still reports true for an order that was marked paid via `icpaySessionsConsumed`
  before the change (historical data preserved).

## Tests to add
- `scripts/audit/icpay-removed.sh` (local): assert the ICPay methods are absent from the
  candid (`dfx canister --network local call backend __get_candid_interface_tmp_hack` or check
  the generated `.did`); assert a direct-ICRC-2 or PayPal purchase still settles; assert a
  pre-seeded `icpaySessionsConsumed` order still reads `is_paid = true`.

## Local verification
```
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx start --background --clean && dfx deploy --network local backend
# prove upgrade-compat: deploy once, then redeploy with --mode upgrade and confirm no stable error
dfx deploy --network local backend --mode upgrade
dfx generate backend
cd src/frontend && pnpm typecheck && pnpm build
cd ../.. && bash scripts/audit/icpay-removed.sh
```

## Mainnet deploy notes (human only)
- Backend upgrade. Because `icpaySessionsConsumed` (and optionally `icpaySecretKey`) are
  **retained as ghost/compat**, this is a no-migration upgrade — but it IS a Candid change
  (methods removed), so expect the interface-compatibility prompt. Use the documented
  `TERM=xterm-256color dfx deploy --network ic backend <<< $'yes\nyes\n'` ceremony and take a
  state backup first.
- Frontend asset redeploy (ICPay SDK + key gone). Verify checkout works post-deploy.
- After deploy, consider calling `setICPaySecretKey` is gone — confirm no ops runbook still
  references it.

## Risks & rollback
- Risk: removing a method any live client still calls → ensure the frontend deploy lands with
  or before the backend so no UI calls the removed methods.
- Risk: accidentally dropping the `icpaySessionsConsumed` stable var → M0169 at upgrade.
  The local `--mode upgrade` check in verification catches this before mainnet.
- Rollback: revert the commit; the retained ghost state means rollback needs no migration
  either.
```
