import type { IDL } from "@dfinity/candid";

// Hand-written IDL for the docs_backend canister (stateful v2 with SpicyAi).
// Extends v1 catalog methods with admin CRUD, chatbot, and asset fetch methods.

export const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const Category = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    description: IDL.Text,
  });

  const CategoryWithCount = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    description: IDL.Text,
    count: IDL.Nat,
  });

  const DocumentRecord = IDL.Record({
    slug: IDL.Text,
    title: IDL.Text,
    subtitle: IDL.Text,
    audience: IDL.Text,
    summary: IDL.Text,
    collection: IDL.Text,
    category: IDL.Text,
    pdfPath: IDL.Text,
    markdownPath: IDL.Text,
    tags: IDL.Vec(IDL.Text),
    featured: IDL.Bool,
    sortOrder: IDL.Nat,
    wordCount: IDL.Nat,
    readingMinutes: IDL.Nat,
    pdfBytes: IDL.Nat,
  });

  const DocumentStats = IDL.Record({
    totalDocuments: IDL.Nat,
    totalCategories: IDL.Nat,
    totalWords: IDL.Nat,
    totalPdfBytes: IDL.Nat,
    manifestVersion: IDL.Text,
  });

  const PersonaPreset = IDL.Variant({
    charming: IDL.Null,
    spec: IDL.Null,
    founder: IDL.Null,
    gardener: IDL.Null,
  });

  const ChatbotConfig = IDL.Record({
    systemPromptExtra: IDL.Text,
    persona: PersonaPreset,
    anonDailyLimit: IDL.Nat,
    authDailyLimit: IDL.Nat,
    topK: IDL.Nat,
    blockedPhrases: IDL.Vec(IDL.Text),
  });

  const ChatRole = IDL.Variant({ user: IDL.Null, assistant: IDL.Null });

  const ChatMessage = IDL.Record({
    role: ChatRole,
    content: IDL.Text,
  });

  const ChatRequest = IDL.Record({
    messages: IDL.Vec(ChatMessage),
  });

  const ChatError = IDL.Variant({
    rateLimited: IDL.Record({ resetInSeconds: IDL.Nat }),
    blocked: IDL.Null,
    llmError: IDL.Text,
    noContent: IDL.Null,
  });

  const ChatResponse = IDL.Variant({
    ok: IDL.Record({ response: IDL.Text, docsReferenced: IDL.Vec(IDL.Text) }),
    err: ChatError,
  });

  const RateLimitStatus = IDL.Record({ used: IDL.Nat, limit: IDL.Nat });

  // Silence unused warnings.
  void Category;

  return IDL.Service({
    // ── Catalog (query) ────────────────────────────────────────────────────
    getCanisterId: IDL.Func([], [IDL.Text], ["query"]),
    getManifestVersion: IDL.Func([], [IDL.Text], ["query"]),
    listDocuments: IDL.Func([], [IDL.Vec(DocumentRecord)], ["query"]),
    listFeaturedDocuments: IDL.Func([], [IDL.Vec(DocumentRecord)], ["query"]),
    getDocument: IDL.Func([IDL.Text], [IDL.Opt(DocumentRecord)], ["query"]),
    listDocumentsByCategory: IDL.Func(
      [IDL.Text],
      [IDL.Vec(DocumentRecord)],
      ["query"],
    ),
    listDocumentsByCollection: IDL.Func(
      [IDL.Text],
      [IDL.Vec(DocumentRecord)],
      ["query"],
    ),
    listCategories: IDL.Func([], [IDL.Vec(CategoryWithCount)], ["query"]),
    searchDocuments: IDL.Func(
      [IDL.Text, IDL.Opt(IDL.Text)],
      [IDL.Vec(DocumentRecord)],
      ["query"],
    ),
    getDocumentStats: IDL.Func([], [DocumentStats], ["query"]),
    listTags: IDL.Func([], [IDL.Vec(IDL.Text)], ["query"]),

    // ── Asset fetch (query) ────────────────────────────────────────────────
    getDocumentMarkdown: IDL.Func([IDL.Text], [IDL.Text], ["query"]),
    getDocumentPdf: IDL.Func([IDL.Text], [IDL.Vec(IDL.Nat8)], ["query"]),

    // ── Admin management ───────────────────────────────────────────────────
    isAdmin: IDL.Func([IDL.Principal], [IDL.Bool], ["query"]),
    listAdmins: IDL.Func([], [IDL.Vec(IDL.Principal)], ["query"]),
    addAdmin: IDL.Func([IDL.Principal], [], []),
    removeAdmin: IDL.Func([IDL.Principal], [], []),

    // ── Document CRUD ──────────────────────────────────────────────────────
    upsertDocument: IDL.Func([DocumentRecord], [], []),
    deleteDocument: IDL.Func([IDL.Text], [], []),
    uploadDocumentMarkdown: IDL.Func([IDL.Text, IDL.Text], [], []),
    uploadDocumentPdf: IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [], []),
    upsertCategory: IDL.Func([Category], [], []),
    deleteCategory: IDL.Func([IDL.Text], [], []),
    seedDocuments: IDL.Func([IDL.Vec(DocumentRecord)], [], []),
    seedCategories: IDL.Func([IDL.Vec(Category)], [], []),
    seedMarkdowns: IDL.Func([IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], [], []),

    // ── Chatbot config ─────────────────────────────────────────────────────
    getChatbotConfig: IDL.Func([], [ChatbotConfig], ["query"]),
    setChatbotConfig: IDL.Func([ChatbotConfig], [], []),
    setChatbotSystemPromptExtra: IDL.Func([IDL.Text], [], []),
    setChatbotPersona: IDL.Func([PersonaPreset], [], []),
    setChatbotBlockedPhrases: IDL.Func([IDL.Vec(IDL.Text)], [], []),
    setChatbotRateLimits: IDL.Func([IDL.Nat, IDL.Nat], [], []),

    // ── Chat ───────────────────────────────────────────────────────────────
    askSpicyAi: IDL.Func([ChatRequest], [ChatResponse], []),
    getMyRateLimitStatus: IDL.Func([], [RateLimitStatus], ["query"]),
    getChunkCount: IDL.Func([], [IDL.Nat], ["query"]),
  });
};

