import { Actor, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { getAuthClient } from "./auth";

// ── Candid IDL for spicy_ai_canister (streaming API) ─────────────────────────

export const spicyAiIdlFactory: IDL.InterfaceFactory = ({ IDL }) => {
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
    retrievalError: IDL.Text,
    noContent: IDL.Null,
    notEnabled: IDL.Null,
    notConfigured: IDL.Null,
    sessionNotFound: IDL.Null,
    sessionActive: IDL.Null,
  });

  const StartChatOk = IDL.Record({
    chatId: IDL.Text,
    docsReferenced: IDL.Vec(IDL.Text),
  });
  const StartChatResponse = IDL.Variant({ ok: StartChatOk, err: ChatError });

  const ContinueChatOk = IDL.Record({
    done: IDL.Bool,
    response: IDL.Text,
    docsReferenced: IDL.Vec(IDL.Text),
  });
  const ContinueChatResponse = IDL.Variant({
    ok: ContinueChatOk,
    err: ChatError,
  });

  const LlmChatOk = IDL.Record({
    response: IDL.Text,
    docsReferenced: IDL.Vec(IDL.Text),
  });
  const LlmChatResponse = IDL.Variant({ ok: LlmChatOk, err: ChatError });

  const GenerationStatus = IDL.Record({
    enabled: IDL.Bool,
    llamaCppId: IDL.Text,
    docsBackendId: IDL.Text,
    modelPath: IDL.Text,
    contextSize: IDL.Nat,
    topK: IDL.Nat,
    maxGenSteps: IDL.Nat,
    anonDailyLimit: IDL.Nat,
    authDailyLimit: IDL.Nat,
    activeSessions: IDL.Nat,
  });

  return IDL.Service({
    // Fast path: mo:llm single-call
    chatWithLlm: IDL.Func([ChatRequest], [LlmChatResponse], []),

    // Streaming chat API (DeepSeek)
    startChat: IDL.Func([ChatRequest], [StartChatResponse], []),
    continueChat: IDL.Func([IDL.Text], [ContinueChatResponse], []),
    cancelChat: IDL.Func([IDL.Text], [], []),

    // Monitoring (query)
    getStatus: IDL.Func([], [GenerationStatus], ["query"]),
    getCycleBalance: IDL.Func([], [IDL.Nat], ["query"]),
    getCanisterId: IDL.Func([], [IDL.Text], ["query"]),
    listAdmins: IDL.Func([], [IDL.Vec(IDL.Principal)], ["query"]),
    isAdminQuery: IDL.Func([IDL.Principal], [IDL.Bool], ["query"]),

    // Admin config
    setLlamaCppId: IDL.Func([IDL.Text], [], []),
    setDocsBackendId: IDL.Func([IDL.Text], [], []),
    setModelPath: IDL.Func([IDL.Text], [], []),
    setContextSize: IDL.Func([IDL.Nat], [], []),
    setTopK: IDL.Func([IDL.Nat], [], []),
    setMaxGenSteps: IDL.Func([IDL.Nat], [], []),
    setEnabled: IDL.Func([IDL.Bool], [], []),
    setAnonDailyLimit: IDL.Func([IDL.Nat], [], []),
    setAuthDailyLimit: IDL.Func([IDL.Nat], [], []),

    // Admin: llama_cpp controls
    configureMaxTokens: IDL.Func([IDL.Nat64, IDL.Nat64], [IDL.Text], []),
    openLlamaCppAccess: IDL.Func([], [IDL.Text], []),
    checkLlamaCpp: IDL.Func([], [IDL.Text], []),

    // Admin: session management
    listSessions: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], []),
    adminCancelSession: IDL.Func([IDL.Text], [], []),

    // Admin: principal management
    addAdmin: IDL.Func([IDL.Principal], [], []),
    removeAdmin: IDL.Func([IDL.Principal], [], []),
  });
};

// ── TypeScript actor interface ────────────────────────────────────────────────

export interface SpicyAiChatError {
  rateLimited?: { resetInSeconds: bigint };
  blocked?: null;
  llmError?: string;
  retrievalError?: string;
  noContent?: null;
  notEnabled?: null;
  notConfigured?: null;
  sessionNotFound?: null;
  sessionActive?: null;
}

export interface SpicyAiLlmChatOk {
  response: string;
  docsReferenced: string[];
}
export interface SpicyAiLlmChatResponse {
  ok?: SpicyAiLlmChatOk;
  err?: SpicyAiChatError;
}

export interface SpicyAiStartChatOk {
  chatId: string;
  docsReferenced: string[];
}
export interface SpicyAiStartChatResponse {
  ok?: SpicyAiStartChatOk;
  err?: SpicyAiChatError;
}

export interface SpicyAiContinueChatOk {
  done: boolean;
  response: string;
  docsReferenced: string[];
}
export interface SpicyAiContinueChatResponse {
  ok?: SpicyAiContinueChatOk;
  err?: SpicyAiChatError;
}

export interface SpicyAiChatMessage {
  role: { user: null } | { assistant: null };
  content: string;
}

