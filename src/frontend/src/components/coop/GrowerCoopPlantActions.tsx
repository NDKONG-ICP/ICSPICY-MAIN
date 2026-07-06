import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { PlantLifecycle } from "@/hooks/useNims";
import {
  useGenerateCoopClaimToken,
  useMintGrowerProvenanceToken,
} from "@/hooks/useBackend";
import { useCoopStatus } from "@/hooks/useCoopStatus";
import {
  buildAgriitraceExport,
  downloadAgriitraceJson,
} from "@/lib/agriitrace-export";

const CLAIM_BASE = "https://www.icspicy.app/claim";

type Props = {
  plantId: bigint;
  lifecycle: PlantLifecycle;
  isOwner: boolean;
};

function qrPayload(claimToken: string) {
  return `${CLAIM_BASE}/${claimToken}`;
}

export function GrowerCoopPlantActions({ plantId, lifecycle, isOwner }: Props) {
  const { isSeatHolder, growerName, status } = useCoopStatus();
  const mint = useMintGrowerProvenanceToken();
  const genClaim = useGenerateCoopClaimToken();
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  const tokenId = lifecycle.nftTokenId.length === 1 ? lifecycle.nftTokenId[0] : null;
  const stage = lifecycle.plant.stage;
  const isGerminated =
    "Seedling" in stage || "Mature" in stage;

  const claimUrl = useMemo(
    () => (claimToken ? qrPayload(claimToken) : null),
    [claimToken],
  );

  useEffect(() => {
    if (!claimUrl) {
      setQrSrc(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(claimUrl, { width: 200, margin: 1 }).then((url) => {
      if (!cancelled) setQrSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [claimUrl]);

  if (!isSeatHolder || !isOwner) return null;

  const handleMint = async () => {
    try {
      const result = await mint.mutateAsync(plantId);
      toast.success(
        result.tokenId?.[0] != null
          ? `Provenance NFT #${result.tokenId[0].toString()} minted`
          : "Provenance NFT minted",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mint failed");
    }
  };

  const handleClaim = async () => {
    try {
      const token = await genClaim.mutateAsync(plantId);
      setClaimToken(token);
      setClaimOpen(true);
      toast.success("Customer claim QR ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate claim");
    }
  };

  const handleExport = () => {
    const name = growerName ?? "IC SPICY Grower";
    const location =
      status?.seat.growerLocation.length === 1
        ? status.seat.growerLocation[0]
        : undefined;
    const license =
      status?.seat.licenseInfo.length === 1 ? status.seat.licenseInfo[0] : undefined;
    const data = buildAgriitraceExport(lifecycle, { name, location, license });
    downloadAgriitraceJson(
      data,
      `provenance-${lifecycle.plant.variety.replace(/\s+/g, "-").toLowerCase()}-${plantId.toString()}.json`,
    );
    toast.success("Provenance JSON downloaded");
  };

  return (
    <div
      className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3"
      data-ocid="grower-coop-plant-actions"
    >
      <p className="text-sm font-semibold text-emerald-300">🌱 Co-op Grower tools</p>
      <div className="flex flex-wrap gap-2">
        {tokenId == null && isGerminated && (
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-600/50 text-emerald-300"
            disabled={mint.isPending}
            onClick={() => void handleMint()}
            data-ocid="mint-grower-provenance-btn"
          >
            {mint.isPending ? "Minting…" : "Mint Provenance NFT"}
          </Button>
        )}
        {tokenId != null && (
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-600/50 text-emerald-300"
            disabled={genClaim.isPending}
            onClick={() => void handleClaim()}
            data-ocid="generate-coop-claim-btn"
          >
            {genClaim.isPending ? "Generating…" : "Generate customer QR claim"}
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={handleExport}
          data-ocid="export-agriitrace-btn"
        >
          Export provenance (agriiTrace-compatible)
        </Button>
      </div>

      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Customer claim QR</DialogTitle>
          </DialogHeader>
          {qrSrc && claimUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img src={qrSrc} alt="Claim QR code" className="rounded-lg" />
              <div className="w-full space-y-1">
                <Label className="text-xs">Claim link</Label>
                <Input readOnly value={claimUrl} className="text-xs" />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
