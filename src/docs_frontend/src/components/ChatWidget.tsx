import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, X, Send, Bot, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDocsBackendActor, fromChatResponse, toChatMessageCandid, type ChatMessage, type ChatResult } from "@/lib/backend";

// ── Local history ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "spicyai:history";
const MAX_TURNS = 6;

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {}
  return [];
}

function saveHistory(msgs: ChatMessage[]) {
  try {
    // Keep only the last MAX_TURNS * 2 messages (user + assistant pairs).
    const trimmed = msgs.slice(-(MAX_TURNS * 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DisplayMessage {
  role: "user" | "assistant" | "error";
  content: string;
  docsReferenced?: string[];
}

// ── Chat Widget component ─────────────────────────────────────────────────────

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState(".");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load history from localStorage on first open.
  const didInit = useRef(false);
  useEffect(() => {
    if (open && !didInit.current) {
      didInit.current = true;
      const saved = loadHistory();
      setHistory(saved);
      // Convert stored history to display messages.
      setMessages(
        saved.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      );
    }
  }, [open]);

  // Scroll to bottom on new messages.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Typing-indicator animation.
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 400);
    return () => clearInterval(id);
  }, [loading]);

  // Auto-focus input when opened.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const actor = getDocsBackendActor();
    if (!actor) {
      setMessages((prev) => [
        ...prev,
        { role: "error", content: "Canister not reachable. Please try again later." },
      ]);
      return;
    }

    setInput("");
    const newHistory: ChatMessage[] = [...history, { role: "user", content: text }];
    setHistory(newHistory);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const response = await actor.askSpicyAi({
        messages: newHistory.map(toChatMessageCandid),
      });
      const result: ChatResult = fromChatResponse(response);

      if (result.ok) {
        const updatedHistory: ChatMessage[] = [
          ...newHistory,
          { role: "assistant", content: result.response },
        ];
        setHistory(updatedHistory);
        saveHistory(updatedHistory);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.response,
            docsReferenced: result.docsReferenced,
          },
        ]);
      } else {
        const err = result.error;
        let errMsg: string;
        if (err.type === "rateLimited") {
          const mins = Math.ceil(err.resetInSeconds / 60);
          errMsg = `You've reached the daily limit. Try again in about ${mins} minutes.`;
        } else if (err.type === "blocked") {
          errMsg = "That message contains a blocked phrase. Please rephrase.";
        } else {
          errMsg = "SpicyAi is momentarily unavailable. Please try again shortly.";
        }
        setMessages((prev) => [...prev, { role: "error", content: errMsg }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "error", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, history, loading]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    didInit.current = false;
  };

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
              // Glassmorphism
              "backdrop-blur-2xl bg-bg/85",
            )}
            style={{ maxHeight: "min(600px, calc(100dvh - 8rem))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold shadow-ember">
                  <Bot className="h-4 w-4 text-bg" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Spicy<span className="ember-text">Ai</span>
                  </p>
                  <p className="text-[10px] text-muted">Brand concierge · IC SPICY docs</p>
                </div>
              </div>
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                  <Flame className="h-8 w-8 text-ember/60" />
                  <p className="text-sm text-muted">
                    Ask me anything about IC SPICY — our peppers, provenance, tokens, or brand.
                  </p>
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
                      msg.role === "user" &&
                        "bg-ember text-bg rounded-br-sm",
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
                    {msg.role === "assistant" && msg.docsReferenced && msg.docsReferenced.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-muted">
                        Sources: {msg.docsReferenced.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-elevated/70 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 text-ember animate-spin" />
                      <span className="text-sm text-muted">
                        SpicyAi is thinking{dots}
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
                  placeholder="Ask about IC SPICY…"
                  rows={1}
                  disabled={loading}
                  className={cn(
                    "flex-1 resize-none rounded-xl border border-line/60 bg-elevated/40 px-3 py-2",
                    "text-sm text-ink placeholder:text-muted/60",
                    "focus:outline-none focus:ring-1 focus:ring-ember/50",
                    "min-h-[36px] max-h-[96px] overflow-auto",
                    "disabled:opacity-50",
                  )}
                  style={{
                    height: "auto",
                    minHeight: 36,
                  }}
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
                Answers grounded in IC SPICY brand documents · Zero data stored
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
