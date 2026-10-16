# Task 17 — Restrict `getOrder` to owner/admin (F-17, Medium)

## Goal
Stop leaking buyer principal + line items of arbitrary (enumerable) order ids to any caller.

## Files to read first
- `src/backend/mixins/marketplace-api.mo` (`getOrder` :263-275; `stripOrderShipping`;
  `toPublicOrder`; `listOrdersByBuyer` :292; `getOrderPickupClaimTokens` :277)
- `src/backend/types/marketplace.mo` (`OrderPublic` :136)

## Change description
1. In `getOrder`, return `null` for callers who are neither the buyer nor an admin (instead
   of `?stripOrderShipping(pub)`), so non-owners learn nothing — not buyer, items, or totals.
2. If a public "order exists / status" view is genuinely needed (e.g. a claim page), add a
   separate minimal query returning only non-identifying fields (status, item count), never
   the buyer principal or plant_id.
3. Confirm `getOrderPickupClaimTokens` (:277) already restricts to buyer/admin (it does —
   keep).

## Acceptance criteria
- `getOrder(id)` from a third party returns `null`.
- Buyer and admins still get the full order.

## Tests to add
- `scripts/audit/getorder-authz.sh` (local): create an order as buyer A; call `getOrder` as
  B → assert null; as A and as admin → assert full.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx deploy --network local backend && bash scripts/audit/getorder-authz.sh
```

## Mainnet deploy notes (human only)
Backend upgrade, no stable migration. Confirm no frontend flow relies on reading other
users' orders (it should only read the caller's via `listOrdersByBuyer`).

## Risks & rollback
- Risk: a claim/receipt page that reads an order by id for a non-owner breaks → use the new
  minimal public query instead.
- Rollback: revert.
