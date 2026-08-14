import { Link } from "@tanstack/react-router";
import { BookOpen, Cpu, Loader2, Send, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useVarieties } from "../hooks/useNims";
import { useSpicyAiChat } from "../hooks/useSpicyAiChat";
import {
  matchVarietiesInText,
  pickSuggestedPrompts,
} from "../lib/spicyai-variety-match";

const WELCOME = `🌶️ Hi! I'm SpicyAI — your pepper growing assistant.

I can help with:
• Pepper varieties (Pepperpedia)
• Using IC SPICY and NIMS
• Natural farming recipes (KNF & JADAM)
• NFT and provenance questions

Ask me anything!`;

function VarietyGuideChips({
  text,
  varieties,
}: {
  text: string;
  varieties: Array<{ id: bigint; name: string }>;
}) {
  const matches = useMemo(
    () => matchVarietiesInText(text, varieties),
    [text, varieties],
  );
  if (matches.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 px-1">
      {matches.map((v) => (
        <Link
          key={v.id.toString()}
          to="/variety/$varietyId/guide"
          params={{ varietyId: v.id.toString() }}
          className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-950/40 px-2 py-0.5 text-[11px] text-red-200 transition hover:bg-red-900/50"
        >
          <BookOpen className="size-3 shrink-0" aria-hidden />
          {v.name} Growing Guide →
        </Link>
      ))}
    </div>
  );
}

export function SpicyAiChatPanel({
  onClose,
  initialPrompt,
  onInitialPromptSent,
  weatherCoords = null,
}: {
  onClose: () => void;
  initialPrompt: string | null;
  onInitialPromptSent: () => void;
  weatherCoords?: { lat: number; lng: number } | null;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: varieties = [] } = useVarieties();
  const varietyList = useMemo(
    () => varieties.map((v) => ({ id: v.id, name: v.name })),
    [varieties],
  );
  const [suggested] = useState(() => pickSuggestedPrompts(3));
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
  } = useSpicyAiChat({ weatherCoords });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sentInitialRef = useRef(false);
  useEffect(() => {
    if (initialPrompt && !sentInitialRef.current) {
      sentInitialRef.current = true;
      onInitialPromptSent();
      void handleSendText(initialPrompt);
    }
  }, [initialPrompt, onInitialPromptSent, handleSendText]);

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
          <div className="mt-2 space-y-4">
            <div className="whitespace-pre-line text-center text-sm leading-relaxed text-zinc-400">
              {WELCOME}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {suggested.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void handleSendText(prompt)}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-red-500/50 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
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
                {msg.role === "assistant" && (
                  <VarietyGuideChips text={msg.content} varieties={varietyList} />
                )}
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
          placeholder="Ask about peppers, KNF, NIMS…"
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
