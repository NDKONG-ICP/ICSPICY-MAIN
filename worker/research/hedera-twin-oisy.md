# Hedera mirror twins — OISY & Canopy visibility

## On-chain facts

- Twins are normal ICRC-7 tokens on `ghxmp-xiaaa-aaaao-ba4sq-cai` with extra metadata keys `icspicy:hedera_*`.
- **Soulbound** on ICP: cannot transfer or list on Bazaar once mirrored.
- Bonsai collection **1** already indexes `ghxmp` — twins appear in Canopy/Bazaar like other IC SPICY art.

## Claim flow

1. Buy HTS NFT on SentX (Hedera).
2. Sign in on icspicy.app with Internet Identity.
3. From HashPack, send **0 HBAR** to Captain Hedera account with memo `icspicy:<your II principal>`.
4. Worker `hedera-twin-sync.js` calls `adminSyncHederaTwin` → twin moves from `hedera-lock` subaccount to your principal.

## OISY

Add custom ICRC-7 collection: **ghxmp-xiaaa-aaaao-ba4sq-cai** (IC SPICY). Your twin token IDs match the IC side of the mirror manifest.
