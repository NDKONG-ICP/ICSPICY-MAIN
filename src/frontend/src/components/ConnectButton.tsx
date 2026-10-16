import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

function truncatePid(p: string, head = 8, tail = 4) {
  if (p.length <= head + tail + 3) return p;
  return `${p.slice(0, head)}…${p.slice(-tail)}`;
}

export function ConnectButton({ compact = false }: { compact?: boolean }) {
  const { isAuthenticated, login, logout, principal, isInitializing } =
    useAuth();

  if (isInitializing) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="text-muted-foreground"
        data-ocid="connect-btn-loading"
      >
        …
      </Button>
    );
  }

  if (isAuthenticated && principal) {
    if (compact) {
      return (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={logout}
          title={`Signed in — ${principal.toText()}`}
          aria-label="Disconnect Internet Identity"
          data-ocid="disconnect-btn"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      );
    }
    return (
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        <span
          className="hidden sm:inline text-xs text-muted-foreground font-mono truncate max-w-[8rem]"
          title={principal.toText()}
        >
          {truncatePid(principal.toText())}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={logout}
          className="gap-1.5 shrink-0"
          data-ocid="disconnect-btn"
        >
          <LogOut className="h-3.5 w-3.5" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size={compact ? "icon" : "sm"}
      className={
        compact
          ? "h-8 w-8 shrink-0 bg-red-600 hover:bg-red-700 text-white"
          : "bg-red-600 hover:bg-red-700 text-white font-medium shrink-0"
      }
      onClick={login}
      title="Sign in with Internet Identity (Google / Apple / passkey may appear on the next screen)"
      data-ocid="connect-btn"
      aria-label="Connect with Internet Identity"
    >
      {compact ? (
        <span className="text-[10px] font-bold">II</span>
      ) : (
        <>
          Connect
          <span className="sr-only"> — Sign in with Internet Identity</span>
        </>
      )}
    </Button>
  );
}
