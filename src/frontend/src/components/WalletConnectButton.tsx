// WalletConnectButton.tsx
//
// Phase 4: wallet selector — user explicitly picks OISY or Plug.
// Renders a trigger button + a modal/sheet with wallet options.
// Once connected, shows the truncated principal and a disconnect action.

import { Loader2, Unplug, Wallet } from "lucide-react";
import { useState } from "react";
import { type WalletType, useWallet } from "../hooks/useWallet";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

function truncatePrincipal(p: string) {
  if (p.length <= 12) return p;
  return `${p.slice(0, 5)}…${p.slice(-5)}`;
}

interface WalletOptionProps {
  name: string;
  description: string;
  icon: string;
  onSelect: () => void;
  disabled: boolean;
}

function WalletOption({
  name,
  description,
  icon,
  onSelect,
  disabled,
}: WalletOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="flex items-center gap-4 w-full rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

interface WalletConnectButtonProps {
  /** Canisters to whitelist for Plug wallet */
  plugWhitelist?: string[];
  /** Called after successful connection */
  onConnected?: (principal: string, type: WalletType) => void;
}

export function WalletConnectButton({
  plugWhitelist = [],
  onConnected,
}: WalletConnectButtonProps) {
  const {
    isConnected,
    isConnecting,
    account,
    walletType,
    connectOISY,
    connectPlug,
    disconnect,
  } = useWallet();
  const [open, setOpen] = useState(false);

  async function handleOISY() {
    setOpen(false);
    await connectOISY();
    if (account && onConnected) onConnected(account.owner, "oisy");
  }

  async function handlePlug() {
    setOpen(false);
    await connectPlug(plugWhitelist);
    if (account && onConnected) onConnected(account.owner, "plug");
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono">
          {walletType === "oisy" ? "OISY" : "Plug"}{" "}
          {truncatePrincipal(account.owner)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="h-7 px-2 text-xs gap-1"
        >
          <Unplug className="h-3 w-3" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isConnecting}
          className="gap-2"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Choose how you want to connect. Your wallet is used to approve token
            payments for purchases.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <WalletOption
            name="OISY Wallet"
            description="Browser-based, no extension needed. Opens a secure popup."
            icon="🌐"
            onSelect={handleOISY}
            disabled={isConnecting}
          />
          <WalletOption
            name="Plug Wallet"
            description="Browser extension wallet. Install from plugwallet.ooo"
            icon="🔌"
            onSelect={handlePlug}
            disabled={isConnecting}
          />
        </div>

        <p className="text-[11px] text-muted-foreground pt-1">
          Wallet is used for ICP/ck-token payments only. Your Internet Identity
          authentication is separate.
        </p>
      </DialogContent>
    </Dialog>
  );
}
