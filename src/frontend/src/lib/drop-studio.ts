export type StudioStatus = {
  tokenId: string;
  perNft: number;
  windowHours: number;
  siteCap: number;
  siteUsed: number;
  siteRemaining: number;
  minSiteCap: number;
  maxSiteCap: number;
};

export type StudioAllowance = {
  accountId: string;
  held: number;
  allowance: number;
  used: number;
  remaining: number;
  siteRemaining: number;
  siteCap: number;
};

export type StudioImage = StudioAllowance & {
  prompt: string;
  mimeType: string;
  imageBase64: string;
  mock?: boolean;
};

let runtimeBase: string | null = null;

export async function ensureDropStudioRuntimeEnv() {
  if (runtimeBase !== null) return;
  try {
    const { loadRuntimeEnv } = await import("./runtime-env");
    const env = await loadRuntimeEnv();
    const u = env.drop_studio_url?.trim();
    if (u) {
      runtimeBase = u.replace(/\/$/, "");
      return;
    }
  } catch {
    /* ignore */
  }
  const fromEnv = import.meta.env.VITE_DROP_STUDIO_URL?.trim();
  if (fromEnv) {
    runtimeBase = fromEnv.replace(/\/$/, "");
    return;
  }
  runtimeBase = "";
}

export async function dropStudioUrl() {
  await ensureDropStudioRuntimeEnv();
  if (runtimeBase) return runtimeBase;
  if (import.meta.env.DEV) return "http://127.0.0.1:8787";
  return "";
}

async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const base = await dropStudioUrl();
  if (!base) {
    throw new Error(
      "Drop studio is offline or not configured. The tunnel URL may need updating — contact the site operator.",
    );
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Could not reach Drop Studio (network error). The studio server or tunnel may be offline — try again later.",
    );
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error || `Studio ${res.status}`);
  return json as T;
}

/** True when GET /v1/drop-studio/status responds OK. */
export async function checkDropStudioHealth(): Promise<boolean> {
  const base = await dropStudioUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/v1/drop-studio/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchStudioStatus() {
  const base = await dropStudioUrl();
  if (!base) return null;
  return fetch(`${base}/v1/drop-studio/status`, { cache: "no-store" }).then(async (res) => {
    if (!res.ok) return null;
    return (await res.json()) as StudioStatus;
  });
}

export function fetchAllowance(accountId: string) {
  return postJson<StudioAllowance>("/v1/drop-studio/allowance", { accountId });
}

export function requestChallenge(accountId: string) {
  return postJson<{ challengeId: string; message: string }>("/v1/drop-studio/challenge", {
    accountId,
  });
}

export type StudioPromptMode = "describe" | "json";

export function generateStudioImage(input: {
  accountId: string;
  challengeId: string;
  signature: string;
  style: string;
  subject: string;
  promptMode?: StudioPromptMode;
}) {
  return postJson<StudioImage>("/v1/drop-studio/generate", input);
}

export function saveStudioCeiling(siteCap: number, token: string) {
  return postJson<StudioStatus>("/v1/drop-studio/ceiling", { siteCap }, token);
}
