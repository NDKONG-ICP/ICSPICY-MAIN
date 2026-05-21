# IC SPICY Wallet Guide

IC SPICY uses self-custody wallets for all financial actions — NFT transfers, crypto payments, and token balances. The app never holds your keys or custodies funds in a simulated in-app wallet.

## Sign In vs Connect Wallet

These are two separate steps:

1. **Internet Identity (II)** — sign in to access NIMS, shop, SpicyAI, and your account. II proves who you are but does not hold ICP or NFTs.
2. **Connect Wallet** — link an OISY or Plug wallet via ICRC-25/49 signer integration. This wallet holds your ICP, ckBTC, NFTs, and (when live) SPICY tokens.

You can browse and use NIMS without connecting a wallet. Connect when you're ready to pay with crypto, receive an NFT, or view on-chain balances.

## Connecting Your Wallet

From the Wallet tab, tap **Connect Wallet** and choose OISY or Plug. Your wallet's signer popup asks you to approve the connection. Once linked, IC SPICY displays your principal's token balances and NFT holdings.

The connected wallet principal may differ from your II principal — this is normal. IC SPICY maps your II session to the linked wallet for payment and NFT delivery.

## Viewing Balances

The Wallet page shows:

- **ICP** — Internet Computer's native token
- **ckBTC** — chain-key Bitcoin on ICP
- **SPICY** — IC SPICY utility token (when deployed)
- **NFT gallery** — ICRC-7 tokens including plant provenance NFTs and PepperHead memberships

Balances are read directly from the respective ICRC ledgers and the NFT canister — not from simulated backend state.

## Sending Tokens

Use your connected wallet (OISY or Plug) to send ICP, ckBTC, or other ICRC tokens to another principal. IC SPICY surfaces send flows through the wallet signer; transactions are signed in your wallet app, not on the canister.

## NFT Gallery

Plant NFTs purchased from IC SPICY appear in your gallery with tier, token ID, and a link to the plant's NIMS lifecycle page. PepperHead membership NFTs show separately with membership tier metadata. You can view any NFT's on-chain metadata and transfer it to another wallet through standard ICRC-7 transfer flows.
