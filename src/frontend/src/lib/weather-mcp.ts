/** Weather Desk MCP canister (Phase 5) — public Streamable HTTP at /mcp */
export const WEATHER_MCP_CANISTER_ID =
  (process.env.CANISTER_ID_WEATHER_MCP ?? "").trim() ||
  (typeof window !== "undefined"
    ? (
        (window as unknown as { __WEATHER_MCP_CANISTER_ID__?: string })
          .__WEATHER_MCP_CANISTER_ID__ ?? ""
      ).trim()
    : "") ||
  "z2j4p-4aaaa-aaaao-bbe3q-cai";

export const WEATHER_MCP_URL = WEATHER_MCP_CANISTER_ID
  ? `https://${WEATHER_MCP_CANISTER_ID}.icp0.io/mcp`
  : "";

export const WEATHER_MCP_TOOLS = [
  "get_florida_outlook",
  "get_model_spread",
  "get_tropical_desk",
  "get_grower_brief",
  "get_nursery_conditions",
] as const;

export async function callWeatherMcpTool(
  name: (typeof WEATHER_MCP_TOOLS)[number],
  args: Record<string, unknown> = {},
): Promise<{ ok: boolean; text: string }> {
  if (!WEATHER_MCP_URL) return { ok: false, text: "MCP canister not configured" };
  try {
    const res = await fetch(WEATHER_MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name, arguments: args },
      }),
    });
    if (!res.ok) {
      return { ok: false, text: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      result?: {
        isError?: boolean;
        content?: Array<{ type?: string; text?: string }>;
      };
      error?: { message?: string };
    };
    if (data.error?.message) {
      return { ok: false, text: data.error.message };
    }
    const text = data.result?.content?.[0]?.text ?? JSON.stringify(data);
    return { ok: !data.result?.isError, text };
  } catch (e) {
    return {
      ok: false,
      text: e instanceof Error ? e.message : "MCP call failed",
    };
  }
}
