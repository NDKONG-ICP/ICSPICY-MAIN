import { Copy, Tag } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { plantNfcUrl } from "../../lib/plant-nfc-url";

export function NfcTagLinkModal({
  open,
  onOpenChange,
  plantId,
  plantLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantId: bigint;
  plantLabel?: string;
}) {
  const url = plantNfcUrl(plantId);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void QRCode.toDataURL(url, { margin: 1, width: 200 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [open, url]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Tag URL copied");
    } catch {
      toast.error("Could not copy URL");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-5" />
            NFC plant tag
          </DialogTitle>
          <DialogDescription>
            {plantLabel ?? `Plant #${plantId.toString()}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Plant tag QR code" className="mx-auto" />
            ) : (
              <div className="py-8 text-sm text-muted-foreground">Generating QR…</div>
            )}
          </div>

          <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">{url}</p>

          <p className="text-xs text-muted-foreground">
            Write this URL to an NFC tag (NFC215 recommended) to create a smart plant tag.
            iPhone Safari opens NFC URL records automatically; Android Chrome Web NFC write
            support is planned when tags are available for testing.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void copyUrl()}>
            <Copy className="mr-1 size-4" />
            Copy URL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
