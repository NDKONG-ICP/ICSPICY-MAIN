import { Actor, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import type { SpicyChatTurn } from "./spicyai-idl";

export const DOCS_BACKEND_CANISTER_ID =
  (process.env.CANISTER_ID_DOCS_BACKEND ?? "").trim() ||
  (typeof window !== "undefined"
    ? (
        (window as unknown as { __DOCS_BACKEND_ID__?: string })
          .__DOCS_BACKEND_ID__ ?? ""
      ).trim()
    : "") ||
  "pyyki-iiaaa-aaaao-ba5aq-cai";

const docsChatIdlFactory: IDL.InterfaceFactory = ({ IDL }) => {
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

  return IDL.Service({
    askSpicyAi: IDL.Func([ChatRequest], [ChatResponse], []),
  });
};

type ChatResponseCandid =
  | { ok: { response: string; docsReferenced: string[] } }
  | {
      err: {
        rateLimited?: { resetInSeconds: bigint };
        blocked?: null;
        llmError?: string;
        noContent?: null;
      };
    };

interface DocsChatActor {
  askSpicyAi(req: {
    messages: Array<{
      role: { user: null } | { assistant: null };
      content: string;
    }>;
  }): Promise<ChatResponseCandid>;
}

export type DocsChatResult =
  | { ok: true; response: string; docsReferenced: string[] }
  | { ok: false; error: { type: string; message: string } };

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

let cachedActor: DocsChatActor | null = null;

export function getDocsBackendChatActor(): DocsChatActor | null {
  if (cachedActor) return cachedActor;
  if (!DOCS_BACKEND_CANISTER_ID) return null;

  const agent = HttpAgent.createSync({ host: resolveHost() });
  if (isLocalNetwork()) {
    agent.fetchRootKey().catch(() => {});
  }
  cachedActor = Actor.createActor<DocsChatActor>(docsChatIdlFactory, {
    agent,
    canisterId: DOCS_BACKEND_CANISTER_ID,
  });
  return cachedActor;
}

export function toDocsChatMessage(m: SpicyChatTurn) {
  return {
    role:
      m.role === "user"
        ? ({ user: null } as const)
        : ({ assistant: null } as const),
    content: m.content,
  };
}

export function fromDocsChatResponse(c: ChatResponseCandid): DocsChatResult {
  if ("ok" in c) {
    return {
      ok: true,
      response: c.ok.response,
      docsReferenced: c.ok.docsReferenced,
    };
  }
  if (c.err.rateLimited) {
    const mins = Math.ceil(Number(c.err.rateLimited.resetInSeconds) / 60);
    return {
      ok: false,
      error: {
        type: "rateLimited",
        message: `Daily limit reached. Try again in about ${mins} minutes.`,
      },
    };
  }
  if (c.err.blocked != null) {
    return {
      ok: false,
      error: { type: "blocked", message: "Message blocked. Please rephrase." },
    };
  }
  if (c.err.llmError) {
    return { ok: false, error: { type: "llmError", message: c.err.llmError } };
  }
  return {
    ok: false,
    error: {
      type: "noContent",
      message: "SpicyAI is temporarily unavailable.",
    },
  };
}
