import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { useTokenPrices } from "../hooks/useTokenPrices";
import { icrc2Approve } from "../lib/icrc2-payment";
import { usdToTokenAmount } from "../lib/price-service";
import {
  ALL_PAYMENT_TOKENS,
  formatTokenAmount,
  formatUsdFromCents,
  isStablePaymentToken,
  PAYMENT_LEDGERS,
  stableAmountFromUsdCents,
  TOKEN_DECIMALS,
  VOLATILE_APPROVE_BUFFER_BPS,
  type PaymentTokenSymbol,
} from "../lib/token-payment";
import { TOKEN_DISPLAY } from "../types";

type PayHandler = (args: {
  token: PaymentTokenSymbol;
  ledgerCanisterId: string;
  amount: bigint;
}) => Promise<void>;

function tokenPriceUsd(
  token: PaymentTokenSymbol,
  prices: Record<string, number> | undefined,
): number | null {
  if (isStablePaymentToken(token)) {
    return prices?.[token] ?? 1;
  }
  const p = prices?.[token];
  return p != null && p > 0 ? p : null;
}

function paymentAmount(
  usdCents: bigint,
  token: PaymentTokenSymbol,
  priceUsd: number,
): bigint {
  if (isStablePaymentToken(token)) {
    return stableAmountFromUsdCents(usdCents);
  }
  const usd = Number(usdCents) / 100;
  return usdToTokenAmount(usd, priceUsd, TOKEN_DECIMALS[token]);
}

function formatPaySubtitle(
  usdCents: bigint,
  token: PaymentTokenSymbol,
  priceUsd: number,
): string {
  const usdLabel = formatUsdFromCents(usdCents);
  const amt = paymentAmount(usdCents, token, priceUsd);
  if (isStablePaymentToken(token)) {
    return `${usdLabel} = ${formatTokenAmount(amt, token, 2)}`;
  }
  return `${usdLabel} ≈ ${formatTokenAmount(amt, token, 4)} (at $${priceUsd.toFixed(2)}/${token})`;
}

export function TokenPaymentPanel({
  usdCents,
  onPay,
  payingToken,
  setPayingToken,
  dataOcid = "token-payment-panel",
}: {
  usdCents: bigint;
  onPay: PayHandler;
  payingToken: PaymentTokenSymbol | null;
  setPayingToken: (t: PaymentTokenSymbol | null) => void;
  dataOcid?: string;
}) {
  const { identity, login, isAuthenticated } = useAuth();
  const {
    data: prices,
    isLoading: pricesLoading,
    isError: pricesError,
  } = useTokenPrices();

  const handlePay = async (token: PaymentTokenSymbol) => {
    if (!identity) {
      login();
      return;
    }
    const priceUsd = tokenPriceUsd(token, prices);
    if (priceUsd == null) {
      toast.error(
        isStablePaymentToken(token)
          ? "Price unavailable"
          : "Price unavailable — try stablecoins",
      );
      return;
    }
    const ledgerId = PAYMENT_LEDGERS[token];
    setPayingToken(token);
    try {
      const amount = paymentAmount(usdCents, token, priceUsd);
      await icrc2Approve(identity, ledgerId, amount, undefined, {
        bufferBps: isStablePaymentToken(token) ? 0 : VOLATILE_APPROVE_BUFFER_BPS,
      });
      await onPay({ token, ledgerCanisterId: ledgerId, amount });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPayingToken(null);
    }
  };

  const volatileUnavailable = pricesError || !prices;

  return (
    <div className="space-y-4" data-ocid={dataOcid}>
      <p className="text-sm text-muted-foreground">
        Pay {formatUsdFromCents(usdCents)} with Internet Identity + ICRC-2
      </p>
      {pricesLoading && (
        <p className="text-xs text-muted-foreground">
          Loading prices from CoinGecko…
        </p>
      )}
      {volatileUnavailable && !pricesLoading && (
        <p className="text-xs text-amber-400/90 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          Price unavailable for volatile tokens — try ckUSDC or ckUSDT
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_PAYMENT_TOKENS.map((token) => {
          const display = TOKEN_DISPLAY[token];
          const isStable = isStablePaymentToken(token);
          const priceUsd = tokenPriceUsd(token, prices);
          const isPaying = payingToken === token;
          const disabled =
            !isAuthenticated ||
            payingToken !== null ||
            priceUsd == null ||
            (!isStable && volatileUnavailable);

          let subtitle = "—";
          if (priceUsd != null) {
            subtitle = formatPaySubtitle(usdCents, token, priceUsd);
          } else if (!isStable && volatileUnavailable) {
            subtitle = "Price unavailable";
          }

          return (
            <Button
              key={token}
              className="w-full justify-between h-auto py-3"
              disabled={disabled}
              onClick={() => handlePay(token)}
              data-ocid={`pay-${token.toLowerCase()}-btn`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${display.bgClass} ${display.colorClass}`}
                >
                  {display.symbol}
                </span>
                <span className="font-semibold">{token}</span>
              </span>
              {isPaying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-xs text-muted-foreground text-right max-w-[55%] leading-snug">
                  {subtitle}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function useTokenPaymentState() {
  return useState<PaymentTokenSymbol | null>(null);
}
