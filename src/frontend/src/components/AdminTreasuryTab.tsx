import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { ArrowUpRight, Coins, Loader2, RefreshCw, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import {
  useAdminWithdrawTokens,
  useAuditLog,
  useCanisterTreasuryBalances,
} from "../hooks/useBackend";
import {
  formatTokenAmount,
  formatTokenFee,
  parseTokenAmount,
  TOKEN_LEDGER_CONFIG,
} from "../hooks/useTokenBalances";
import { TOKEN_DISPLAY, type OfferTokenSymbol } from "../types";

const DISPLAY_FRACTIONS: Record<string, number> = {
  ICP: 4,
  ckBTC: 8,
  ckETH: 6,
  ckUSDC: 2,
  ckUSDT: 2,
};

function formatCanisterBalance(
  balance: bigint,
  decimals: number,
  symbol: string,
): string {
  const fracDigits = DISPLAY_FRACTIONS[symbol] ?? Math.min(decimals, 6);
  const base = 10n ** BigInt(decimals);
  const whole = balance / base;
  const frac = (balance % base)
    .toString()
    .padStart(decimals, "0")
    .slice(0, fracDigits)
    .padEnd(fracDigits, "0");
  return `${whole}.${frac}`;
}

function ledgerConfigForSymbol(symbol: string) {
  return TOKEN_LEDGER_CONFIG.find((c) => c.symbol === symbol);
}

function CanisterBalancesSection({
  onRefresh,
  isRefreshing,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const { data: balances = [], isLoading } = useCanisterTreasuryBalances();

  const ordered = useMemo(() => {
    const bySymbol = new Map(balances.map((b) => [b.symbol, b]));
    return TOKEN_LEDGER_CONFIG.map((cfg) => ({
      ...cfg,
      balance: bySymbol.get(cfg.symbol)?.balance ?? 0n,
      ledgerCanisterId:
        bySymbol.get(cfg.symbol)?.ledgerCanisterId ?? cfg.canisterId,
    }));
  }, [balances]);

  return (
    <section className="space-y-3" data-ocid="treasury-canister-balances">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Canister Balances
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          onClick={onRefresh}
          disabled={isRefreshing}
          data-ocid="treasury-refresh-balances-btn"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>
      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
        {isLoading
          ? TOKEN_LEDGER_CONFIG.map((cfg) => (
              <Skeleton key={cfg.symbol} className="h-12 w-full rounded-none" />
            ))
          : ordered.map((row) => {
              const display = TOKEN_DISPLAY[row.symbol as OfferTokenSymbol];
              const available =
                row.balance > row.fee ? row.balance - row.fee : 0n;
              return (
                <div
                  key={row.symbol}
                  className="flex items-center justify-between px-4 py-3 bg-card gap-4"
                  data-ocid={`treasury-balance-${row.symbol.toLowerCase()}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${display.bgClass} ${display.colorClass}`}
                    >
                      {display.symbol}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {row.symbol}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        Available to withdraw:{" "}
                        {formatCanisterBalance(
                          available,
                          row.decimals,
                          row.symbol,
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm text-foreground flex-shrink-0">
                    {formatCanisterBalance(
                      row.balance,
                      row.decimals,
                      row.symbol,
                    )}
                  </span>
                </div>
              );
            })}
      </div>
    </section>
  );
}

function WithdrawSection({
  balances,
  onSuccess,
}: {
  balances: Array<{ symbol: string; balance: bigint; ledgerCanisterId: string }>;
  onSuccess: () => void;
}) {
  const withdraw = useAdminWithdrawTokens();
  const { principal } = useAuth();
  const [tokenSymbol, setTokenSymbol] = useState("ckUSDC");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<string | null>(null);

  const ledgerCfg = ledgerConfigForSymbol(tokenSymbol);
  const rawBalance =
    balances.find((b) => b.symbol === tokenSymbol)?.balance ?? 0n;
  const fee = ledgerCfg?.fee ?? 0n;
  const available = rawBalance > fee ? rawBalance - fee : 0n;

  useEffect(() => {
    if (principal && !recipient) {
      setRecipient(principal.toText());
    }
  }, [principal, recipient]);

  useEffect(() => {
    setAmountError(null);
  }, [tokenSymbol, amount]);

  const validateAmount = (amountBase: bigint): string | null => {
    if (amountBase <= 0n) return "Enter an amount greater than zero";
    if (amountBase > available) {
      return `Maximum withdrawable is ${formatTokenAmount(available, ledgerCfg?.decimals ?? 6)} ${tokenSymbol} (balance minus network fee)`;
    }
    return null;
  };

  const handleMax = () => {
    if (!ledgerCfg || available <= 0n) return;
    setAmount(formatTokenAmount(available, ledgerCfg.decimals));
    setAmountError(null);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerCfg || !amount.trim() || !recipient.trim()) return;
    try {
      const amountBase = parseTokenAmount(amount, ledgerCfg.decimals);
      const err = validateAmount(amountBase);
      if (err) {
        setAmountError(err);
        return;
      }
      const result = await withdraw.mutateAsync({
        ledgerCanisterId: ledgerCfg.canisterId,
        to: Principal.fromText(recipient.trim()),
        amount: amountBase,
      });
      setLastBlock(result.blockIndex?.toString() ?? null);
      toast.success(
        `Withdrawal confirmed${result.blockIndex != null ? ` — block ${result.blockIndex}` : ""}`,
      );
      setAmount("");
      setAmountError(null);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    }
  };

  return (
    <section
      className="space-y-4 rounded-xl border border-border bg-card p-5"
      data-ocid="treasury-withdraw-section"
    >
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <ArrowUpRight className="w-4 h-4 text-primary" />
        Withdraw
      </h3>
      <form onSubmit={handleWithdraw} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="treasury-wd-token">Token</Label>
            <Select
              value={tokenSymbol}
              onValueChange={(v) => {
                setTokenSymbol(v);
                setAmount("");
              }}
            >
              <SelectTrigger id="treasury-wd-token" data-ocid="treasury-wd-token">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOKEN_LEDGER_CONFIG.map((cfg) => (
                  <SelectItem key={cfg.symbol} value={cfg.symbol}>
                    {cfg.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="treasury-wd-amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="treasury-wd-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-ocid="treasury-wd-amount"
                className={amountError ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                disabled={available <= 0n}
                onClick={handleMax}
                data-ocid="treasury-wd-max-btn"
              >
                Max
              </Button>
            </div>
            {ledgerCfg && (
              <p className="text-[10px] text-muted-foreground">
                Available to withdraw:{" "}
                {formatTokenAmount(available, ledgerCfg.decimals)} {tokenSymbol}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="treasury-wd-recipient">Recipient principal</Label>
          <Input
            id="treasury-wd-recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="aaaaa-aa"
            className="font-mono text-xs"
            data-ocid="treasury-wd-recipient"
          />
        </div>
        {ledgerCfg && (
          <p className="text-xs text-muted-foreground">
            Network fee: {formatTokenFee(ledgerCfg.fee, ledgerCfg.decimals)}{" "}
            {ledgerCfg.symbol}
          </p>
        )}
        {amountError && (
          <p className="text-xs text-destructive">{amountError}</p>
        )}
        {lastBlock && (
          <p className="text-xs text-emerald-400 font-mono">
            Last withdrawal block index: {lastBlock}
          </p>
        )}
        <Button
          type="submit"
          disabled={
            withdraw.isPending ||
            !amount.trim() ||
            !recipient.trim() ||
            available <= 0n
          }
          data-ocid="treasury-wd-btn"
        >
          {withdraw.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Coins className="w-4 h-4" />
              Withdraw
            </>
          )}
        </Button>
      </form>
    </section>
  );
}

function WithdrawalHistorySection() {
  const { data: entries = [], isLoading } = useAuditLog(0n, 100n);
  const withdrawals = entries.filter((e) => e.action === "treasury_withdrawal");

  return (
    <section className="space-y-3" data-ocid="treasury-withdrawal-history">
      <h3 className="text-sm font-semibold text-foreground">
        Withdrawal History
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : withdrawals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
          No treasury withdrawals recorded yet.
        </p>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {withdrawals.map((entry, i) => (
            <div
              key={`${entry.ts.toString()}-${i}`}
              className="px-4 py-3 bg-card space-y-1"
              data-ocid="treasury-withdrawal-row"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px]">
                  treasury_withdrawal
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(Number(entry.ts) / 1_000_000).toLocaleString()}
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground break-all">
                {entry.detail}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                admin: {entry.admin.toText()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminTreasuryTab() {
  const { data: balances = [], refetch, isFetching } =
    useCanisterTreasuryBalances();

  return (
    <div className="space-y-8" data-ocid="treasury-tab">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-foreground text-lg">
          Treasury
        </h2>
      </div>

      <CanisterBalancesSection
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />
      <WithdrawSection balances={balances} onSuccess={() => void refetch()} />
      <WithdrawalHistorySection />
    </div>
  );
}
