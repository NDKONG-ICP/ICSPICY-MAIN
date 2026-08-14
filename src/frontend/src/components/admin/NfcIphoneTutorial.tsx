import { ExternalLink, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { webNfcSupported } from "@/lib/web-nfc";

export const NFC_IPHONE_TUTORIAL_DISMISS_KEY = "nims-nfc-iphone-tutorial-dismissed";

const NFC_TOOLS_URL = "https://apps.apple.com/app/nfc-tools/id1252962749";

export const IPHONE_NFC_STEPS = [
  "Copy the plant URL from this screen (Copy URL button).",
  "Open the NFC Tools app on your iPhone (install once from the App Store).",
  "Tap Write → Add a record → URL.",
  "Paste the IC SPICY plant link and tap OK.",
  "Hold your iPhone near a blank NTAG215 sticker until it writes (~3 sec).",
  "Peel and stick the tag on the pot — tap-to-open works in Safari.",
] as const;

export function isIphoneNfcHandoffDevice(): boolean {
  return !webNfcSupported();
}

export function NfcIphoneProgramChecklist({ compact }: { compact?: boolean }) {
  if (!isIphoneNfcHandoffDevice()) return null;

  return (
    <ol
      className={
        compact
          ? "list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground"
          : "list-decimal space-y-2 pl-5 text-sm text-muted-foreground"
      }
      data-ocid="nfc-iphone-checklist"
    >
      {IPHONE_NFC_STEPS.map((line) => (
        <li key={line}>{line}</li>
      ))}
      <li>
        <a
          href={NFC_TOOLS_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
        >
          Get NFC Tools (free)
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </li>
    </ol>
  );
}

export function NfcIphoneTutorialDialog({
  open,
  onOpenChange,
  onDismiss,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  function close() {
    if (dontShowAgain) {
      try {
        localStorage.setItem(NFC_IPHONE_TUTORIAL_DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
      onDismiss?.();
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-ocid="nfc-iphone-tutorial">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-primary" />
            Program tags on iPhone
          </DialogTitle>
          <DialogDescription>
            Safari can&apos;t write NFC stickers directly — use NFC Tools once
            per tag (~10 seconds). Reading tags works natively after you
            program them.
          </DialogDescription>
        </DialogHeader>

        <NfcIphoneProgramChecklist />

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="rounded border-border"
          />
          Don&apos;t show this again
        </label>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" asChild>
            <a href={NFC_TOOLS_URL} target="_blank" rel="noreferrer">
              Open NFC Tools in App Store
            </a>
          </Button>
          <Button type="button" onClick={close}>
            Got it — start assigning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** First visit to Assign NFC on iPhone — show tutorial unless dismissed. */
export function useNfcIphoneTutorialGate() {
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    if (!isIphoneNfcHandoffDevice()) return;
    const force =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("tutorial") === "1";
    if (force) {
      setTutorialOpen(true);
      return;
    }
    try {
      if (localStorage.getItem(NFC_IPHONE_TUTORIAL_DISMISS_KEY) === "1") return;
    } catch {
      /* show tutorial if storage blocked */
    }
    setTutorialOpen(true);
  }, []);

  return {
    tutorialOpen,
    setTutorialOpen,
    showTutorialAgain: () => setTutorialOpen(true),
  };
}

export function nextPlantNfcReminder() {
  if (!isIphoneNfcHandoffDevice()) return;
  return {
    title: "Next plant — open NFC Tools again",
    description:
      "Copy the new URL, write it to a fresh NTAG215 sticker, then stick on the pot.",
    duration: 8000,
  };
}
