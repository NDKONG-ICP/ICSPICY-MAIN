// Per-task LLM routing.
//
// Secrets (all set in Admin → Agent Swarm → Secrets):
//   llm_api_key_anthropic / llm_api_key_openai — provider keys (either or both)
//   llm_route_<task> — optional per-task route "provider:model",
//     e.g. "anthropic:claude-sonnet-4-5". Tasks: default, social, newsletter,
//     almanac, sentinel, analytics, compliance, email.
//
// Legacy compat: if only llm_api_key + llm_provider + llm_model are set (the
// original single-model config), every task uses exactly that model, same as
// before this router existed.
//
// Zero-config defaults once a provider key exists: heavy tasks (newsletter,
// almanac, sentinel — long-form public prose) get the Sonnet/4o tier; all
// high-volume short tasks get the Haiku/4o-mini tier.

const PROVIDER_DEFAULTS = {
  anthropic: { light: "claude-haiku-4-5", heavy: "claude-sonnet-4-5" },
  openai: { light: "gpt-4o-mini", heavy: "gpt-4o" },
};

const HEAVY_TASKS = new Set(["newsletter", "almanac", "sentinel"]);

export const LLM_TASKS = [
  "default",
  "social",
  "newsletter",
  "almanac",
  "sentinel",
  "analytics",
  "compliance",
  "email",
];

export const LLM_SECRET_NAMES = [
  "llm_api_key",
  "llm_provider",
  "llm_model",
  "llm_api_key_anthropic",
  "llm_api_key_openai",
  ...LLM_TASKS.map((t) => `llm_route_${t}`),
];

/** Map an agent job kind to its LLM task family. */
export function taskFamilyOf(kindKey) {
  if (kindKey.startsWith("social_")) return "social";
  switch (kindKey) {
    case "newsletter":
      return "newsletter";
    case "weather_concierge":
      return "almanac";
    case "weather_sentinel":
      return "sentinel";
    case "analytics_digest":
      return "analytics";
    case "email_correspondence":
      return "email";
    default:
      return "default";
  }
}

function makeClient(provider, model, apiKey) {
  return {
    provider,
    model,
    async complete(prompt) {
      if (provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 2048,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return data.content?.[0]?.text ?? "";
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    },
  };
}

export function createLlmRouter(secrets) {
  const legacyProvider = secrets.llm_provider ?? "openai";
  const keys = {
    anthropic:
      secrets.llm_api_key_anthropic ||
      (legacyProvider === "anthropic" ? secrets.llm_api_key : undefined),
    openai:
      secrets.llm_api_key_openai ||
      (legacyProvider !== "anthropic" ? secrets.llm_api_key : undefined),
  };
  const primaryProvider = keys.anthropic ? "anthropic" : keys.openai ? "openai" : null;

  // Pure legacy mode: single key via llm_api_key, no per-provider keys, no routes —
  // behave exactly like the original single-model client.
  const hasRoutes = LLM_TASKS.some((t) => secrets[`llm_route_${t}`]);
  const legacyMode =
    !secrets.llm_api_key_anthropic && !secrets.llm_api_key_openai && !hasRoutes;

  const cache = new Map();

  function parseRoute(spec) {
    if (!spec || typeof spec !== "string") return null;
    const idx = spec.indexOf(":");
    const provider = (idx === -1 ? spec : spec.slice(0, idx)).trim().toLowerCase();
    const model = idx === -1 ? "" : spec.slice(idx + 1).trim();
    if (provider !== "anthropic" && provider !== "openai") return null;
    return { provider, model };
  }

  function resolve(task) {
    if (!primaryProvider) return null;

    if (legacyMode) {
      const model =
        secrets.llm_model ?? PROVIDER_DEFAULTS[legacyProvider]?.light ?? "gpt-4o-mini";
      return { provider: legacyProvider, model };
    }

    const route =
      parseRoute(secrets[`llm_route_${task}`]) ?? parseRoute(secrets.llm_route_default);
    if (route && keys[route.provider]) {
      const tier = HEAVY_TASKS.has(task) ? "heavy" : "light";
      return {
        provider: route.provider,
        model: route.model || PROVIDER_DEFAULTS[route.provider][tier],
      };
    }

    const tier = HEAVY_TASKS.has(task) ? "heavy" : "light";
    return { provider: primaryProvider, model: PROVIDER_DEFAULTS[primaryProvider][tier] };
  }

  return {
    hasAnyProvider: primaryProvider !== null,
    /** Get an LLM client for a task family, or null when no key is configured. */
    for(task) {
      const spec = resolve(task);
      if (!spec) return null;
      const cacheKey = `${spec.provider}:${spec.model}`;
      if (!cache.has(cacheKey)) {
        cache.set(cacheKey, makeClient(spec.provider, spec.model, keys[spec.provider]));
      }
      return cache.get(cacheKey);
    },
  };
}
