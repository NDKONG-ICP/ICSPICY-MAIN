/**
 * OisyConnectButton — OISY wallet connect/disconnect UI.
 *
 * Labeled distinctly from the II ConnectButton to avoid confusion.
 * Does NOT affect Internet Identity login.
 */

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useOisyWallet } from "../providers/OisyWalletProvider";

interface OisyConnectButtonProps {
  /** Override button label when disconnected. Defaults to "Connect OISY Wallet". */
  label?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
}

export function OisyConnectButton({
  label = "Connect OISY Wallet",
  size = "default",
  variant = "outline",
  className,
}: OisyConnectButtonProps) {
  const {
    isOisyConnected,
    isOisyInitializing,
    oisyAccount,
    connectOisy,
    disconnectOisy,
  } = useOisyWallet();

  if (isOisyInitializing) {
    return (
      <Button size={size} variant={variant} disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Connecting…
      </Button>
    );
  }

  if (isOisyConnected && oisyAccount) {
    return (
      <Button
        size={size}
        variant={variant}
        onClick={() => void disconnectOisy()}
        className={className}
        data-ocid="oisy-disconnect-btn"
        title="Disconnect OISY wallet"
      >
        <span className="flex items-center gap-2">
          <OisyIcon />
          <span className="font-mono text-xs">{oisyAccount}</span>
        </span>
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={() => void connectOisy()}
      className={className}
      data-ocid="oisy-connect-btn"
    >
      <OisyIcon />
      {label}
    </Button>
  );
}

function OisyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 mr-1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
