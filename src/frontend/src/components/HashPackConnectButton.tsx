import { loadRuntimeEnv, walletConnectProjectId } from "@/lib/runtime-env";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useHederaWallet } from "@/providers/HederaWalletProvider";
import { Loader2 } from "lucide-react";

function truncateAccount(id: string) {
  const parts = id.split(".");
  if (parts.length >= 3) return `${parts[0]}.${parts[1]}…${parts[2]?.slice(-2) ?? ""}`;
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

export function HashPackConnectButton({ compact = false }: { compact?: boolean }) {
  const { accountId, connecting, connect, disconnect } = useHederaWallet();
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(() =>
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ?? "",
  );

  useEffect(() => {
    if (projectId) return;
    void loadRuntimeEnv().then(() => {
      const id = walletConnectProjectId();
      if (id) setProjectId(id);
    });
  }, [projectId]);

  if (!projectId) {
    return null;
  }

  if (accountId) {
    if (compact) {
      return (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={disconnect}
          title={`HashPack ${accountId} — tap to disconnect`}
          aria-label={`HashPack connected ${accountId}`}
        >
          <span className="text-[10px] font-bold leading-none">HP</span>
        </Button>
      );
    }
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={disconnect}
        className="font-mono text-xs max-w-[10rem] truncate shrink-0"
        title={accountId}
      >
        HashPack {truncateAccount(accountId)}
      </Button>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1 shrink-0">
      <Button
        type="button"
        variant="outline"
        size={compact ? "icon" : "sm"}
        className={compact ? "h-8 w-8 shrink-0" : undefined}
        disabled={connecting}
        title={error ?? "Open HashPack"}
        aria-label="Connect HashPack"
        onClick={() => {
          setError(null);
          void connect().catch((err: unknown) => {
            setError(err instanceof Error ? err.message : "Could not open HashPack");
          });
        }}
      >
        {connecting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : compact ? (
          <span className="text-[10px] font-bold">HP</span>
        ) : (
          "HashPack"
        )}
      </Button>
      {error ? (
        <span className="max-w-[14rem] text-right text-[10px] leading-tight text-red-400">
          {error}
        </span>
      ) : null}
    </span>
  );
}
