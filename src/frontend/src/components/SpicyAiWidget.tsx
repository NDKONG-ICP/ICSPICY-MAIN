import { MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { lazy, Suspense, useEffect, useState } from "react";

const OPEN_EVENT = "spicyai:open";

const LazyChatPanel = lazy(() =>
  import("./SpicyAiChatPanel").then((m) => ({ default: m.SpicyAiChatPanel })),
);

/**
 * Programmatically open the floating SpicyAI widget from anywhere in the app.
 * Optionally auto-sends a prompt (e.g. "Tell me about the FPJ recipe.").
 */
export function openSpicyAi(prompt?: string) {
  window.dispatchEvent(
    new CustomEvent(OPEN_EVENT, { detail: { prompt: prompt ?? null } }),
  );
}

export function SpicyAiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const prompt = (e as CustomEvent<{ prompt: string | null }>).detail
        ?.prompt;
      if (prompt) setPendingPrompt(prompt);
      setEverOpened(true);
      setIsOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const toggle = () => {
    if (!isOpen) setEverOpened(true);
    setIsOpen((v) => !v);
  };

  return (
    <>
      <motion.button
        type="button"
        aria-label={isOpen ? "Close SpicyAI chat" : "Open SpicyAI chat"}
        onClick={toggle}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && everOpened && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl max-sm:right-4 max-sm:h-[60vh] max-sm:w-[calc(100vw-2rem)]"
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
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
