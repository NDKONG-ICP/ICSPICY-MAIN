import { Cpu, Loader2, MessageCircle, Send, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useSpicyAiChat } from "../hooks/useSpicyAiChat";

const WELCOME = `🌶️ Hi! I'm SpicyAI — your pepper growing assistant.

I can help with:
• Using IC SPICY and NIMS
• Natural farming recipes (KNF & JADAM)
• Pepper growing advice
• NFT and provenance questions

Ask me anything!`;

function ChatPanel({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    messages,
    loading,
    selectedModel,
    setSelectedModel,
    onChainMode,
    thinkPhrase,
    spicyAiAvailable,
    handleSendText,
    clearHistory,
    messagesEndRef,
  } = useSpicyAiChat();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    void handleSendText(text);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 bg-red-600 p-3">
        <span className="font-semibold text-white shrink-0">🌶️ SpicyAI</span>
        <div className="flex items-center gap-1.5">
          {spicyAiAvailable && (
            <div className="flex overflow-hidden rounded-full border border-white/30 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedModel("fast")}
                className={cn(
                  "flex items-center gap-0.5 px-2 py-0.5 transition-colors",
                  selectedModel === "fast"
                    ? "bg-white text-red-700 font-medium"
                    : "text-white/80 hover:text-white",
                )}
              >
                <Zap className="size-2.5" />
                Fast
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel("deep")}
                className={cn(
                  "flex items-center gap-0.5 px-2 py-0.5 transition-colors",
                  selectedModel === "deep"
                    ? "bg-white text-red-700 font-medium"
                    : "text-white/80 hover:text-white",
                )}
              >
                <Cpu className="size-2.5" />
                Deep
              </button>
            </div>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="text-[10px] text-white/80 hover:text-white"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white"
            aria-label="Close chat panel"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-950 p-3">
        {messages.length === 0 && !loading && (
          <div className="mt-4 whitespace-pre-line text-center text-sm leading-relaxed text-zinc-400">
            {WELCOME}
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={`${i}-${msg.content.slice(0, 24)}`}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[88%]">
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    msg.role === "user" && "bg-red-600 text-white",
                    msg.role === "assistant" && "bg-zinc-800 text-zinc-100",
                    msg.role === "error" && "bg-amber-900/40 text-amber-200",
                  )}
                >
                  {msg.content}
                </div>
                {msg.docsReferenced && msg.docsReferenced.length > 0 && (
                  <p className="mt-1 px-1 text-[10px] text-zinc-500">
                    Sources: {msg.docsReferenced.join(", ")}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-zinc-800 px-3 py-2 text-sm text-zinc-400">
                <Loader2 className="size-3.5 animate-spin" />
                {onChainMode ? thinkPhrase : "Searching docs & thinking…"}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex gap-2 border-t border-white/10 bg-zinc-900 p-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask about NIMS, KNF, peppers…"
          className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </div>
    </>
  );
}

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
            className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl max-sm:right-4 max-sm:h-[60vh] max-sm:w-[calc(100vw-2rem)]"
          >
            <ChatPanel onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
