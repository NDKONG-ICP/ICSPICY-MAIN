import { Flame, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const OPEN_EVENT = "spicyai:open";
const LABEL_SESSION_KEY = "spicyai_label_shown";

const LazyChatPanel = lazy(() =>
  import("./SpicyAiChatPanel").then((m) => ({ default: m.SpicyAiChatPanel })),
);

export type SpicyAiOpenDetail = {
  prompt: string | null;
  /** When set, Fast path uses chatWithWeather with this grid. */
  weather?: { lat: number; lng: number } | null;
};

/**
 * Programmatically open the floating SpicyAI widget from anywhere in the app.
 * Optionally auto-sends a prompt (e.g. "Tell me about the FPJ recipe.").
 * Pass weather coords from /weather so answers use the on-chain brief.
 */
export function openSpicyAi(
  prompt?: string,
  opts?: { weather?: { lat: number; lng: number } },
) {
  window.dispatchEvent(
    new CustomEvent(OPEN_EVENT, {
      detail: {
        prompt: prompt ?? null,
        weather: opts?.weather ?? null,
      } satisfies SpicyAiOpenDetail,
    }),
  );
}

export function SpicyAiWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideOnGames = pathname.startsWith("/games");

  const [isOpen, setIsOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [weatherCoords, setWeatherCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<SpicyAiOpenDetail>).detail;
      if (detail?.prompt) setPendingPrompt(detail.prompt);
      setWeatherCoords(detail?.weather ?? null);
      setEverOpened(true);
      setIsOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // First visit this session: expand "SpicyAI" label for 3s, then collapse.
  useEffect(() => {
    if (hideOnGames) return;
    try {
      if (sessionStorage.getItem(LABEL_SESSION_KEY)) return;
      sessionStorage.setItem(LABEL_SESSION_KEY, "1");
    } catch {
      /* private mode */
    }
    setShowLabel(true);
    const t = window.setTimeout(() => setShowLabel(false), 3000);
    return () => window.clearTimeout(t);
  }, [hideOnGames]);

  if (hideOnGames) return null;

  const toggle = () => {
    if (!isOpen) setEverOpened(true);
    setIsOpen((v) => !v);
  };

  // Before: fixed bottom-6 right-6 (24px) — overlapped IdentityKit OISY
  //         "Connect your wallet" FAB at the same corner on mobile.
  // After:  mobile raises launcher above wallet (~88px + safe-area);
  //         desktop keeps bottom-right clear of typical wallet chrome.
  const launcherPos =
    "fixed z-50 right-4 md:right-6 " +
    "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] " +
    "md:bottom-6";

  const panelPos =
    "fixed z-50 right-4 md:right-6 " +
    "bottom-[calc(10.5rem+env(safe-area-inset-bottom,0px))] " +
    "md:bottom-24 " +
    "flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl " +
    "border border-orange-500/25 bg-zinc-950 shadow-2xl " +
    "max-sm:h-[55vh] max-sm:w-[calc(100vw-2rem)]";

  return (
    <>
      <motion.button
        type="button"
        aria-label={isOpen ? "Close SpicyAI chat" : "Open SpicyAI chat"}
        onClick={toggle}
        data-ocid="spicyai-launcher"
        className={
          launcherPos +
          " flex h-14 items-center justify-center gap-2 rounded-full " +
          "bg-gradient-to-br from-red-600 to-orange-600 text-white " +
          "shadow-[0_8px_28px_rgba(220,38,38,0.45)] " +
          "hover:from-red-500 hover:to-orange-500 " +
          (showLabel && !isOpen ? "pl-3.5 pr-4" : "w-14 px-0")
        }
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X size={22} strokeWidth={2.5} />
        ) : (
          <>
            <span className="relative flex size-8 shrink-0 items-center justify-center">
              <Flame className="size-6 text-amber-100" fill="currentColor" />
              <span
                className="absolute -right-1 -top-1 text-[11px] leading-none drop-shadow"
                aria-hidden
              >
                🌶️
              </span>
            </span>
            {showLabel && (
              <span className="font-display text-sm font-bold tracking-wide">
                SpicyAI
              </span>
            )}
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && everOpened && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={panelPos}
          >
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
                  Loading SpicyAI…
                </div>
              }
            >
              <LazyChatPanel
                onClose={() => setIsOpen(false)}
                initialPrompt={pendingPrompt}
                onInitialPromptSent={() => setPendingPrompt(null)}
                weatherCoords={weatherCoords}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
