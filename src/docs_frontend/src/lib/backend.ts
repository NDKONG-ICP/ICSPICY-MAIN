import { Actor, HttpAgent } from "@dfinity/agent";
import {
  idlFactory,
  type DocsBackendActor,
  type DocumentRecordCandid,
  type CategoryWithCountCandid,
  type DocumentStatsCandid,
  type ChatbotConfigCandid,
  type PersonaPresetCandid,
  type ChatResponseCandid,
  type ChatErrorCandid,
  type ChatMessageCandid,
} from "./idl";

// Resolve the docs_backend canister id at runtime.
function resolveCanisterId(): string | null {
  const fromEnv = (process.env.CANISTER_ID_DOCS_BACKEND ?? "").trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const fromWindow =
      (window as unknown as { __DOCS_BACKEND_ID__?: string })
        .__DOCS_BACKEND_ID__ ?? "";
    if (fromWindow) return fromWindow;
  }
  return null;
}

function isLocalNetwork(): boolean {
  return (process.env.DFX_NETWORK ?? "local") === "local";
}

function resolveHost(): string {
  if (typeof window === "undefined") {
    return isLocalNetwork() ? "http://127.0.0.1:4943" : "https://icp-api.io";
  }
  const { protocol, hostname, port } = window.location;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    return `${protocol}//127.0.0.1:${port || "4943"}`;
  }
  return "https://icp-api.io";
}

// ── Anonymous actor (public catalog + chat) ────────────────────────────────

let cachedActor: DocsBackendActor | null = null;

export function getDocsBackendActor(): DocsBackendActor | null {
  if (cachedActor) return cachedActor;
  const canisterId = resolveCanisterId();
  if (!canisterId) return null;

  const agent = HttpAgent.createSync({ host: resolveHost() });
  if (isLocalNetwork()) {
    agent.fetchRootKey().catch(() => {});
  }

  cachedActor = Actor.createActor<DocsBackendActor>(idlFactory, {
    agent,
    canisterId,
  });
  return cachedActor;
}

// Re-export the authenticated actor factory from auth.ts.
export { getAuthenticatedActor } from "./auth";

// ── Candid → plain JS conversion ───────────────────────────────────────────

export interface DocumentRecord {
  slug: string;
  title: string;
  subtitle: string;
  audience: string;
  summary: string;
  collection: string;
  category: string;
  pdfPath: string;
  markdownPath: string;
  tags: string[];
  featured: boolean;
  sortOrder: number;
  wordCount: number;
  readingMinutes: number;
  pdfBytes: number;
}

export interface CategoryWithCount {
  id: string;
  name: string;
  description: string;
  count: number;
}

export interface DocumentStats {
  totalDocuments: number;
  totalCategories: number;
  totalWords: number;
  totalPdfBytes: number;
  manifestVersion: string;
}

export type PersonaPreset = "charming" | "spec" | "founder" | "gardener";

export interface ChatbotConfig {
  systemPromptExtra: string;
  persona: PersonaPreset;
  anonDailyLimit: number;
  authDailyLimit: number;
  topK: number;
  blockedPhrases: string[];
}

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ChatError =
  | { type: "rateLimited"; resetInSeconds: number }
  | { type: "blocked" }
  | { type: "llmError"; message: string }
  | { type: "noContent" };

export type ChatResult =
  | { ok: true; response: string; docsReferenced: string[] }
  | { ok: false; error: ChatError };

// ── Converters ─────────────────────────────────────────────────────────────

export function fromDocumentRecord(c: DocumentRecordCandid): DocumentRecord {
  return {
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    audience: c.audience,
    summary: c.summary,
    collection: c.collection,
    category: c.category,
    pdfPath: c.pdfPath,
    markdownPath: c.markdownPath,
    tags: c.tags,
    featured: c.featured,
    sortOrder: Number(c.sortOrder),
    wordCount: Number(c.wordCount),
    readingMinutes: Number(c.readingMinutes),
    pdfBytes: Number(c.pdfBytes),
  };
}

export function toDocumentRecordCandid(
  d: DocumentRecord,
): DocumentRecordCandid {
  return {
    slug: d.slug,
    title: d.title,
    subtitle: d.subtitle,
    audience: d.audience,
    summary: d.summary,
    collection: d.collection,
    category: d.category,
    pdfPath: d.pdfPath,
    markdownPath: d.markdownPath,
    tags: d.tags,
    featured: d.featured,
    sortOrder: BigInt(d.sortOrder),
    wordCount: BigInt(d.wordCount),
    readingMinutes: BigInt(d.readingMinutes),
    pdfBytes: BigInt(d.pdfBytes),
  };
}

export function fromCategoryWithCount(
  c: CategoryWithCountCandid,
): CategoryWithCount {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    count: Number(c.count),
  };
}

export function fromDocumentStats(c: DocumentStatsCandid): DocumentStats {
  return {
    totalDocuments: Number(c.totalDocuments),
    totalCategories: Number(c.totalCategories),
    totalWords: Number(c.totalWords),
    totalPdfBytes: Number(c.totalPdfBytes),
    manifestVersion: c.manifestVersion,
  };
}

export function fromPersonaPreset(c: PersonaPresetCandid): PersonaPreset {
  if ("charming" in c) return "charming";
  if ("spec" in c) return "spec";
  if ("gardener" in c) return "gardener";
  return "founder";
}

export function toPersonaPresetCandid(p: PersonaPreset): PersonaPresetCandid {
  if (p === "charming") return { charming: null };
  if (p === "spec") return { spec: null };
  if (p === "gardener") return { gardener: null };
  return { founder: null };
}

export function fromChatbotConfig(c: ChatbotConfigCandid): ChatbotConfig {
  return {
    systemPromptExtra: c.systemPromptExtra,
    persona: fromPersonaPreset(c.persona),
    anonDailyLimit: Number(c.anonDailyLimit),
    authDailyLimit: Number(c.authDailyLimit),
    topK: Number(c.topK),
    blockedPhrases: c.blockedPhrases,
  };
}

export function toChatbotConfigCandid(
  cfg: ChatbotConfig,
): ChatbotConfigCandid {
  return {
    systemPromptExtra: cfg.systemPromptExtra,
    persona: toPersonaPresetCandid(cfg.persona),
    anonDailyLimit: BigInt(cfg.anonDailyLimit),
    authDailyLimit: BigInt(cfg.authDailyLimit),
    topK: BigInt(cfg.topK),
    blockedPhrases: cfg.blockedPhrases,
  };
}

export function toChatMessageCandid(m: ChatMessage): ChatMessageCandid {
  return {
    role: m.role === "user" ? { user: null } : { assistant: null },
    content: m.content,
  };
}

function parseChatError(e: ChatErrorCandid): ChatError {
  if ("rateLimited" in e) {
    return {
      type: "rateLimited",
      resetInSeconds: Number(e.rateLimited.resetInSeconds),
    };
  }
  if ("blocked" in e) return { type: "blocked" };
  if ("llmError" in e) return { type: "llmError", message: e.llmError };
  return { type: "noContent" };
}

export function fromChatResponse(c: ChatResponseCandid): ChatResult {
  if ("ok" in c) {
    return {
      ok: true,
      response: c.ok.response,
      docsReferenced: c.ok.docsReferenced,
    };
  }
  return { ok: false, error: parseChatError(c.err) };
}
