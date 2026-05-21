import { MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const CHATBOT_URL = "https://pr3bu-6aaaa-aaaao-ba5ba-cai.icp0.io/";

export function SpicyAiWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        aria-label={isOpen ? "Close SpicyAI chat" : "Open SpicyAI chat"}
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 h-[520px] w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl max-sm:right-4 max-sm:h-[60vh] max-sm:w-[calc(100vw-2rem)]"
          >
            <div className="flex items-center justify-between bg-red-600 p-3">
              <span className="font-semibold text-white">🌶️ SpicyAI</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white"
                aria-label="Close chat panel"
              >
                <X size={18} />
              </button>
            </div>
            <iframe
              src={CHATBOT_URL}
              className="h-[calc(100%-48px)] w-full border-0"
              title="SpicyAI Assistant"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
