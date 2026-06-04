import { useCallback, useEffect, useRef, useState } from "react";

import { useUsageTracking } from "./useUsageTracking";

import {
  fromDocsChatResponse,
  getDocsBackendChatActor,
  toDocsChatMessage,
} from "../lib/docs-backend-chat";
import {
  type SpicyChatTurn,
  chatErrorToString,
  getAuthenticatedSpicyAiActor,
  getSpicyAiActor,
  isSpicyAiAuthenticated,
  toSpicyAiMessage,
} from "../lib/spicyai-idl";

const STORAGE_KEY = "spicyai:widget-history";
const MAX_TURNS = 6;

export interface SpicyAiDisplayMessage {
  role: "user" | "assistant" | "error";
  content: string;
  docsReferenced?: string[];
  onChain?: boolean;
}

export const ON_CHAIN_PHRASES = [
  "Searching knowledge base on-chain…",
  "Retrieving KNF & JADAM docs…",
  "DeepSeek reasoning on ICP…",
  "Consulting IC SPICY documentation…",
  "Grounding answer in your docs…",
];

export function useSpicyAiChat() {
  const { track, USAGE } = useUsageTracking();
  const [messages, setMessages] = useState<SpicyAiDisplayMessage[]>([]);
  const [history, setHistory] = useState<SpicyChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"fast" | "deep">("fast");
  const [onChainMode, setOnChainMode] = useState(false);
  const [thinkPhrase, setThinkPhrase] = useState(ON_CHAIN_PHRASES[0]!);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const thinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phraseIdxRef = useRef(0);
  const didInit = useRef(false);

  const spicyAiAvailable = Boolean(getSpicyAiActor());

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as SpicyChatTurn[];
          setHistory(saved);
          setMessages(saved.map((m) => ({ role: m.role, content: m.content })));
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, thinkPhrase]);

  useEffect(() => {
    if (!loading || !onChainMode) {
      if (thinkIntervalRef.current) clearInterval(thinkIntervalRef.current);
      return;
    }
    phraseIdxRef.current = 0;
    setThinkPhrase(ON_CHAIN_PHRASES[0]!);
    thinkIntervalRef.current = setInterval(() => {
      phraseIdxRef.current =
        (phraseIdxRef.current + 1) % ON_CHAIN_PHRASES.length;
      setThinkPhrase(ON_CHAIN_PHRASES[phraseIdxRef.current]!);
    }, 8000);
    return () => {
      if (thinkIntervalRef.current) clearInterval(thinkIntervalRef.current);
    };
  }, [loading, onChainMode]);

  const saveHistory = useCallback((msgs: SpicyChatTurn[]) => {
    try {
      const trimmed = msgs.slice(-(MAX_TURNS * 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* ignore */
    }
  }, []);

  const handleSendText = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      track(USAGE.AI.CHAT.feature, USAGE.AI.CHAT.action);

      const newHistory: SpicyChatTurn[] = [
        ...history,
        { role: "user", content: text.trim() },
      ];
      setHistory(newHistory);
      setMessages((prev) => [...prev, { role: "user", content: text.trim() }]);
      setLoading(true);

      const spicyAiBase = getSpicyAiActor();

      // Fast path — orchestrator RAG + Llama (chatWithLlm)
      if (spicyAiBase && selectedModel === "fast") {
        const authed = await isSpicyAiAuthenticated();
        const spicyAi =
          (authed ? await getAuthenticatedSpicyAiActor() : null) ?? spicyAiBase;
        setOnChainMode(false);

        try {
          const res = await spicyAi.chatWithLlm({
            messages: newHistory.map(toSpicyAiMessage),
          });

          if (res.err) {
            setMessages((prev) => [
              ...prev,
              { role: "error", content: chatErrorToString(res.err!) },
            ]);
            setLoading(false);
            return;
          }

          const ok = res.ok ?? { response: "", docsReferenced: [] as string[] };
          const updatedHistory: SpicyChatTurn[] = [
            ...newHistory,
            { role: "assistant", content: ok.response },
          ];
          setHistory(updatedHistory);
          saveHistory(updatedHistory);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: ok.response,
              docsReferenced: ok.docsReferenced,
            },
          ]);
        } catch {
          setMessages((prev) => [
            ...prev,
            { role: "error", content: "Connection error. Please try again." },
          ]);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Deep path — orchestrator + DeepSeek (startChat + continueChat)
      if (spicyAiBase && selectedModel === "deep") {
        const authed = await isSpicyAiAuthenticated();
        const spicyAi =
          (authed ? await getAuthenticatedSpicyAiActor() : null) ?? spicyAiBase;
        setOnChainMode(true);

        try {
          const startRes = await spicyAi.startChat({
            messages: newHistory.map(toSpicyAiMessage),
          });

          if (startRes.err) {
            setMessages((prev) => [
              ...prev,
              { role: "error", content: chatErrorToString(startRes.err!) },
            ]);
            setLoading(false);
            setOnChainMode(false);
            return;
          }

          const startOk = startRes.ok ?? {
            chatId: "",
            docsReferenced: [] as string[],
          };
          const chatId = startOk.chatId;

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "…",
              docsReferenced: startOk.docsReferenced,
              onChain: true,
            },
          ]);

          let done = false;
          let finalResponse = "";
          const MAX_POLLS = 120;
          let polls = 0;

          while (!done && polls < MAX_POLLS) {
            polls++;
            const contRes = await spicyAi.continueChat(chatId);
            if (contRes.err) {
              if (contRes.err.sessionNotFound) break;
              continue;
            }
            const step = contRes.ok ?? {
              done: false,
              response: "",
              docsReferenced: [] as string[],
            };
            done = step.done;
            if (step.response.length > 0) {
              finalResponse = step.response;
              setMessages((prev) => {
                const next = [...prev];
                const lastIdx = next.length - 1;
                if (lastIdx >= 0 && next[lastIdx]?.role === "assistant") {
                  next[lastIdx] = {
                    ...next[lastIdx]!,
                    content: step.response || "…",
                  };
                }
                return next;
              });
            }
          }

          const responseText = finalResponse || "Generation complete.";
          const updatedHistory: SpicyChatTurn[] = [
            ...newHistory,
            { role: "assistant", content: responseText },
          ];
          setHistory(updatedHistory);
          saveHistory(updatedHistory);
          setMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx]?.role === "assistant") {
              next[lastIdx] = {
                ...next[lastIdx]!,
                content: responseText,
                docsReferenced: startOk.docsReferenced,
                onChain: true,
              };
            }
            return next;
          });
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              role: "error",
              content: "On-chain generation error. Please try again.",
            },
          ]);
        } finally {
          setLoading(false);
          setOnChainMode(false);
        }
        return;
      }

      // Fallback — docs_backend askSpicyAi (BM25 + shared LLM)
      setOnChainMode(false);
      try {
        const docsActor = getDocsBackendChatActor();
        if (!docsActor) {
          setMessages((prev) => [
            ...prev,
            {
              role: "error",
              content:
                "SpicyAI canister not reachable. Please try again later.",
            },
          ]);
          setLoading(false);
          return;
        }

        const response = await docsActor.askSpicyAi({
          messages: newHistory.map(toDocsChatMessage),
        });
        const result = fromDocsChatResponse(response);

        if (result.ok) {
          const updatedHistory: SpicyChatTurn[] = [
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
          setMessages((prev) => [
            ...prev,
            { role: "error", content: result.error.message },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "error", content: "Connection error. Please try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [history, loading, saveHistory, selectedModel, track, USAGE.AI.CHAT],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    didInit.current = false;
  }, []);

  return {
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
  };
}