// ── TypeScript types ──────────────────────────────────────────────────────────

export type PersonaPresetCandid =
  | { charming: null }
  | { spec: null }
  | { founder: null }
  | { gardener: null };

export type ChatbotConfigCandid = {
  systemPromptExtra: string;
  persona: PersonaPresetCandid;
  anonDailyLimit: bigint;
  authDailyLimit: bigint;
  topK: bigint;
  blockedPhrases: string[];
};

export type ChatRoleCandid = { user: null } | { assistant: null };

export type ChatMessageCandid = {
  role: ChatRoleCandid;
  content: string;
};

export type ChatRequestCandid = {
  messages: ChatMessageCandid[];
};

export type ChatErrorCandid =
  | { rateLimited: { resetInSeconds: bigint } }
  | { blocked: null }
  | { llmError: string }
  | { noContent: null };

export type ChatResponseCandid =
  | { ok: { response: string; docsReferenced: string[] } }
  | { err: ChatErrorCandid };

export type RateLimitStatusCandid = { used: bigint; limit: bigint };

export interface DocumentRecordCandid {
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
  sortOrder: bigint;
  wordCount: bigint;
  readingMinutes: bigint;
  pdfBytes: bigint;
}

export interface CategoryWithCountCandid {
  id: string;
  name: string;
  description: string;
  count: bigint;
}

export interface DocumentStatsCandid {
  totalDocuments: bigint;
  totalCategories: bigint;
  totalWords: bigint;
  totalPdfBytes: bigint;
  manifestVersion: string;
}

export interface CategoryCandid {
  id: string;
  name: string;
  description: string;
}

// ── Actor type ────────────────────────────────────────────────────────────────

import type { Principal } from "@dfinity/principal";

export type DocsBackendActor = {
  // Catalog queries
  getCanisterId: () => Promise<string>;
  getManifestVersion: () => Promise<string>;
  listDocuments: () => Promise<DocumentRecordCandid[]>;
  listFeaturedDocuments: () => Promise<DocumentRecordCandid[]>;
  getDocument: (slug: string) => Promise<[] | [DocumentRecordCandid]>;
  listDocumentsByCategory: (id: string) => Promise<DocumentRecordCandid[]>;
  listDocumentsByCollection: (c: string) => Promise<DocumentRecordCandid[]>;
  listCategories: () => Promise<CategoryWithCountCandid[]>;
  searchDocuments: (
    q: string,
    cat: [] | [string],
  ) => Promise<DocumentRecordCandid[]>;
  getDocumentStats: () => Promise<DocumentStatsCandid>;
  listTags: () => Promise<string[]>;
  // Asset queries
  getDocumentMarkdown: (slug: string) => Promise<string>;
  getDocumentPdf: (slug: string) => Promise<number[]>;
  // Admin queries
  isAdmin: (p: Principal) => Promise<boolean>;
  listAdmins: () => Promise<Principal[]>;
  getChunkCount: () => Promise<bigint>;
  getChatbotConfig: () => Promise<ChatbotConfigCandid>;
  getMyRateLimitStatus: () => Promise<RateLimitStatusCandid>;
  // Chat
  askSpicyAi: (req: ChatRequestCandid) => Promise<ChatResponseCandid>;
  // Admin updates
  addAdmin: (p: Principal) => Promise<void>;
  removeAdmin: (p: Principal) => Promise<void>;
  upsertDocument: (doc: DocumentRecordCandid) => Promise<void>;
  deleteDocument: (slug: string) => Promise<void>;
  uploadDocumentMarkdown: (slug: string, text: string) => Promise<void>;
  uploadDocumentPdf: (slug: string, data: number[]) => Promise<void>;
  upsertCategory: (cat: CategoryCandid) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  seedDocuments: (docs: DocumentRecordCandid[]) => Promise<void>;
  seedCategories: (cats: CategoryCandid[]) => Promise<void>;
  seedMarkdowns: (payload: [string, string][]) => Promise<void>;
  setChatbotConfig: (cfg: ChatbotConfigCandid) => Promise<void>;
  setChatbotSystemPromptExtra: (extra: string) => Promise<void>;
  setChatbotPersona: (p: PersonaPresetCandid) => Promise<void>;
  setChatbotBlockedPhrases: (phrases: string[]) => Promise<void>;
  setChatbotRateLimits: (anon: bigint, auth: bigint) => Promise<void>;
};
