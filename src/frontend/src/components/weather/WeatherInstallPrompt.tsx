import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function WeatherInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[900] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-[var(--wd-citrus)]/40 bg-[#1a1510]/95 p-4 shadow-2xl backdrop-blur-md sm:left-auto">
      <Download className="size-6 shrink-0 text-[var(--wd-citrus)]" />
      <div className="flex-1">
        <p className="font-display text-sm font-bold text-white">
          Add IC SPICY Weather
        </p>
        <p className="text-xs text-white/70">
          Save to your homescreen for hurricane-season alerts.
        </p>
      </div>
      <button
        type="button"
        className="rounded-md bg-[var(--wd-citrus)] px-3 py-2 text-xs font-bold text-[#1a1510]"
        onClick={() => {
          void deferred.prompt().then(() => setDismissed(true));
        }}
      >
        Install
      </button>
      <button
        type="button"
        className="text-xs text-white/50 hover:text-white"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
