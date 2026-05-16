import {
  type ChatMessage,
  type ChatResult,
  type ChatbotConfig,
  fromChatResponse,
  fromChatbotConfig,
  getAuthenticatedActor,
  getDocsBackendActor,
  toChatMessageCandid,
  toChatbotConfigCandid,
} from "@/lib/backend";
import type { DocsBackendActor } from "@/lib/idl";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Send,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; msg: string }
  | { type: "error"; msg: string };

const PERSONA_OPTIONS: {
  value: ChatbotConfig["persona"];
  label: string;
  desc: string;
}[] = [
  {
    value: "charming",
    label: "Charming Concierge",
    desc: "Fiery, warm, witty. The IC SPICY brand voice.",
  },
  {
    value: "spec",
    label: "Plain Spec",
    desc: "Precise and factual. Bullet points over prose.",
  },
  {
    value: "founder",
    label: "Founder Voice",
    desc: "Personal, passionate, first-person 'we'.",
  },
  {
    value: "gardener",
    label: "Master Gardener",
    desc: "KNF & JADAM expert — natural farming recipes, soil biology, Florida pepper growing.",
  },
];

// Approx token count (GPT-style: ~4 chars per token).
function approxTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function AdminChatbotPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [newPhrase, setNewPhrase] = useState("");
  const actorRef = useRef<DocsBackendActor | null>(null);

  // Test conversation.
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const testEndRef = useRef<HTMLDivElement>(null);

  const getActor = useCallback(async () => {
    if (!actorRef.current) {
      actorRef.current = await getAuthenticatedActor();
    }
    return actorRef.current;
  }, []);

  useEffect(() => {
    (async () => {
      const actor = getDocsBackendActor();
      if (!actor) {
        navigate("/admin/login");
        return;
      }
      try {
        const cfg = await actor.getChatbotConfig();
        setConfig(fromChatbotConfig(cfg));
      } catch (e) {
        setStatus({ type: "error", msg: String(e) });
      }
    })();
  }, [navigate]);

  useEffect(() => {
    testEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [testMessages, testLoading]);

  const save = async () => {
    if (!config) return;
    const actor = await getActor();
    if (!actor) {
      navigate("/admin/login");
      return;
    }
    setStatus({ type: "loading" });
    try {
      await actor.setChatbotConfig(toChatbotConfigCandid(config));
      setStatus({ type: "success", msg: "Config saved." });
      setTimeout(() => setStatus({ type: "idle" }), 2500);
    } catch (e) {
      setStatus({ type: "error", msg: String(e) });
    }
  };

  const sendTest = async () => {
    const text = testInput.trim();
    if (!text || testLoading) return;
    const actor = getDocsBackendActor();
    if (!actor) return;

    const newMsgs: ChatMessage[] = [
      ...testMessages,
      { role: "user", content: text },
    ];
    setTestMessages(newMsgs);
    setTestInput("");
    setTestLoading(true);
    try {
      const resp = await actor.askSpicyAi({
        messages: newMsgs.map(toChatMessageCandid),
      });
      const result: ChatResult = fromChatResponse(resp);
      if (result.ok) {
        setTestMessages([
          ...newMsgs,
          { role: "assistant", content: result.response },
        ]);
      } else {
        setTestMessages([
          ...newMsgs,
          { role: "assistant", content: `[Error: ${result.error.type}]` },
        ]);
      }
    } catch (e) {
      setTestMessages([
        ...newMsgs,
        { role: "assistant", content: `[Exception: ${e}]` },
      ]);
    } finally {
      setTestLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ember" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="display text-2xl font-bold text-ink">
            Spicy<span className="ember-text">Ai</span> Config
          </h1>
          <p className="text-sm text-muted">
            Tune the chatbot persona, prompt, and limits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/documents")}
            className="rounded-full border border-line/60 px-4 py-1.5 text-sm text-muted hover:text-ink transition-colors"
          >
            ← Documents
          </button>
          <button
            type="button"
            onClick={save}
            disabled={status.type === "loading"}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium",
              "bg-gradient-to-r from-ember to-gold text-bg shadow-ember hover:opacity-90",
              "disabled:opacity-60",
            )}
          >
            {status.type === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            Save Config
          </button>
        </div>
      </div>

      {/* Status */}
      <AnimatePresence>
        {status.type !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm",
              status.type === "loading" && "bg-elevated/60 text-muted",
              status.type === "success" &&
                "bg-green-500/10 text-green-400 border border-green-500/20",
              status.type === "error" &&
                "bg-red-500/10 text-red-400 border border-red-500/20",
            )}
          >
            {status.type === "loading" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {status.type === "success" && <CheckCircle2 className="h-4 w-4" />}
            {status.type === "error" && <AlertCircle className="h-4 w-4" />}
            {status.type === "loading" ? "Saving…" : status.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: config */}
        <div className="space-y-6">
          {/* Persona */}
          <section className="rounded-2xl border border-line/60 p-5">
            <h2 className="mb-3 font-semibold text-ink">Persona</h2>
            <div className="space-y-2">
              {PERSONA_OPTIONS.map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    config.persona === value
                      ? "border-ember/60 bg-ember/5"
                      : "border-line/40 hover:border-line",
                  )}
                >
                  <input
                    type="radio"
                    name="persona"
                    value={value}
                    checked={config.persona === value}
                    onChange={() => setConfig({ ...config, persona: value })}
                    className="mt-0.5 accent-ember"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink">{label}</p>
                    <p className="text-xs text-muted">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Rate limits */}
          <section className="rounded-2xl border border-line/60 p-5">
            <h2 className="mb-3 font-semibold text-ink">
              Rate Limits (per day)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted mb-1">
                  Anonymous
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={config.anonDailyLimit}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      anonDailyLimit: Number(e.target.value),
                    })
                  }
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">
                  Authenticated (II)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={config.authDailyLimit}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      authDailyLimit: Number(e.target.value),
                    })
                  }
                  className="input-field w-full"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-muted mb-1">
                Top-K chunks retrieved per query
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={config.topK}
                onChange={(e) =>
                  setConfig({ ...config, topK: Number(e.target.value) })
                }
                className="input-field w-24"
              />
            </div>
          </section>

          {/* Blocked phrases */}
          <section className="rounded-2xl border border-line/60 p-5">
            <h2 className="mb-3 font-semibold text-ink">Blocked Phrases</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {config.blockedPhrases.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-1 rounded-full border border-line/60 px-2.5 py-1 text-xs text-ink"
                >
                  {p}
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        blockedPhrases: config.blockedPhrases.filter(
                          (x) => x !== p,
                        ),
                      })
                    }
                    className="text-muted hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {config.blockedPhrases.length === 0 && (
                <p className="text-xs text-muted">No blocked phrases.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPhrase.trim()) {
                    setConfig({
                      ...config,
                      blockedPhrases: [
                        ...config.blockedPhrases,
                        newPhrase.trim(),
                      ],
                    });
                    setNewPhrase("");
                  }
                }}
                placeholder="Add phrase…"
                className="input-field flex-1"
              />
              <button
                type="button"
                disabled={!newPhrase.trim()}
                onClick={() => {
                  if (newPhrase.trim()) {
                    setConfig({
                      ...config,
                      blockedPhrases: [
                        ...config.blockedPhrases,
                        newPhrase.trim(),
                      ],
                    });
                    setNewPhrase("");
                  }
                }}
                className="rounded-xl border border-line/60 px-3 py-2 text-sm text-muted hover:text-ink disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </section>

          {/* System prompt extra */}
          <section className="rounded-2xl border border-line/60 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-ink">Extra System Prompt</h2>
              <span className="text-xs text-muted">
                ~{approxTokens(config.systemPromptExtra)} tokens
              </span>
            </div>
            <textarea
              value={config.systemPromptExtra}
              onChange={(e) =>
                setConfig({ ...config, systemPromptExtra: e.target.value })
              }
              rows={4}
              placeholder="Optional additional instructions appended to the system prompt…"
              className="input-field w-full resize-none text-sm"
            />
          </section>
        </div>

        {/* Right column: test conversation */}
        <div className="flex flex-col">
          <section className="flex flex-col flex-1 rounded-2xl border border-line/60 overflow-hidden">
            <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-ember" />
                <h2 className="font-semibold text-ink">Test Conversation</h2>
              </div>
              <button
                type="button"
                onClick={() => setTestMessages([])}
                className="text-muted hover:text-ink transition-colors"
                title="Clear test conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3"
              style={{ minHeight: 200, maxHeight: 400 }}
            >
              {testMessages.length === 0 && !testLoading && (
                <p className="text-center text-sm text-muted py-8">
                  Send a message to preview how SpicyAi responds with current
                  config.
                </p>
              )}
              {testMessages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                      m.role === "user" && "bg-ember text-bg rounded-br-sm",
                      m.role === "assistant" &&
                        "bg-elevated/70 text-ink rounded-bl-sm",
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {testLoading && (
                <div className="flex justify-start">
                  <div className="bg-elevated/70 rounded-2xl rounded-bl-sm px-3 py-2">
                    <Loader2 className="h-4 w-4 text-ember animate-spin" />
                  </div>
                </div>
              )}
              <div ref={testEndRef} />
            </div>

            {/* Test input */}
            <div className="border-t border-line/60 p-3 flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendTest();
                }}
                placeholder="Ask a test question…"
                disabled={testLoading}
                className="input-field flex-1 text-sm"
              />
              <button
                type="button"
                onClick={sendTest}
                disabled={!testInput.trim() || testLoading}
                className={cn(
                  "rounded-xl px-3 py-2 bg-gradient-to-r from-ember to-gold text-bg",
                  "disabled:opacity-40 hover:opacity-90 transition-opacity",
                )}
              >
                <Send className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </section>

          <p className="mt-3 text-xs text-muted">
            Note: the test panel uses the <em>live</em> canister config. Save
            changes first for them to take effect.
          </p>
        </div>
      </div>
    </div>
  );
}
