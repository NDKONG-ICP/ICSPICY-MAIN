import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type SpendSummary = {
  month: string;
  spentHbar: number;
  spentIcp: number;
  caps: { hbar: number; icp: number };
  purchaseCaps: { hbar: number; icp: number };
  entries: Array<{
    at: string;
    asset: string;
    amount: number;
    purpose: string;
    txId?: string;
  }>;
};

async function fetchSpendSummary(): Promise<SpendSummary | null> {
  const base = import.meta.env.PROD
    ? window.location.origin
    : "https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io";
  try {
    const res = await fetch(`${base}/captain-ops/spend-summary.json`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SpendSummary;
  } catch {
    return null;
  }
}

export function AdminCaptainSpendTab() {
  const [data, setData] = useState<SpendSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setData(await fetchSpendSummary());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Caps: 1000 HBAR + 20 ICP / month (worker spend-ledger). Run{" "}
          <code>publish-captain-ops.js</code> after spends to refresh.
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {!data ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No spend summary published yet at /captain-ops/spend-summary.json
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>HBAR ({data.month})</CardDescription>
                <CardTitle>
                  {data.spentHbar.toFixed(2)} / {data.caps.hbar}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>ICP ({data.month})</CardDescription>
                <CardTitle>
                  {data.spentIcp.toFixed(2)} / {data.caps.icp}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent spends</CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono space-y-1 max-h-80 overflow-auto">
              {data.entries
                .slice()
                .reverse()
                .map((e, i) => (
                  <div key={`${e.at}-${i}`}>
                    {e.at} · {e.asset} {e.amount} · {e.purpose}
                  </div>
                ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
