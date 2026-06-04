import type { OfferTokenSymbol } from "../types/index";

/** Mainnet ledger canister IDs — matches backend icrc-payment.mo */
export const PAYMENT_LEDGERS: Record<OfferTokenSymbol, string> = {
  ICP: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  ckBTC: "mxzaz-hqaaa-aaaar-qaada-cai",
  ckETH: "ss2fx-dyaaa-aaaar-qacoq-cai",
  ckUSDC: "xevnm-gaaaa-aaaar-qafnq-cai",
  ckUSDT: "cngnf-vqaaa-aaaar-qag4q-cai",
  RAVEN: "4k7jk-vyaaa-aaaam-qcyaa-cai",
};

export const STABLE_PAYMENT_TOKENS = ["ckUSDC", "ckUSDT"] as const;
export const VOLATILE_PAYMENT_TOKENS = ["ICP", "ckBTC", "ckETH", "RAVEN"] as const;
export const ALL_PAYMENT_TOKENS = [
  ...STABLE_PAYMENT_TOKENS,
  ...VOLATILE_PAYMENT_TOKENS,
] as const;

export type StablePaymentToken = (typeof STABLE_PAYMENT_TOKENS)[number];
export type VolatilePaymentToken = (typeof VOLATILE_PAYMENT_TOKENS)[number];
export type PaymentTokenSymbol = (typeof ALL_PAYMENT_TOKENS)[number];

export const TOKEN_DECIMALS: Record<PaymentTokenSymbol, number> = {
  ICP: 8,
  ckBTC: 8,
  ckETH: 18,
  ckUSDC: 6,
  ckUSDT: 6,
  RAVEN: 8,
};

export function isStablePaymentToken(
  token: PaymentTokenSymbol,
): token is StablePaymentToken {
  return token === "ckUSDC" || token === "ckUSDT";
}

/** USD cents → ckUSDC/ckUSDT base units (6 decimals). */
export function stableAmountFromUsdCents(cents: bigint): bigint {
  return cents * 10_000n;
}

import { usdToTokenAmount } from "./price-service";

/** USD cents → volatile token base units at `priceUsd` per whole token. Rounds up. */
export function volatileAmountFromUsdCents(
  cents: bigint,
  priceUsd: number,
  decimals: number,
): bigint {
  if (priceUsd <= 0) throw new Error("Token price unavailable");
  return usdToTokenAmount(Number(cents) / 100, priceUsd, decimals);
}

export function paymentAmountFromUsdCents(
  cents: bigint,
  token: PaymentTokenSymbol,
  priceUsd: number | null | undefined,
): bigint {
  if (isStablePaymentToken(token)) {
    return stableAmountFromUsdCents(cents);
  }
  if (priceUsd == null || priceUsd <= 0) {
    throw new Error(`Price unavailable for ${token}`);
  }
  return volatileAmountFromUsdCents(cents, priceUsd, TOKEN_DECIMALS[token]);
}

/** 2% headroom on volatile approvals (price movement during signing). */
export const VOLATILE_APPROVE_BUFFER_BPS = 200;

export function approveAmountWithBuffer(
  paymentAmount: bigint,
  fee: bigint,
  bufferBps: number,
): bigint {
  const buffered = (paymentAmount * BigInt(10_000 + bufferBps)) / 10_000n;
  return buffered + fee;
}

export function formatTokenAmount(
  amount: bigint,
  symbol: PaymentTokenSymbol,
  maxFrac = 6,
): string {
  const dec = TOKEN_DECIMALS[symbol];
  const divisor = 10n ** BigInt(dec);
  const whole = amount / divisor;
  const frac = (amount % divisor)
    .toString()
    .padStart(dec, "0")
    .slice(0, maxFrac);
  return `${whole}.${frac} ${symbol}`;
}

export function formatUsdFromCents(cents: bigint): string {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}
