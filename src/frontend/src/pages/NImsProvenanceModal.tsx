import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ArtworkLayer, PlantPublic } from "../backend";
import { RarityTier } from "../backend";
import { useArtworkLayers, useMintRWAProvenance } from "../hooks/useBackend";
import { containerSizeLabel, formatDate } from "./nims-utils";

interface ProvenanceModalProps {
  plant: PlantPublic;
  open: boolean;
  onClose: () => void;
}

export function ProvenanceModal({
  plant,
  open,
  onClose,
}: ProvenanceModalProps) {
  const [selectedLayer, setSelectedLayer] = useState<string>("");
  const [customNotes, setCustomNotes] = useState("");
  const [rarityTier, setRarityTier] = useState<RarityTier>(RarityTier.Common);
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);

  const { data: layers = [] } = useArtworkLayers();
  const mintMutation = useMintRWAProvenance();

  async function handleMint() {
    if (!selectedLayer) {
      toast.error("Please select an artwork layer");
      return;
    }
    try {
      const tierDiscount =
        rarityTier === RarityTier.Rare
          ? BigInt(15)
          : rarityTier === RarityTier.Uncommon
            ? BigInt(12)
            : BigInt(10);
      const tokenId = await mintMutation.mutateAsync({
        plant_id: plant.id,
        artwork_layer_id: BigInt(selectedLayer),
        custom_notes: customNotes,
        rarity_tier: tierDiscount,
      });
      setMintedTokenId(tokenId);
      toast.success("RWA NFT minted successfully!");
    } catch (_e) {
      toast.error("Minting failed. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            Assign RWA Provenance NFT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Pre-filled metadata summary */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Common Name</span>
              <span className="text-foreground font-medium">
                {plant.common_name || plant.variety}
              </span>
              <span className="text-muted-foreground">Latin Name</span>
              <span className="text-foreground">{plant.latin_name || "—"}</span>
              <span className="text-muted-foreground">Origin</span>
              <span className="text-foreground">{plant.origin || "—"}</span>
              <span className="text-muted-foreground">Date Seeded</span>
              <span className="text-foreground">
                {formatDate(plant.planting_date)}
              </span>
              <span className="text-muted-foreground">Germinated</span>
              <span className="text-foreground">
                {formatDate(plant.germination_date)}
              </span>
              <span className="text-muted-foreground">Container</span>
              <span className="text-foreground">
                {containerSizeLabel(plant.container_size)}
              </span>
            </div>
          </div>

          {/* Artwork layer selector */}
          <div className="space-y-1.5">
            <Label className="text-foreground">Artwork Layer</Label>
            {layers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No artwork layers uploaded. Upload layers in the Admin panel.
              </p>
            ) : (
              <Select value={selectedLayer} onValueChange={setSelectedLayer}>
                <SelectTrigger
                  className="bg-muted/30 border-border text-foreground"
                  data-ocid="provenance-layer-select"
                >
                  <SelectValue placeholder="Select artwork layer…" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {(layers as ArtworkLayer[]).map((layer) => (
                    <SelectItem
                      key={layer.id.toString()}
                      value={layer.id.toString()}
                    >
                      Layer {layer.layer_number.toString()} — {layer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Rarity tier selector */}
          <div className="space-y-1.5">
            <Label className="text-foreground">Rarity Tier</Label>
            <Select
              value={rarityTier}
              onValueChange={(v) => setRarityTier(v as RarityTier)}
            >
              <SelectTrigger
                className="bg-muted/30 border-border text-foreground"
                data-ocid="provenance-rarity-tier"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value={RarityTier.Common}>
                  🟢 Common — 10% storewide discount
                </SelectItem>
                <SelectItem value={RarityTier.Uncommon}>
                  🔵 Uncommon — 12% storewide discount
                </SelectItem>
                <SelectItem value={RarityTier.Rare}>
                  🟣 Rare — 15% storewide discount
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              NFT holders receive a lifetime discount at checkout based on their
              rarity tier.
            </p>
          </div>

          {/* Custom notes */}
          <div className="space-y-1.5">
            <Label className="text-foreground">Custom Metadata Notes</Label>
            <Textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Additional provenance notes to embed in the NFT metadata…"
              rows={3}
              className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground resize-none"
              data-ocid="provenance-notes"
            />
          </div>

          {/* Minted result */}
          {mintedTokenId && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm space-y-1">
              <p className="text-primary font-semibold">
                ✓ NFT Minted Successfully
              </p>
              <p className="text-muted-foreground font-mono text-xs break-all">
                Token ID: {mintedTokenId}
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border"
            >
              {mintedTokenId ? "Close" : "Cancel"}
            </Button>
            {!mintedTokenId && (
              <Button
                onClick={handleMint}
                disabled={mintMutation.isPending || !selectedLayer}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-ocid="provenance-mint-btn"
              >
                {mintMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Minting…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Mint NFT
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
