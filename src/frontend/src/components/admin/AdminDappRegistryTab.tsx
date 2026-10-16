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

type Registry = {
  dapps?: Array<{
    id: string;
    name: string;
    chain: string;
    status: string;
    budgetIcp?: number;
    notes?: string;
  }>;
  collections?: Array<{
    id: string;
    name: string;
    chain: string;
    status: string;
    htsTokenId?: string | null;
    budgetHbar?: number;
  }>;
};

async function fetchRegistry(): Promise<Registry | null> {
  const base = import.meta.env.PROD
    ? window.location.origin
    : "https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io";
  try {
    const res = await fetch(`${base}/captain-ops/dapp-registry.json`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Registry;
  } catch {
    return null;
  }
}

export function AdminDappRegistryTab() {
  const [reg, setReg] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setReg(await fetchRegistry());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Curated allowlist — edit{" "}
          <code>worker/data/dapp-registry.json</code>, run{" "}
          <code>publish-captain-ops.js</code>. Approve status before Captain spends.
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {!reg ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No registry at /captain-ops/dapp-registry.json
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ICP dapps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(reg.dapps ?? []).map((d) => (
                <div key={d.id} className="flex justify-between border-b pb-2">
                  <span>
                    {d.name} · {d.chain}
                  </span>
                  <span className="font-mono text-xs">{d.status}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hedera collections</CardTitle>
              <CardDescription>Set htsTokenId after research</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(reg.collections ?? []).map((c) => (
                <div key={c.id} className="flex justify-between border-b pb-2">
                  <span>{c.name}</span>
                  <span className="font-mono text-xs">
                    {c.status} {c.htsTokenId ?? "—"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
