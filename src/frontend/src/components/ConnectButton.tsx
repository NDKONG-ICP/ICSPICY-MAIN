import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

function truncatePid(p: string, head = 8, tail = 4) {
  if (p.length <= head + tail + 3) return p;
  return `${p.slice(0, head)}…${p.slice(-tail)}`;
}

export function ConnectButton() {
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
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden sm:inline text-xs text-muted-foreground font-mono"
          title={principal.toText()}
        >
          {truncatePid(principal.toText())}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={logout}
          className="gap-1.5"
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
      size="sm"
      onClick={login}
      className="bg-red-600 hover:bg-red-700 text-white font-medium"
      data-ocid="connect-btn"
    >
      Connect
    </Button>
  );
}
