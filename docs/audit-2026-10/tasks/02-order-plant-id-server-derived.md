# Task 02 — Make order line `plant_id` server-derived, not caller-supplied (F-02, Critical)

## Goal
Stop a caller from attaching an arbitrary `plant_id` to a cheap product line and receiving
that plant's NFT at the cheap price.

## Files to read first
- `src/backend/types/marketplace.mo` (`OrderItem` :118, `CreateOrderInput` :151)
- `src/backend/lib/marketplace-order.mo` (`createValidatedOrder` :47; the copy at :127-132)
- `src/backend/lib/product-nft.mo` (`pickLineNft` :168-181; settlement :304-311)
- `src/backend/mixins/marketplace-api.mo` (`placeOrder` :302, `createOrder` :214)

## Change description
Two equivalent options — prefer **A** (narrowest, no type change needed if risky for stable
memory, but `OrderItem` is stored in the `Order` record so changing it needs care):

**Option A (recommended, no stable-type change):** ignore the client value.
1. In `createValidatedOrder` (`:127-132`), set the validated item's `plant_id` from the
   **product**, never the input:
   ```motoko
   let validated = { product_id = item.product_id; plant_id = product.plant_id; quantity; price_cents = unitPrice };
   ```
2. In `product-nft.mo` `pickLineNft` (`:178-181`) and the settlement block (`:304-307`),
   replace `item.plant_id` with `product.plant_id` so the only plant binding is the
   product's own.
3. Leave `OrderItem.plant_id` in the type (it is now always equal to the product's binding),
   so no stable-memory migration is required.

**Option B (clean, requires migration):** remove `plant_id` from `OrderItem`. This changes a
stable record type (`Order.items`) → needs an explicit migration per PROJECT_CONTEXT Pattern
1/2. Only do this if the team wants the type cleaned up; schedule as a separate task.

## Acceptance criteria
- Placing an order for a $1 catalog product with `plant_id = <expensive plant>` settles the
  catalog product's own NFT (or fails if none), never the expensive plant's NFT, and does
  **not** deactivate the expensive plant's product.
- A legitimate live-plant product (whose `product.plant_id` is set) still settles that
  plant's NFT.

## Tests to add
- `scripts/audit/plant-id-injection.sh` (local): create a cheap catalog product and a
  plant-linked product; place an order with a forged `plant_id`; assert the forged plant's
  NFT ownership is unchanged after settlement.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx deploy --network local backend && bash scripts/audit/plant-id-injection.sh
```

## Mainnet deploy notes (human only)
Option A: backend upgrade, no stable migration. Option B: stable migration required — do not
attempt without the documented `with migration` flow and a state backup.

## Risks & rollback
- Risk (A): a frontend that relied on passing `plant_id` for plant checkout must instead
  rely on `product.plant_id`; confirm the plant-purchase UI creates a product with
  `plant_id` set (it does via `linkPlantListingNft`). Verify before deploy.
- Rollback: revert commit.
