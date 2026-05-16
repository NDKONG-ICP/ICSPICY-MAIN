import { SUGGESTED_QUESTIONS, useSpicyChat } from "@/hooks/useSpicyChat";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bot,
  Cpu,
  Flame,
  Loader2,
  Send,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
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

  // Auto-focus input when opened.
  const prevOpen = useRef(false);
  if (open !== prevOpen.current) {
    prevOpen.current = open;
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }

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

  const subtitle = spicyAiAvailable
    ? selectedModel === "fast"
      ? "Llama 4 Scout · Fast · IC SPICY docs"
      : "DeepSeek-R1 · Deep thinking · IC SPICY docs"
    : "Brand concierge · IC SPICY docs";

  return (
    <>
      {/* Floating bubble */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open SpicyAi chat"
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg",
          "bg-gradient-to-br from-ember via-ember to-gold",
          "transition-shadow hover:shadow-ember",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        )}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {open ? (
          <X className="h-5 w-5 text-bg" strokeWidth={2.5} />
        ) : (
          <Flame className="h-6 w-6 text-bg" strokeWidth={2} />
        )}
      </motion.button>

      {/* Chat drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-drawer"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className={cn(
              "fixed bottom-24 right-6 z-50 flex w-[min(400px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl",
              "border border-line/60 shadow-2xl",
              "backdrop-blur-2xl bg-surface/90",
            )}
            style={{ maxHeight: "min(600px, calc(100dvh - 8rem))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold shadow-ember">
                  {spicyAiAvailable ? (
                    <Cpu className="h-4 w-4 text-bg" strokeWidth={2} />
                  ) : (
                    <Bot className="h-4 w-4 text-bg" strokeWidth={2} />
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Spicy<span className="ember-text">Ai</span>
                    {spicyAiAvailable && (
                      <span className="ml-1.5 text-[10px] font-normal text-muted bg-ember/10 border border-ember/20 rounded px-1 py-0.5">
                        on-chain
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted">{subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
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
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-[10px] text-muted hover:text-ink transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col items-center gap-1.5 text-center pt-2">
                    <Flame className="h-7 w-7 text-ember/60" />
                    <p className="text-xs text-muted">
                      {spicyAiAvailable
                        ? selectedModel === "fast"
                          ? "Tap a topic for an instant answer, or ask anything — Llama 4 responds in seconds."
                          : "Tap a topic for an instant answer, or ask anything — DeepSeek thinks deeply on-chain (~10 min)."
                        : "Tap a topic for an instant answer, or ask anything about IC SPICY."}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {[
                      SUGGESTED_QUESTIONS.slice(0, 5),
                      SUGGESTED_QUESTIONS.slice(5),
                    ].map((row, rowIdx) => (
                      <div
                        key={rowIdx}
                        className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
                      >
                        {row.map((sq) => (
                          <button
                            key={sq.question}
                            type="button"
                            onClick={() => handleSendText(sq.question)}
                            className={cn(
                              "flex-shrink-0 rounded-full border border-ember/30 bg-ember/5",
                              "px-2.5 py-1 text-[11px] text-ember/80 hover:bg-ember/10 hover:border-ember/50",
                              "transition-colors whitespace-nowrap",
                            )}
                          >
                            {sq.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user" && "bg-ember text-bg rounded-br-sm",
                      msg.role === "assistant" &&
                        "bg-elevated/70 text-ink rounded-bl-sm",
                      msg.role === "error" &&
                        "bg-red-500/10 text-red-400 border border-red-500/20 rounded-bl-sm flex items-start gap-2",
                    )}
                  >
                    {msg.role === "error" && (
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                    {msg.role === "assistant" &&
                      msg.docsReferenced &&
                      msg.docsReferenced.length > 0 && (
                        <p className="mt-1.5 text-[10px] text-muted">
                          Sources: {msg.docsReferenced.join(", ")}
                        </p>
                      )}
                    {msg.role === "assistant" && msg.onChain && (
                      <p className="mt-1 text-[10px] text-ember/60 flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        Generated on-chain · DeepSeek-R1
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading &&
                onChainMode &&
                !messages.some(
                  (m) => m.role === "assistant" && m.content !== "…",
                ) && (
                  <div className="flex justify-start">
                    <div className="bg-elevated/70 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5 text-ember animate-pulse" />
                          <span className="text-sm text-muted">
                            {thinkPhrase}…
                          </span>
                        </div>
                        <div className="text-[10px] text-muted/60">
                          {thinkSecs}s · Loading context · DeepSeek-R1 · ICP
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              {loading && !onChainMode && (
                <div className="flex justify-start">
                  <div className="bg-elevated/70 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 text-ember animate-spin" />
                      <span className="text-sm text-muted">
                        SpicyAi is thinking…
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-line/60 px-3 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={
                    spicyAiAvailable
                      ? "Ask about KNF, JADAM, peppers, IC SPICY…"
                      : "Ask about IC SPICY…"
                  }
                  rows={1}
                  disabled={loading}
                  className={cn(
                    "flex-1 resize-none rounded-xl border border-line/60 bg-elevated/40 px-3 py-2",
                    "text-sm text-ink placeholder:text-muted/60",
                    "focus:outline-none focus:ring-1 focus:ring-ember/50",
                    "min-h-[36px] max-h-[96px] overflow-auto",
                    "disabled:opacity-50",
                  )}
                  style={{ height: "auto", minHeight: 36 }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
                  }}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                    "bg-gradient-to-br from-ember to-gold text-bg shadow-ember",
                    "transition-opacity disabled:opacity-40",
                    "hover:opacity-90 active:scale-95",
                  )}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-muted/60 text-center">
                {spicyAiAvailable
                  ? selectedModel === "fast"
                    ? "Llama 4 Scout via mo:llm · Fully on-chain on ICP · Zero data stored"
                    : "DeepSeek-R1 · Fully on-chain on ICP · Zero data stored"
                  : "Answers grounded in IC SPICY brand documents · Zero data stored"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
