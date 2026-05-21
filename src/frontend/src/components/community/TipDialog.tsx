import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PostId } from "../../declarations/backend.did";
import { useSendTip } from "../../hooks/useTip";
import { useTokenPrices } from "../../hooks/useTokenPrices";
import {
  ALL_PAYMENT_TOKENS,
  type PaymentTokenSymbol,
  TOKEN_DECIMALS,
  paymentAmountFromUsdCents,
} from "../../lib/token-payment";
import { TOKEN_DISPLAY } from "../../types/index";

function tenPow(exp: number): bigint {
  let v = 1n;
  for (let i = 0; i < exp; i++) v *= 10n;
  return v;
}

function parseHumanToBaseUnits(raw: string, decimals: number): bigint | null {
  const t = raw.trim().replace(",", ".").replace(/\s+/g, "");
  if (!t) return null;
  if (decimals === 0) {
    if (!/^\d+$/.test(t)) return null;
    try {
      return BigInt(t);
    } catch {
      return null;
    }
  }
  if (/[^0-9.]/.test(t) || (t.match(/\./g)?.length ?? 0) > 1) return null;
  const m = /^(\d+)?(?:\.(\d+))?$/.exec(t);
  if (!m) return null;
  try {
    const wholePart = m[1] && m[1].length > 0 ? m[1] : "0";
    const whole = BigInt(wholePart);
    const fracSlice = ((m[2] as string | undefined) ?? "").slice(0, decimals);
    const frac = fracSlice.padEnd(decimals, "0");
    const fracBn = BigInt(frac);
    return whole * tenPow(decimals) + fracBn;
  } catch {
    return null;
  }
}

function formatBaseUnitsHuman(val: bigint, decimals: number): string {
  if (decimals === 0) return val.toString();
  const divisor = tenPow(decimals);
  const w = val / divisor;
  const fRaw = val % divisor;
  if (fRaw === 0n) return w.toString();
  const frac = fRaw.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${w}.${frac}`;
}

export function TipDialog({
  postId,
  recipientPrincipalText,
  triggerLabel = "Tip",
  children,
}: {
  postId: PostId;
  recipientPrincipalText: string | undefined;
  triggerLabel?: string;
  children?: React.ReactNode;
}) {
  const [token, setToken] = useState<PaymentTokenSymbol>("ICP");
  const [open, setOpen] = useState(false);
  const [amountText, setAmountText] = useState("");

  const sendTip = useSendTip();
  const { data: prices, isLoading: pxLoading } = useTokenPrices();

  const decimals = TOKEN_DECIMALS[token];

  const computedAmount = useMemo(
    () => parseHumanToBaseUnits(amountText, decimals),
    [amountText, decimals],
  );

  const applyUsdPreset = (usdWhole: bigint) => {
    try {
      const cents = usdWhole * 100n;
      const amt = paymentAmountFromUsdCents(cents, token, prices?.[token]);
      setAmountText(formatBaseUnitsHuman(amt, TOKEN_DECIMALS[token]));
    } catch {
      toast.error("Price unavailable — refresh or switch token");
    }
  };

  const handleSend = () => {
    if (!recipientPrincipalText) {
      toast.error("Tips unavailable for anonymous posts.");
      return;
    }
    const amt = parseHumanToBaseUnits(amountText, decimals);
    if (!amt || amt <= 0n) {
      toast.error("Enter a tip amount.");
      return;
    }

    sendTip.mutate(
      {
        postId,
        recipientPrincipalText,
        token,
        amount: amt,
      },
      {
        onSuccess: () => {
          toast.success("Tip sent — thank you for supporting growers!");
          setOpen(false);
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Tip failed."),
      },
    );
  };

  const sendDisabled =
    pxLoading ||
    !recipientPrincipalText ||
    sendTip.isPending ||
    computedAmount === null ||
    computedAmount <= 0n;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!recipientPrincipalText}
            className="h-8 px-3 text-xs border-border"
            data-ocid="community-tip-open"
          >
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl border border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-display">
            Tip this post
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Internet Identity settles an ICRC-1 transfer to the author wallet
            principal, then anchors the ledger receipt on-chain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {ALL_PAYMENT_TOKENS.map((sym) => {
              const dc = TOKEN_DISPLAY[sym];
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setToken(sym)}
                  className={[
                    "text-xs px-2 py-1 rounded-lg border transition-smooth",
                    token === sym
                      ? "border-primary/60 bg-primary/15 text-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30",
                  ].join(" ")}
                  data-ocid={`tip-token-${sym}`}
                >
                  <span className={dc.colorClass}>{dc.symbol}</span>{" "}
                  <span className="tabular-nums opacity-70">{sym}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([1n, 5n, 10n] as const).map((u) => (
              <Button
                key={u.toString()}
                variant="outline"
                size="sm"
                type="button"
                className="h-9 text-xs border-border"
                disabled={pxLoading || !recipientPrincipalText}
                onClick={() => applyUsdPreset(u)}
                data-ocid={`tip-quick-usd-${u}`}
              >
                +${u.toString()}
              </Button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tip-amt" className="text-xs text-muted-foreground">
              Amount ({token})
            </Label>
            <Input
              id="tip-amt"
              placeholder="e.g. 0.125"
              value={amountText}
              inputMode="decimal"
              onChange={(e) => setAmountText(e.target.value)}
              className="text-sm h-11 bg-muted/30 border-border"
              data-ocid="tip-amount-input"
            />
          </div>
          {!recipientPrincipalText ? (
            <p className="text-[11px] text-destructive">
              Anonymous posters hide principals — tipping is paused for privacy.
            </p>
          ) : (
            prices && (
              <p className="text-[10px] text-muted-foreground">
                Rough USD oracle from CoinGecko for quick buttons only — ledger
                still settles crypto units you enter.
              </p>
            )
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            type="button"
            size="sm"
            className="border-border text-xs"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            type="button"
            className="text-xs gap-2 bg-primary hover:bg-primary/90"
            disabled={sendDisabled}
            onClick={handleSend}
            data-ocid="tip-send"
          >
            {sendTip.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing…
              </>
            ) : (
              <>Send tip</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
