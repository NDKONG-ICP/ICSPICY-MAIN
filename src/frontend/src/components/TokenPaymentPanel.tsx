import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { useTokenPrices } from "../hooks/useTokenPrices";
import { icrc2Approve } from "../lib/icrc2-payment";
import { oisyIcrc2Approve, oisyPaymentAmount } from "../lib/oisy-payment";
import { usdToTokenAmount } from "../lib/price-service";
import {
  ALL_PAYMENT_TOKENS,
  PAYMENT_LEDGERS,
  type PaymentTokenSymbol,
  TOKEN_DECIMALS,
  VOLATILE_APPROVE_BUFFER_BPS,
  formatTokenAmount,
  formatUsdFromCents,
  isStablePaymentToken,
  stableAmountFromUsdCents,
} from "../lib/token-payment";
import { useOisyWallet } from "../providers/OisyWalletProvider";
import { TOKEN_DISPLAY } from "../types";
import { OisyConnectButton } from "./OisyConnectButton";

type PayHandler = (args: {
  token: PaymentTokenSymbol;
  ledgerCanisterId: string;
  amount: bigint;
}) => Promise<void>;

type OisyPayHandler = (args: {
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
  onOisyPay,
  payingToken,
  setPayingToken,
  dataOcid = "token-payment-panel",
}: {
  usdCents: bigint;
  onPay: PayHandler;
  /** When provided, an OISY payment section is shown below the II tokens. */
  onOisyPay?: OisyPayHandler;
  payingToken: PaymentTokenSymbol | null;
  setPayingToken: (t: PaymentTokenSymbol | null) => void;
  dataOcid?: string;
}) {
  const { identity, login, isAuthenticated } = useAuth();
  const { isOisyConnected, oisyAgent, connectOisy } = useOisyWallet();
  const [oisyPayingToken, setOisyPayingToken] =
    useState<PaymentTokenSymbol | null>(null);
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
        bufferBps: isStablePaymentToken(token)
          ? 0
          : VOLATILE_APPROVE_BUFFER_BPS,
      });
      await onPay({ token, ledgerCanisterId: ledgerId, amount });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPayingToken(null);
    }
  };

  const handleOisyPay = async (token: PaymentTokenSymbol) => {
    if (!onOisyPay) return;
    if (!isOisyConnected || !oisyAgent) {
      await connectOisy();
      return;
    }
    const priceUsd = tokenPriceUsd(token, prices);
    if (priceUsd == null) {
      toast.error("Price unavailable — try ckUSDC or ckUSDT");
      return;
    }
    const ledgerId = PAYMENT_LEDGERS[token];
    setOisyPayingToken(token);
    try {
      const amount = oisyPaymentAmount(usdCents, token, priceUsd);
      await oisyIcrc2Approve(oisyAgent, ledgerId, amount, undefined, {
        bufferBps: isStablePaymentToken(token)
          ? 0
          : VOLATILE_APPROVE_BUFFER_BPS,
      });
      await onOisyPay({ token, ledgerCanisterId: ledgerId, amount });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("denied")) {
        toast.error("Transaction cancelled. No funds were sent.");
      } else {
        toast.error(msg || "OISY payment failed");
      }
    } finally {
      setOisyPayingToken(null);
    }
  };

  const volatileUnavailable = pricesError || !prices;
  const anyPaying = payingToken !== null || oisyPayingToken !== null;

  return (
    <div className="space-y-4" data-ocid={dataOcid}>
      {/* ── Internet Identity payment ── */}
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
            anyPaying ||
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
              className="w-full h-auto py-3 px-3 gap-1.5 flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-between"
              disabled={disabled}
              onClick={() => void handlePay(token)}
              data-ocid={`pay-${token.toLowerCase()}-btn`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${display.bgClass} ${display.colorClass}`}
                >
                  {display.symbol}
                </span>
                <span className="font-semibold">{token}</span>
              </span>
              {isPaying ? (
                <Loader2 className="w-4 h-4 animate-spin self-end sm:self-center" />
              ) : (
                <span className="text-xs text-primary-foreground/90 w-full sm:w-auto sm:max-w-[48%] sm:text-right leading-snug break-words">
                  {subtitle}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* ── OISY wallet payment ── */}
      {onOisyPay && (
        <div
          className="space-y-3 pt-3 border-t border-border"
          data-ocid="oisy-payment-section"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Pay with OISY</p>
              <p className="text-xs text-muted-foreground">NFT will be custodied in your OISY wallet</p>
            </div>
            {!isOisyConnected && (
              <OisyConnectButton
                size="sm"
                variant="outline"
                label="Connect OISY"
              />
            )}
          </div>
          {!isOisyConnected && (
            <p className="text-xs text-muted-foreground/70 rounded-md bg-muted/30 px-3 py-2">
              Connect your OISY wallet to pay with OISY. Your NFT will be custodied at your OISY principal.
            </p>
          )}
          {isOisyConnected && (
            <>
              {oisyPayingToken !== null && (
                <div className="flex items-center gap-2 rounded-md bg-orange-500/10 border border-orange-500/30 px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-400 flex-shrink-0" />
                  <p className="text-xs text-orange-300">
                    Waiting for OISY approval… check your OISY wallet popup.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_PAYMENT_TOKENS.map((token) => {
                  const display = TOKEN_DISPLAY[token];
                  const isStable = isStablePaymentToken(token);
                  const priceUsd = tokenPriceUsd(token, prices);
                  const isPaying = oisyPayingToken === token;
                  const disabled =
                    anyPaying ||
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
                      className="w-full h-auto py-3 px-3 gap-1.5 flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-between border-orange-500/30 hover:border-orange-500/60"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => void handleOisyPay(token)}
                      data-ocid={`oisy-pay-${token.toLowerCase()}-btn`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${display.bgClass} ${display.colorClass}`}
                        >
                          {display.symbol}
                        </span>
                        <span className="font-semibold">{token}</span>
                      </span>
                      {isPaying ? (
                        <Loader2 className="w-4 h-4 animate-spin self-end sm:self-center" />
                      ) : (
                        <span className="text-xs text-muted-foreground w-full sm:w-auto sm:max-w-[48%] sm:text-right leading-snug break-words">
                          {subtitle}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground/60">
                ~2 OISY approval steps: ledger approve + settlement. Your NFT is custodied in OISY.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function useTokenPaymentState() {
  return useState<PaymentTokenSymbol | null>(null);
}
