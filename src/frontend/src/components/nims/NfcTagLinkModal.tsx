import { Copy, Loader2, Radio, Tag } from "lucide-react";
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
import { webNfcSupported, writePlantUrlToNfcTag } from "../../lib/web-nfc";

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
  const url = plantNfcUrl(plantId, { trackNfc: true });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const canWriteNfc = webNfcSupported();

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

  const writeTag = async () => {
    setWriting(true);
    try {
      await writePlantUrlToNfcTag(url);
      toast.success("NFC tag programmed — hold it on the pot!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "NFC write failed");
    } finally {
      setWriting(false);
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
              <img
                src={qrDataUrl}
                alt="Plant tag QR code"
                className="mx-auto"
              />
            ) : (
              <div className="py-8 text-sm text-muted-foreground">
                Generating QR…
              </div>
            )}
          </div>

          <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">
            {url}
          </p>

          {canWriteNfc ? (
            <Button
              type="button"
              className="w-full"
              disabled={writing}
              onClick={() => void writeTag()}
            >
              {writing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Hold phone to blank NTAG215…
                </>
              ) : (
                <>
                  <Radio className="mr-2 size-4" />
                  Write to NFC tag (Android)
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">iPhone / desktop</p>
              <p>
                Copy the URL, open{" "}
                <a
                  href="https://apps.apple.com/app/nfc-tools/id1252962749"
                  className="text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  NFC Tools
                </a>
                , paste as a URL record, and write to your NTAG215 sticker (~10
                sec per tag).
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            NTAG215 stickers store this URL. Anyone who taps the tag sees the
            plant&apos;s NFT, lifecycle, and weather provenance — buyers can
            request claim after purchase.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
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
