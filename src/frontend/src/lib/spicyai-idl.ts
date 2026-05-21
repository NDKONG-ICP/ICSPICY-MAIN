import { Actor, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { AuthClient } from "@dfinity/auth-client";

export const SPICY_AI_CANISTER_ID =
  (process.env.CANISTER_ID_SPICY_AI_CANISTER ?? "").trim() ||
  (typeof window !== "undefined"
    ? (
        (window as unknown as { __SPICY_AI_CANISTER_ID__?: string })
          .__SPICY_AI_CANISTER_ID__ ?? ""
      ).trim()
    : "") ||
  "pd5wn-sqaaa-aaaao-ba5ca-cai";

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
    chatWithLlm: IDL.Func([ChatRequest], [LlmChatResponse], []),
    startChat: IDL.Func([ChatRequest], [StartChatResponse], []),
    continueChat: IDL.Func([IDL.Text], [ContinueChatResponse], []),
    cancelChat: IDL.Func([IDL.Text], [], []),
    getStatus: IDL.Func([], [GenerationStatus], ["query"]),
    getCycleBalance: IDL.Func([], [IDL.Nat], ["query"]),
    getCanisterId: IDL.Func([], [IDL.Text], ["query"]),
    listAdmins: IDL.Func([], [IDL.Vec(IDL.Principal)], ["query"]),
    isAdminQuery: IDL.Func([IDL.Principal], [IDL.Bool], ["query"]),
    setLlamaCppId: IDL.Func([IDL.Text], [], []),
    setDocsBackendId: IDL.Func([IDL.Text], [], []),
    setModelPath: IDL.Func([IDL.Text], [], []),
    setContextSize: IDL.Func([IDL.Nat], [], []),
    setTopK: IDL.Func([IDL.Nat], [], []),
    setMaxGenSteps: IDL.Func([IDL.Nat], [], []),
    setEnabled: IDL.Func([IDL.Bool], [], []),
    setAnonDailyLimit: IDL.Func([IDL.Nat], [], []),
    setAuthDailyLimit: IDL.Func([IDL.Nat], [], []),
    configureMaxTokens: IDL.Func([IDL.Nat64, IDL.Nat64], [IDL.Text], []),
    openLlamaCppAccess: IDL.Func([], [IDL.Text], []),
    checkLlamaCpp: IDL.Func([], [IDL.Text], []),
    listSessions: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], []),
    adminCancelSession: IDL.Func([IDL.Text], [], []),
    addAdmin: IDL.Func([IDL.Principal], [], []),
    removeAdmin: IDL.Func([IDL.Principal], [], []),
  });
};

export interface SpicyAiChatError {
  rateLimited?: { resetInSeconds: bigint };
  blocked?: null;
  llmError?: string;
  noContent?: null;
  notEnabled?: null;
  notConfigured?: null;
  sessionNotFound?: null;
  sessionActive?: null;
}

export interface SpicyAiChatMessage {
  role: { user: null } | { assistant: null };
  content: string;
}

export interface SpicyAiActor {
  chatWithLlm(req: {
    messages: SpicyAiChatMessage[];
  }): Promise<{
    ok?: { response: string; docsReferenced: string[] };
    err?: SpicyAiChatError;
  }>;
  startChat(req: {
    messages: SpicyAiChatMessage[];
  }): Promise<{
    ok?: { chatId: string; docsReferenced: string[] };
    err?: SpicyAiChatError;
  }>;
  continueChat(chatId: string): Promise<{
    ok?: { done: boolean; response: string; docsReferenced: string[] };
    err?: SpicyAiChatError;
  }>;
  cancelChat(chatId: string): Promise<void>;
  getStatus(): Promise<{
    enabled: boolean;
    docsBackendId: string;
  }>;
}

export type SpicyChatTurn = {
  role: "user" | "assistant";
  content: string;
};

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

let authClientPromise: Promise<AuthClient> | null = null;

async function getAuthClient(): Promise<AuthClient> {
  if (!authClientPromise) {
    authClientPromise = AuthClient.create();
  }
  return authClientPromise;
}

export async function isSpicyAiAuthenticated(): Promise<boolean> {
  const client = await getAuthClient();
  return client.isAuthenticated();
}

let cachedSpicyAiActor: SpicyAiActor | null = null;

export function getSpicyAiActor(): SpicyAiActor | null {
  if (cachedSpicyAiActor) return cachedSpicyAiActor;
  if (!SPICY_AI_CANISTER_ID) return null;

  const agent = HttpAgent.createSync({ host: resolveHost() });
  if (isLocalNetwork()) {
    agent.fetchRootKey().catch(() => {});
  }
  cachedSpicyAiActor = Actor.createActor<SpicyAiActor>(spicyAiIdlFactory, {
    agent,
    canisterId: SPICY_AI_CANISTER_ID,
  });
  return cachedSpicyAiActor;
}

let cachedAuthSpicyAiActor: SpicyAiActor | null = null;

export async function getAuthenticatedSpicyAiActor(): Promise<SpicyAiActor | null> {
  if (cachedAuthSpicyAiActor) return cachedAuthSpicyAiActor;
  if (!SPICY_AI_CANISTER_ID) return null;

  const client = await getAuthClient();
  if (!(await client.isAuthenticated())) return null;

  const identity = client.getIdentity();
  const agent = HttpAgent.createSync({ identity, host: resolveHost() });
  if (isLocalNetwork()) {
    agent.fetchRootKey().catch(() => {});
  }

  cachedAuthSpicyAiActor = Actor.createActor<SpicyAiActor>(spicyAiIdlFactory, {
    agent,
    canisterId: SPICY_AI_CANISTER_ID,
  });
  return cachedAuthSpicyAiActor;
}

export function toSpicyAiMessage(m: SpicyChatTurn): SpicyAiChatMessage {
  return {
    role: m.role === "user" ? { user: null } : { assistant: null },
    content: m.content,
  };
}

export function chatErrorToString(err: SpicyAiChatError): string {
  if (err.rateLimited) {
    return `Rate limited. Try again in ${Number(err.rateLimited.resetInSeconds)}s.`;
  }
  if (err.notEnabled) return "SpicyAI orchestrator is not enabled yet.";
  if (err.notConfigured) return "SpicyAI orchestrator is not configured yet.";
  if (err.sessionActive) return "A previous chat is still in progress.";
  if (err.sessionNotFound) return "Chat session not found.";
  if (err.llmError) return err.llmError;
  if (err.blocked) return "That message was blocked. Please rephrase.";
  return "SpicyAI could not respond. Try again.";
}
