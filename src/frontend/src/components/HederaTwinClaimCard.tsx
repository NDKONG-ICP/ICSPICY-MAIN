import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useHederaWallet } from "@/providers/HederaWalletProvider";
import { Copy } from "lucide-react";
import { toast } from "sonner";

/**
 * Link Hedera HTS ownership to an ICP principal via 0-HBAR memo transfer.
 */
export function HederaTwinClaimCard() {
  const { principal, isAuthenticated } = useAuth();
  const { accountId: hashpackAccount } = useHederaWallet();

  if (!isAuthenticated || !principal) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Sign in with Internet Identity to claim your ICP display twin.
        </CardContent>
      </Card>
    );
  }

  const memo = `icspicy:${principal.toText()}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Claim ICP display twin</CardTitle>
        <CardDescription>
          Own an HTS NFT from the Hedera drop? Send a <strong>0 HBAR</strong> transfer from
          HashPack with this memo (worker syncs every ~10 min). Twins are soulbound on ICP —
          visible in OISY / Canopy, not tradable on ICP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Your ICP principal</p>
          <p className="font-mono text-xs break-all">{principal.toText()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Memo (plain)</p>
          <p className="font-mono text-xs break-all">{memo}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              void navigator.clipboard.writeText(memo);
              toast.success("Memo copied");
            }}
          >
            <Copy className="w-3.5 h-3.5 mr-1" /> Copy memo
          </Button>
        </div>
        {hashpackAccount ? (
          <p className="text-xs text-muted-foreground">
            HashPack connected: {hashpackAccount}. Send 0 HBAR to Captain&apos;s Hedera account
            with the memo above.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Connect HashPack in the header to send the linking transfer.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          OISY: add custom ICRC-7 collection canister <code>ghxmp-xiaaa-aaaao-ba4sq-cai</code>.
        </p>
      </CardContent>
    </Card>
  );
}
