# Hedera drop (Captain Capsaicin)

## Accounts

- Generate key: `cd worker && node scripts/hedera-captain-setup.js`
- Import private key into **HashPack**; fund ≥50 HBAR; `node scripts/hedera-captain-setup.js --resolve`
- **SentX:** connect same HashPack at https://sentx.io/ and complete creator profile; list collection after mint.

## IC side

1. `node scripts/hedera-drop-select.js` — 888 tokens (excludes PepperHeads + Bonsai 888 manifest).
2. `node scripts/hedera-drop-lock.js --pem <admin>` — lock to canister subaccount `hedera-lock`.
3. Deploy backend upgrade with `adminSetHederaMirror` / `getHederaMirror` (gated mainnet).

## HTS

1. `node scripts/hedera-drop-mint.js --dry-run` then `--network testnet` for smoke test.
2. Mainnet mint when funded; set `VITE_HEDERA_DROP_TOKEN_ID` in frontend build.
3. `node scripts/hedera-drop-sync-icrc.js --pem <admin>` — merge mirror into ICRC-7 metadata.

## Dapp

- HashPack: set `VITE_WALLETCONNECT_PROJECT_ID`; header **HashPack** button.
- Admin: **Agents → Bonsai drop → Hedera** tab (mirror holders).
