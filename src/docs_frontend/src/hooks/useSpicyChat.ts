import { isAuthenticated as checkIsAuthenticated } from "@/lib/auth";
import {
  type ChatMessage,
  type ChatResult,
  fromChatResponse,
  getDocsBackendActor,
  toChatMessageCandid,
} from "@/lib/backend";
import {
  chatErrorToString,
  getAuthenticatedSpicyAiActor,
  getSpicyAiActor,
  toSpicyAiMessage,
} from "@/lib/spicyai-idl";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Local history ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "spicyai:history";
const MAX_TURNS = 6;

export function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {}
  return [];
}

function saveChatHistory(msgs: ChatMessage[]) {
  try {
    const trimmed = msgs.slice(-(MAX_TURNS * 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DisplayMessage {
  role: "user" | "assistant" | "error";
  content: string;
  docsReferenced?: string[];
  onChain?: boolean;
}

// ── Phrases shown during on-chain thinking (rotate every 8s) ─────────────────

export const ON_CHAIN_PHRASES = [
  "Thinking on-chain (5–20 min)",
  "Processing on ICP — fully decentralized",
  "DeepSeek-R1 reasoning on-chain",
  "Consulting the IC SPICY docs",
  "Farming the answer on-chain",
  "No servers — pure blockchain AI",
];

// ── Suggested questions + instant pre-generated answers ───────────────────────

export interface SuggestedQuestion {
  label: string;
  question: string;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { label: "🌶 What is IC SPICY?", question: "What is IC SPICY?" },
  { label: "📄 Whitepaper", question: "Tell me about the IC SPICY whitepaper" },
  { label: "🗺 Roadmap", question: "What is the IC SPICY roadmap?" },
  { label: "📊 Tokenomics", question: "How does SPICY tokenomics work?" },
  { label: "🖼 NFT Utility", question: "What is the IC SPICY NFT utility?" },
  { label: "💎 Token Utility", question: "What does the SPICY token do?" },
  { label: "🚀 Pitch Deck", question: "Tell me about the IC SPICY pitch" },
  { label: "🌿 KNF Basics", question: "What is Korean Natural Farming?" },
  { label: "🌱 JADAM", question: "What is JADAM farming?" },
  {
    label: "🫑 Pepper Varieties",
    question: "What pepper varieties does IC SPICY grow?",
  },
];

export const QUICK_ANSWERS: Record<string, string> = {
  "What is IC SPICY?": `IC SPICY is a Real-World Asset (RWA) platform on the Internet Computer (ICP) — the on-chain storefront and provenance system for a Florida-registered specialty pepper nursery in Port Charlotte (USDA Zone 10a).

With 30+ years of cultivation experience, we grow 12 rare cultivars including Apocalypse Scorpion, Death Spiral, Aji Charapita, and Fish Pepper — all using Korean Natural Farming (KNF) and JADAM regenerative methods. No synthetic inputs. Ever.

Each plant is bound to an ICRC-7 NFT with a live, certified provenance record: variety, germination date, growing location, stage history, and per-stage weather snapshots. We sell rare plants, artisan pepper seasonings, and PepperHead membership NFTs — payable in ICP, ckBTC, ckETH, SPICY, or Stripe.

The tagline says it all: Rare. Hot. Alive. 🔥`,

  "Tell me about the IC SPICY whitepaper": `The IC SPICY Whitepaper (v1.0, May 2026) documents our full platform architecture.

Key sections:
• The Nursery — Florida-registered (FDACS), 30+ years growing rare peppers with KNF & JADAM
• 8-Canister ICP Architecture — nft_canister, marketplace, treasury, community, NIMS, docs, nft_assets, spicy_ai
• NFT Design — 8,888 ICRC-7 NFTs (5,000 Common, 2,838 Uncommon, 1,000 Rare, 50 Founder) with rarity discounts and SPICY burn-redeem
• Provenance Model — per-plant weather snapshots via Open-Meteo, certified records on-chain
• Tokenomics — 1B SPICY, 70% public LGE, 20% ICPSwap LP locked 4 years, 10% treasury
• Security — CallerGuard reentrancy locks, 7-day timelocks on economic params, multi-admin, pre-mainnet audit
• SpicyAI — on-chain AI assistant powered by DeepSeek-R1, running fully on ICP

Full whitepaper available in the Documents library above. Not a securities offering.`,

  "What is the IC SPICY roadmap?": `IC SPICY follows a 12-phase roadmap:

Phase 0–1: Motoko migration + security foundations
Phase 2: Asset infrastructure (1.33 GB NFT artwork upload)
Phase 3: ICRC-7 NFTs + certified plant provenance
Phase 4: Real payments (ICP, ckBTC, Stripe, SPICY pay)
Phase 5: ckBTC integration (real Bitcoin deposits/sweeps)
Phase 5.5: Weather provenance (per-plant, live Open-Meteo outcalls)
Phase 6: Multi-canister split + transparency dashboard
Phase 6.5: SpicyAI chatbot + badges + recipe burn gate ← HERE NOW
Phase 7: External security audit ($30K–$60K, shortlist: Trail of Bits, Vespertine, OAK Security, Hacken)
Phase 8: OHSHII integration + SPICY LGE + treasury + monthly buybacks

Phases 0–7 target mainnet ~week 11. The SPICY token launches in Phase 8 via the OHSHII Launcher. 🌶`,

  "How does SPICY tokenomics work?": `SPICY is a 1,000,000,000 (1 billion) fixed-supply ICRC-1 utility token on ICP, launched via OHSHII. No re-minting after genesis — ever.

Allocation:
• 70% (700M) — LGE Public Sale. Founder capped at 18M with 24-month vest (6-month cliff + 18-month linear).
• 20% (200M) — ICPSwap SPICY/ICP liquidity pool, locked 4 years via OHSHII Locker.
• 10% (100M) — Treasury: 40M NFT redemption, 25M marketing, 20M strategic reserve, 10M operational, 5M quarterly burns.

Burn mechanics:
• Pay-with-SPICY: full token amount burned to the black hole address — 10% discount for customers
• Recipe submissions: 10 SPICY burned per recipe
• Quarterly admin burns from the 5M burn reserve
• Monthly buybacks: 2% of operational ICP → ICPSwap → routed to redemption pool or burns

All LP, buybacks, and burns are publicly verifiable on-chain. 📊`,

  "What is the IC SPICY NFT utility?": `IC SPICY has 8,888 ICRC-7 NFTs in 4 rarities — each tied to real plant provenance and real utility:

Rarity · Count · Store Discount · SPICY Burn-Redeem
Common  · 5,000 · 5% off        · 1,000 SPICY
Uncommon· 2,838 · 10% off       · 3,500 SPICY
Rare    · 1,000 · 20% off       · 12,000 SPICY
Founder ·    50 · 30% off       · 50,000 SPICY

What NFTs give you:
• Checkout discounts on all IC SPICY products (plants, seasonings, garden inputs)
• PepperHead community membership with premium access
• Burn-redeem: exchange your NFT for SPICY tokens from the treasury redemption pool
• On-chain certified provenance record from a real Florida pepper plant
• Enhanced SpicyAI chatbot access: NFT holders get 1,000 calls/day

Anti-arbitrage: 30-day minimum hold before burn-redeem. Rate-limited. 🖼`,

  "What does the SPICY token do?": `SPICY has 4 on-canister utility functions:

1. Pay-with-SPICY Discount — 10% off any purchase when paying in SPICY. Tokens are fully burned (sent to the black-hole address) — deflationary by design.

2. Recipe Submission Gate — Hold ≥100 SPICY to submit recipes to the IC SPICY CookBook. 10 SPICY burned per submission. Keeps the CookBook quality high.

3. SpicyAI Bonus Calls — +50 chatbot calls per 24 hours for every 100 SPICY held, capped at +2,000 bonus calls/day. Balance is read — no tokens consumed.

4. Legend Badge — Hold ≥100,000 SPICY to earn a display "Legend" badge on your community profile.

Important: SPICY does NOT grant product discounts (those are NFT-only), voting rights, equity, or dividends. It is a utility token with a narrow, locked-in scope. 💎`,

  "Tell me about the IC SPICY pitch": `The IC SPICY pitch is built around three pillars:

The Problem: Commodity spice shelves are full of anonymous products. Buyers can't verify "organic" or "single-origin" claims. Meanwhile, Web3 RWA projects lack a physical product people can taste and talk about.

The Solution: IC SPICY bridges both worlds — rare Florida peppers and artisan seasonings with on-chain certified provenance. For grocery customers it feels like a premium spice brand. For crypto-native users it's an ICP-native RWA system with ICRC standards, Internet Identity, and self-custody.

The Brand: "Luxury heat, not novelty heat." Not pain-for-clicks gimmicks — balanced, chef-built flavor from real peppers. Rare. Hot. Alive.

Go-to-Market:
• Phase 1: DTC credibility — farmers markets, chef tastings, early PepperHead NFT collectors
• Phase 2: Retail proof — 3–4 seasoning SKUs, sell-through data, specialty accounts
• Phase 3: Grocery — national distribution beside McCormick and Kinder's 🚀`,

  "What is Korean Natural Farming?": `Korean Natural Farming (KNF) was developed by Master Han-Kyu Cho and is practiced in 20+ countries. The core idea: build a living soil ecosystem using inputs made from locally available materials — no synthetics.

The 9 Core KNF Inputs:
• IMO (Indigenous Microorganisms) — builds living soil biology, the foundation
• LAB (Lactic Acid Bacteria) — natural pathogen control
• FPJ / FFJ (Fermented Plant/Fruit Juice) — vegetative and fruiting stage nutrition
• FAA (Fish Amino Acid) — nitrogen source, vegetative stage only
• OHN (Oriental Herbal Nutrient) — stress resilience, immune boost
• WCA / WCP (Water-Soluble Calcium/Phosphate) — cell structure, blossom-end rot prevention
• BRV (Brown Rice Vinegar) — pH balance, fungal control

Growth Stage Matching:
• Vegetative: FPJ + FAA + OHN + LAB (build leaf mass and roots)
• Change-over: WCA, stop FAA (signal the plant to flower)
• Fruiting: WCA + WCP + SEA + FFJ (fruit development, sugar, flavor)

Chris Trump (12 years under Master Cho, Biomei Natural Farming) and Matt Powers are leading US practitioners. IC SPICY uses KNF throughout our nursery. 🌿`,

  "What is JADAM farming?": `JADAM (Jayoun Democracy Agricultural Method) was developed by Youngsang Cho — Master Cho Han-Kyu's son — as an ultra-low-cost evolution of KNF. The philosophy: farming inputs should cost less than $10 per acre.

The 3 Core JADAM Inputs:
• JMS (JADAM Microbial Solution) — leaf mold from a forest floor + water, fermented 1 week. Billions of native microorganisms. No complex process needed.
• JWA (JADAM Wetting Agent) — soapwort root extract, a natural surfactant for spreading organic pesticides
• JHS (JADAM Herb Solution) — concentrated herb extract for pest and disease management

JADAM vs KNF:
JADAM simplifies everything. No special ingredients — just local biology. Where KNF has 9 precisely crafted inputs, JADAM reduces to 3 core preparations at near-zero cost. Designed for commercial-scale farming with limited budgets.

IC SPICY integrates both KNF and JADAM — the precision biology of KNF with the ultra-low-cost scalability of JADAM. The best of both systems in every tray. 🌱`,

  "What pepper varieties does IC SPICY grow?": `IC SPICY grows 12 active rare cultivars in Port Charlotte, Florida (USDA Zone 10a):

Extreme Heat:
• Apocalypse Scorpion — one of the hottest peppers in the world
• Death Spiral — extreme heat, unique spiral pod form
• RB003 — rare experimental cultivar

Super-Hots:
• Fried Chicken — distinctive shape, intense heat
• Aji Guyana — Amazonian super-hot with tropical flavor

Heirlooms & Specialty:
• Aji Charapita — the "caviar of peppers," tiny yellow pearls valued at $25,000/kg in Peru
• Fish Pepper — historic African-American heirloom, culinary classic
• Acoma Pueblo — heritage New Mexico cultivar
• Calabrian Cherry — Italian heritage for luxury sauces and charcuterie

All grown with Korean Natural Farming and JADAM. No synthetic inputs. 30+ years of growing experience behind every plant. 🫑🔥`,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseSpicyChatReturn {
  messages: DisplayMessage[];
  loading: boolean;
  selectedModel: "fast" | "deep";
  setSelectedModel: (m: "fast" | "deep") => void;
  onChainMode: boolean;
  thinkPhrase: string;
  thinkSecs: number;
  spicyAiAvailable: boolean;
  handleSendText: (text: string) => void;
  clearHistory: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function useSpicyChat(): UseSpicyChatReturn {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"fast" | "deep">("fast");
  const [onChainMode, setOnChainMode] = useState(false);
  const [thinkPhrase, setThinkPhrase] = useState(ON_CHAIN_PHRASES[0]);
  const [thinkSecs, setThinkSecs] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const thinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phraseIdxRef = useRef(0);
  const didInit = useRef(false);

  const spicyAiAvailable = Boolean(getSpicyAiActor());

  // Load history from localStorage once — empty deps intentional (one-shot on mount).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot init
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      const saved = loadChatHistory();
      setHistory(saved);
      setMessages(saved.map((m) => ({ role: m.role, content: m.content })));
    }
  }, []);

  // Scroll to bottom on new messages.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // On-chain thinking phrase rotator + second counter.
  useEffect(() => {
    if (!loading || !onChainMode) {
      if (thinkIntervalRef.current) clearInterval(thinkIntervalRef.current);
      if (thinkTimerRef.current) clearInterval(thinkTimerRef.current);
      setThinkSecs(0);
      return;
    }
    phraseIdxRef.current = 0;
    setThinkPhrase(ON_CHAIN_PHRASES[0]);
    setThinkSecs(0);

    thinkIntervalRef.current = setInterval(() => {
      phraseIdxRef.current =
        (phraseIdxRef.current + 1) % ON_CHAIN_PHRASES.length;
      setThinkPhrase(ON_CHAIN_PHRASES[phraseIdxRef.current]);
    }, 8_000);

    thinkTimerRef.current = setInterval(() => {
      setThinkSecs((s) => s + 1);
    }, 1_000);

    return () => {
      if (thinkIntervalRef.current) clearInterval(thinkIntervalRef.current);
      if (thinkTimerRef.current) clearInterval(thinkTimerRef.current);
    };
  }, [loading, onChainMode]);

  const handleSendText = useCallback(
    async (text: string) => {
      if (!text || loading) return;

      const newHistory: ChatMessage[] = [
        ...history,
        { role: "user", content: text },
      ];
      setHistory(newHistory);
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setLoading(true);

      // ── Instant pre-generated answer ────────────────────────────────────────
      const quickAnswer = QUICK_ANSWERS[text];
      if (quickAnswer) {
        const updatedHistory: ChatMessage[] = [
          ...newHistory,
          { role: "assistant", content: quickAnswer },
        ];
        setHistory(updatedHistory);
        saveChatHistory(updatedHistory);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: quickAnswer },
        ]);
        setLoading(false);
        return;
      }

      const spicyAiBase = getSpicyAiActor();

      // ── Fast path: mo:llm single-call (Llama 4 Scout) ───────────────────────
      if (spicyAiBase && selectedModel === "fast") {
        const authed = await checkIsAuthenticated();
        const spicyAi = authed
          ? ((await getAuthenticatedSpicyAiActor()) ?? spicyAiBase)
          : spicyAiBase;

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
        const responseText = ok.response;
        const docsReferenced = ok.docsReferenced;
          const updatedHistory: ChatMessage[] = [
            ...newHistory,
            { role: "assistant", content: responseText },
          ];
          setHistory(updatedHistory);
          saveChatHistory(updatedHistory);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: responseText, docsReferenced },
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

      // ── Deep path: DeepSeek streaming (startChat + continueChat polling) ────
      if (spicyAiBase && selectedModel === "deep") {
        const authed = await checkIsAuthenticated();
        const spicyAi = authed
          ? ((await getAuthenticatedSpicyAiActor()) ?? spicyAiBase)
          : spicyAiBase;

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

        const startOk = startRes.ok ?? { chatId: "", docsReferenced: [] as string[] };
        const chatId = startOk.chatId;
        const docsReferenced = startOk.docsReferenced;

          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "…", docsReferenced, onChain: true },
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

            const step = contRes.ok ?? { done: false, response: "", docsReferenced: [] as string[] };
            done = step.done;
            if (step.response && step.response.length > 0) {
              finalResponse = step.response;
              setMessages((prev) => {
                const next = [...prev];
                const lastIdx = next.length - 1;
                if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
                  next[lastIdx] = {
                    ...next[lastIdx],
                    content: step.response || "…",
                  };
                }
                return next;
              });
            }
          }

          const responseText = finalResponse || "Generation complete.";
          const updatedHistory: ChatMessage[] = [
            ...newHistory,
            { role: "assistant", content: responseText },
          ];
          setHistory(updatedHistory);
          saveChatHistory(updatedHistory);
          setMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
              next[lastIdx] = {
                ...next[lastIdx],
                content: responseText,
                docsReferenced,
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

      // ── Fallback: docs_backend shared LLM ───────────────────────────────────
      setOnChainMode(false);
      let result: ChatResult;
      try {
        const docsActor = getDocsBackendActor();
        if (!docsActor) {
          setMessages((prev) => [
            ...prev,
            {
              role: "error",
              content: "Canister not reachable. Please try again later.",
            },
          ]);
          setLoading(false);
          return;
        }
        const response = await docsActor.askSpicyAi({
          messages: newHistory.map(toChatMessageCandid),
        });
        result = fromChatResponse(response);

        if (result.ok) {
          const responseText = result.response;
          const docsReferenced = result.docsReferenced;
          const updatedHistory: ChatMessage[] = [
            ...newHistory,
            { role: "assistant", content: responseText },
          ];
          setHistory(updatedHistory);
          saveChatHistory(updatedHistory);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: responseText, docsReferenced },
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
            errMsg =
              "SpicyAi is momentarily unavailable. Please try again shortly.";
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
    },
    [history, loading, selectedModel],
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
    thinkSecs,
    spicyAiAvailable,
    handleSendText,
    clearHistory,
    messagesEndRef,
  };
}