export interface SpicyAiGenerationStatus {
  enabled: boolean;
  llamaCppId: string;
  docsBackendId: string;
  modelPath: string;
  contextSize: bigint;
  topK: bigint;
  maxGenSteps: bigint;
  anonDailyLimit: bigint;
  authDailyLimit: bigint;
  activeSessions: bigint;
}

export interface SpicyAiActor {
  chatWithLlm(req: {
    messages: SpicyAiChatMessage[];
  }): Promise<SpicyAiLlmChatResponse>;
  startChat(req: {
    messages: SpicyAiChatMessage[];
  }): Promise<SpicyAiStartChatResponse>;
  continueChat(chatId: string): Promise<SpicyAiContinueChatResponse>;
  cancelChat(chatId: string): Promise<void>;
  getStatus(): Promise<SpicyAiGenerationStatus>;
  getCycleBalance(): Promise<bigint>;
  getCanisterId(): Promise<string>;
  listAdmins(): Promise<string[]>;
  isAdminQuery(p: string): Promise<boolean>;
  setLlamaCppId(id: string): Promise<void>;
  setDocsBackendId(id: string): Promise<void>;
  setModelPath(path: string): Promise<void>;
  setContextSize(n: bigint): Promise<void>;
  setTopK(n: bigint): Promise<void>;
  setMaxGenSteps(n: bigint): Promise<void>;
  setEnabled(v: boolean): Promise<void>;
  setAnonDailyLimit(n: bigint): Promise<void>;
  setAuthDailyLimit(n: bigint): Promise<void>;
  configureMaxTokens(maxQuery: bigint, maxUpdate: bigint): Promise<string>;
  openLlamaCppAccess(): Promise<string>;
  checkLlamaCpp(): Promise<string>;
  listSessions(): Promise<[string, string][]>;
  adminCancelSession(chatId: string): Promise<void>;
  addAdmin(p: string): Promise<void>;
  removeAdmin(p: string): Promise<void>;
}

// ── Actor factory ─────────────────────────────────────────────────────────────

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

let cachedSpicyAiActor: SpicyAiActor | null = null;

export function getSpicyAiActor(): SpicyAiActor | null {
  if (cachedSpicyAiActor) return cachedSpicyAiActor;

  const fromEnv = (process.env.CANISTER_ID_SPICY_AI_CANISTER ?? "").trim();
  const fromWindow =
    typeof window !== "undefined"
      ? (
          (window as unknown as { __SPICY_AI_CANISTER_ID__?: string })
            .__SPICY_AI_CANISTER_ID__ ?? ""
        ).trim()
      : "";
  const canisterId = fromEnv || fromWindow;
  if (!canisterId) return null;

  const agent = HttpAgent.createSync({ host: resolveHost() });
  if (isLocalNetwork()) {
    agent.fetchRootKey().catch(() => {});
  }
  cachedSpicyAiActor = Actor.createActor<SpicyAiActor>(spicyAiIdlFactory, {
    agent,
    canisterId,
  });
  return cachedSpicyAiActor;
}

export function invalidateSpicyAiActor(): void {
  cachedSpicyAiActor = null;
}

let cachedAuthSpicyAiActor: SpicyAiActor | null = null;

export async function getAuthenticatedSpicyAiActor(): Promise<SpicyAiActor | null> {
  if (cachedAuthSpicyAiActor) return cachedAuthSpicyAiActor;

  const fromEnv = (process.env.CANISTER_ID_SPICY_AI_CANISTER ?? "").trim();
  const fromWindow =
    typeof window !== "undefined"
      ? (
          (window as unknown as { __SPICY_AI_CANISTER_ID__?: string })
            .__SPICY_AI_CANISTER_ID__ ?? ""
        ).trim()
      : "";
  const canisterId = fromEnv || fromWindow;
  if (!canisterId) return null;

  const client = await getAuthClient();
  if (!(await client.isAuthenticated())) return null;

  const identity = client.getIdentity();
  const agent = HttpAgent.createSync({ identity, host: resolveHost() });
  if (isLocalNetwork()) {
    agent.fetchRootKey().catch(() => {});
  }

  cachedAuthSpicyAiActor = Actor.createActor<SpicyAiActor>(spicyAiIdlFactory, {
    agent,
    canisterId,
  });
  return cachedAuthSpicyAiActor;
}

export function invalidateAuthSpicyAiActor(): void {
  cachedAuthSpicyAiActor = null;
}

// ── Converters ────────────────────────────────────────────────────────────────

import type { ChatMessage } from "./backend";

export function toSpicyAiMessage(m: ChatMessage): SpicyAiChatMessage {
  return {
    role: m.role === "user" ? { user: null } : { assistant: null },
    content: m.content,
  };
}

export function chatErrorToString(err: SpicyAiChatError): string {
  if (err.rateLimited)
    return `Rate limited. Try again in ${Number(err.rateLimited.resetInSeconds)}s.`;
  if (err.notEnabled) return "DeepSeek not enabled yet.";
  if (err.notConfigured) return "DeepSeek not configured yet.";
  if (err.sessionActive) return "A previous chat is still in progress.";
  if (err.sessionNotFound) return "Chat session not found.";
  if (err.retrievalError) return err.retrievalError;
  if (err.llmError) return err.llmError;
  if (err.blocked) return "Blocked.";
  return "Unknown error.";
}
