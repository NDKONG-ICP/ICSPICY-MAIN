import { SUGGESTED_QUESTIONS, useSpicyChat } from "@/hooks/useSpicyChat";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Cpu,
  Flame,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";

// 2×2 card layout for the empty state prompt grid
const PROMPT_CARDS = [
  {
    label: "What is IC SPICY?",
    question: "What is IC SPICY?",
    description: "The RWA platform, rare peppers, and provenance model",
  },
  {
    label: "Whitepaper",
    question: "Tell me about the IC SPICY whitepaper",
    description: "Architecture, NFTs, tokenomics, and the full brief",
  },
  {
    label: "NFT & Token",
    question: "What is the IC SPICY NFT utility?",
    description: "8,888 ICRC-7 NFTs, rarity tiers, and SPICY burn-redeem",
  },
  {
    label: "Grow System",
    question: "What is Korean Natural Farming?",
    description: "KNF, JADAM, and regenerative pepper cultivation",
  },
];

export function ChatPage() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    loading,
    selectedModel,
    setSelectedModel,
    onChainMode,
    thinkPhrase,
    thinkSecs,
    spicyAiAvailable,
    handleSendText,
    clearHistory,
    messagesEndRef,
  } = useSpicyChat();

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    handleSendText(text);
  }, [input, handleSendText]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 4rem)" }}>
      {/* ── Hero strip ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!hasMessages && (
          <motion.section
            key="hero"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden border-b border-line/40"
          >
            {/* Background ember glow */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute inset-0 bg-bg" />
              <div className="absolute -top-24 left-1/2 h-[40vh] w-[70vw] -translate-x-1/2 rounded-full bg-ember/15 blur-[100px]" />
              <div className="absolute top-0 right-0 h-[30vh] w-[40vw] rounded-full bg-gold/10 blur-[80px]" />
            </div>

            <div className="container py-12 sm:py-16">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex items-center gap-2 mb-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold shadow-ember">
                  <Flame className="h-5 w-5 text-bg" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Spicy<span className="ember-text">Ai</span>
                    {spicyAiAvailable && (
                      <span className="ml-2 text-[10px] font-normal text-muted bg-ember/10 border border-ember/20 rounded px-1.5 py-0.5">
                        on-chain
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted">
                    {spicyAiAvailable
                      ? selectedModel === "fast"
                        ? "Llama 4 Scout via mo:llm · Internet Computer"
                        : "DeepSeek-R1 · Fully on-chain on ICP"
                      : "Grounded in IC SPICY brand documents"}
                  </p>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15 }}
                className="display text-4xl font-semibold tracking-tight text-ink sm:text-5xl max-w-2xl"
              >
                Have questions?{" "}
                <span className="shimmer-text">SpicyAI knows everything.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22 }}
                className="mt-4 max-w-xl text-base text-muted leading-relaxed"
              >
                Ask anything about IC SPICY — peppers, provenance, NFTs,
                tokenomics, natural farming, or the roadmap. Choose a topic
                below or type your own question.
              </motion.p>

              {/* Model toggle */}
              {spicyAiAvailable && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.28 }}
                  className="mt-6 flex items-center gap-2"
                >
                  <span className="text-xs text-muted">Model:</span>
                  <div className="flex rounded-full border border-line/60 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedModel("fast")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 transition-colors",
                        selectedModel === "fast"
                          ? "bg-ember text-bg font-medium"
                          : "text-muted hover:text-ink",
                      )}
                    >
                      <Zap className="h-3 w-3" />
                      Fast · Llama 4
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModel("deep")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 transition-colors",
                        selectedModel === "deep"
                          ? "bg-ember text-bg font-medium"
                          : "text-muted hover:text-ink",
                      )}
                    >
                      <Cpu className="h-3 w-3" />
                      Deep · DeepSeek-R1
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Prompt cards — 2×2 grid */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-2xl"
              >
                {PROMPT_CARDS.map((card) => (
                  <button
                    key={card.question}
                    type="button"
                    onClick={() => handleSendText(card.question)}
                    className={cn(
                      "group text-left rounded-xl border border-line/60 bg-surface/60 px-4 py-3.5",
                      "backdrop-blur-md transition-all duration-200",
                      "hover:border-ember/50 hover:bg-elevated/60",
                    )}
                  >
                    <p className="text-sm font-medium text-ink group-hover:text-ember transition-colors">
                      {card.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted leading-relaxed">
                      {card.description}
                    </p>
                  </button>
                ))}
              </motion.div>

              {/* Chip row for more topics */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="mt-4 flex flex-wrap gap-1.5 max-w-2xl"
              >
                {SUGGESTED_QUESTIONS.slice(4).map((sq) => (
                  <button
                    key={sq.question}
                    type="button"
                    onClick={() => handleSendText(sq.question)}
                    className={cn(
                      "rounded-full border border-line/50 bg-elevated/30 px-2.5 py-1",
                      "text-[11px] text-muted hover:border-ember/40 hover:text-ink",
                      "transition-colors whitespace-nowrap",
                    )}
                  >
                    {sq.label}
                  </button>
                ))}
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Transcript ─────────────────────────────────────────────────────── */}
      {hasMessages && (
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-3xl py-8 space-y-4">
            {/* Header row when chat is active */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold">
                  <Flame className="h-3.5 w-3.5 text-bg" strokeWidth={2} />
                </span>
                <span className="text-sm font-medium text-ink">
                  Spicy<span className="ember-text">Ai</span>
                </span>
                {spicyAiAvailable && (
                  <div className="flex rounded-full border border-line/60 overflow-hidden text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedModel("fast")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 transition-colors",
                        selectedModel === "fast"
                          ? "bg-ember text-bg font-medium"
                          : "text-muted hover:text-ink",
                      )}
                    >
                      <Zap className="h-2.5 w-2.5" />
                      Fast
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModel("deep")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 transition-colors",
                        selectedModel === "deep"
                          ? "bg-ember text-bg font-medium"
                          : "text-muted hover:text-ink",
                      )}
                    >
                      <Cpu className="h-2.5 w-2.5" />
                      Deep
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearHistory}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                New chat
              </button>
            </div>

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar */}
                {msg.role !== "user" && (
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold">
                      {msg.role === "error" ? (
                        <AlertCircle className="h-3.5 w-3.5 text-bg" />
                      ) : (
                        <Flame
                          className="h-3.5 w-3.5 text-bg"
                          strokeWidth={2}
                        />
                      )}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user" &&
                      "bg-ember text-bg rounded-tr-sm ml-auto",
                    msg.role === "assistant" &&
                      "bg-elevated/60 text-ink rounded-tl-sm border border-line/40",
                    msg.role === "error" &&
                      "bg-red-500/10 text-red-400 border border-red-500/20 rounded-tl-sm",
                  )}
                >
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                  {msg.role === "assistant" &&
                    msg.docsReferenced &&
                    msg.docsReferenced.length > 0 && (
                      <p className="mt-2 text-[10px] text-muted/80 border-t border-line/30 pt-2">
                        Sources: {msg.docsReferenced.join(", ")}
                      </p>
                    )}
                  {msg.role === "assistant" && msg.onChain && (
                    <p className="mt-1.5 text-[10px] text-ember/60 flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      Generated on-chain · DeepSeek-R1
                    </p>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Loading states */}
            {loading &&
              onChainMode &&
              !messages.some(
                (m) => m.role === "assistant" && m.content !== "…",
              ) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold mt-0.5">
                    <Flame className="h-3.5 w-3.5 text-bg" strokeWidth={2} />
                  </span>
                  <div className="bg-elevated/60 rounded-2xl rounded-tl-sm border border-line/40 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-ember animate-pulse" />
                      <span className="text-sm text-muted">{thinkPhrase}…</span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted/60">
                      {thinkSecs}s · DeepSeek-R1 · ICP
                    </div>
                  </div>
                </motion.div>
              )}
            {loading && !onChainMode && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold mt-0.5">
                  <Flame className="h-3.5 w-3.5 text-bg" strokeWidth={2} />
                </span>
                <div className="bg-elevated/60 rounded-2xl rounded-tl-sm border border-line/40 px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-ember animate-spin" />
                  <span className="text-sm text-muted">
                    SpicyAi is thinking…
                  </span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ── Sticky input bar ──────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 border-t border-line/40 bg-bg/95 backdrop-blur-xl">
        <div className="container max-w-3xl py-4">
          <div className="flex items-end gap-3">
            {!hasMessages && (
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold shadow-ember">
                <MessageSquare className="h-4 w-4 text-bg" strokeWidth={2} />
              </span>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                spicyAiAvailable
                  ? "Ask about KNF, JADAM, peppers, NFTs, tokenomics… (Enter to send)"
                  : "Ask anything about IC SPICY… (Enter to send)"
              }
              rows={1}
              disabled={loading}
              className={cn(
                "flex-1 resize-none rounded-xl border border-line/60 bg-elevated/40 px-4 py-2.5",
                "text-sm text-ink placeholder:text-muted/50",
                "focus:outline-none focus:ring-1 focus:ring-ember/50",
                "min-h-[44px] max-h-[120px] overflow-auto",
                "disabled:opacity-50",
              )}
              style={{ height: "auto", minHeight: 44 }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={cn(
                "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl",
                "bg-gradient-to-br from-ember to-gold text-bg shadow-ember",
                "transition-all disabled:opacity-40",
                "hover:opacity-90 active:scale-95",
              )}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <p className="mt-2 text-[10px] text-muted/50 text-center">
            {spicyAiAvailable
              ? selectedModel === "fast"
                ? "Llama 4 Scout via mo:llm · Fully on-chain · Zero data stored"
                : "DeepSeek-R1 · Fully on-chain on ICP · Zero data stored"
              : "Answers grounded in IC SPICY brand documents · Zero data stored"}
          </p>
        </div>
      </div>
    </div>
  );
}
