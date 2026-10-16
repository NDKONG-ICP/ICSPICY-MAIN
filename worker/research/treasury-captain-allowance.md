# Treasury → Captain allowance (closed loop)

## Funding Captain (HBAR + ICP)

1. **Treasury canister** (`x5fx2-iiaaa-aaaao-bbjxa-cai`): propose monthly outflow with two distinct admin approvals + **7-day timelock** (TOKENOMICS §6.3).
2. Destination principals:
   - ICP: Captain operating `26mw6-…` (Bonsai sales sweep target via ambassador sweep).
   - HBAR: Captain Hedera account from `/hedera/captain.json` after setup.

## Proceeds sweep-back

- Bonsai Bazaar sales: ICP lands in Captain operating → `sweepAmbassadorFunds` to `ambassador_sweep_principal`.
- SentX HBAR sales: manual or future script sweep to treasury Hedera / convert off-chain per ops policy.

## Spend guardrails (worker)

- `worker/src/lib/spend-ledger.js`: **1000 HBAR + 20 ICP / month**, per-purchase caps 100 HBAR / 2 ICP.
- All collector, lottery, and buy modules must call `assertCanSpend` / `recordSpend`.
