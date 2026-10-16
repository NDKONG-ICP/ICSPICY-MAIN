/**
 * MiniRouter Images client for Captain Capsaicin.
 *
 * OWNER-PAID ONLY: All minirouter.sh costs are paid solely by the project
 * owner via pre-funded MiniRouter credits (USDC/SOL/etc.). No costs are ever
 * passed to end users, followers, or anyone interacting with the agent.
 *
 * Auth: MINIROUTER_API_KEY in worker .env only (never frontend / hub / on-chain).
 * Generate: POST /v1/images/generations
 * Identity lock: POST /v1/images/edits (+ captain-capsaicin-ref.png)
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MINIROUTER_BASE_URL =
  process.env.MINIROUTER_BASE_URL?.trim() || "https://api.minirouter.sh/v1";

export const CAPTAIN_REF_PNG = join(
  __dirname,
  "../../assets/captain-capsaicin-ref.png",
);

/** Current supported image models (extend when MiniRouter adds quality tiers). */
export const MINIROUTER_IMAGE_MODELS = Object.freeze({
  flare: "openai/gpt-image-2.5-flare",
  sunburst: "openai/gpt-image-2.5-sunburst",
});

export const DEFAULT_IMAGE_OPTIONS = Object.freeze({
  model: MINIROUTER_IMAGE_MODELS.flare,
  quality: "low",
  size: "1024x1024",
  output_format: "png",
  n: 1,
});

/** Edits use sunburst for tighter identity lock to the reference PNG. */
export const DEFAULT_EDIT_OPTIONS = Object.freeze({
  model: MINIROUTER_IMAGE_MODELS.sunburst,
  // MiniRouter edits currently only accept quality=low (1024x1024 PNG, n=1).
  // medium/high return 400 invalid_request — see spend log 2026-09-13+.
  quality: resolveEditQuality(),
  size: "1024x1024",
  output_format: "png",
  n: 1,
});

/**
 * MiniRouter `/v1/images/edits` qualifies only `low` today.
 * Env CAPTAIN_IMAGE_QUALITY is clamped so a stale medium/high setting cannot break posts.
 */
export function resolveEditQuality() {
  return resolveEditQualityFrom(process.env.CAPTAIN_IMAGE_QUALITY || "low");
}

export function resolveEditQualityFrom(value) {
  const raw = String(value || "low").trim().toLowerCase();
  if (raw === "low") return "low";
  if (raw === "medium" || raw === "high") {
    console.warn(
      `[minirouter-images] quality=${raw} not allowed for edits; forcing low`,
    );
    return "low";
  }
  return "low";
}

/** Official GPT-Image-2.5 rates ($ / 1M tokens) — MiniRouter passes through. */
export const GPT_IMAGE_RATES = Object.freeze({
  textInputPerM: 5,
  imageInputPerM: 8,
  imageOutputPerM: 30,
});

/**
 * Estimate USD from Images API usage object.
 * Prefer response header / usage.cost when MiniRouter provides it.
 */
export function estimateImageCostUsd(usage, headerCost) {
  const fromHeader = Number(headerCost);
  if (Number.isFinite(fromHeader) && fromHeader > 0) return fromHeader;
  const fromUsageCost = Number(usage?.cost ?? usage?.cost_usd);
  if (Number.isFinite(fromUsageCost) && fromUsageCost > 0) return fromUsageCost;

  const textIn = Number(
    usage?.input_tokens_details?.text_tokens ?? usage?.input_tokens_details?.text ?? 0,
  );
  const imageIn = Number(
    usage?.input_tokens_details?.image_tokens ??
      usage?.input_tokens_details?.image ??
      0,
  );
  const out = Number(usage?.output_tokens ?? 0);
  if (!textIn && !imageIn && !out) {
    return Number(process.env.MINIROUTER_IMAGE_COST_ESTIMATE ?? 0.02);
  }
  const usd =
    (textIn / 1e6) * GPT_IMAGE_RATES.textInputPerM +
    (imageIn / 1e6) * GPT_IMAGE_RATES.imageInputPerM +
    (out / 1e6) * GPT_IMAGE_RATES.imageOutputPerM;
  return Math.round(usd * 1e6) / 1e6;
}

const DEFAULT_LOG_PATH = join(
  __dirname,
  "../../../data/minirouter-image-spend.jsonl",
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function apiKey() {
  return (
    process.env.MINIROUTER_API_KEY?.trim() ||
    process.env.MINIROUTER_KEY?.trim() ||
    ""
  );
}

/** Always-on Capsaicin posts; set ENABLE_CAPTAIN_IMAGES=false to kill-switch. */
function imagesEnabled() {
  const v = process.env.ENABLE_CAPTAIN_IMAGES;
  if (v === undefined || v === "") return true;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function mockMode() {
  const v = (process.env.MINIROUTER_IMAGE_MOCK ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function dailyMax() {
  const n = Number(process.env.CAPTAIN_IMAGES_DAILY_MAX ?? 24);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 24;
}

const MOCK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export function logImageGeneration(entry, logPath = DEFAULT_LOG_PATH) {
  mkdirSync(dirname(logPath), { recursive: true });
  const row = {
    at: new Date().toISOString(),
    ownerPaidOnly: true,
    ...entry,
  };
  appendFileSync(logPath, `${JSON.stringify(row)}\n`, "utf8");
  return row;
}

function countTodaySuccesses(logPath = DEFAULT_LOG_PATH) {
  if (!existsSync(logPath)) return 0;
  const day = new Date().toISOString().slice(0, 10);
  try {
    const text = readFileSync(logPath, "utf8");
    return text
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(
        (e) =>
          e &&
          e.ok === true &&
          e.mock !== true &&
          e.mode !== "holder" &&
          String(e.at || "").startsWith(day),
      ).length;
  } catch {
    return 0;
  }
}

function extractBase64(payload) {
  if (!payload || typeof payload !== "object") return null;
  const data = payload.data;
  if (Array.isArray(data) && data[0]) {
    const row = data[0];
    if (typeof row.b64_json === "string") return row.b64_json;
    if (typeof row.b64 === "string") return row.b64;
    if (typeof row.base64 === "string") return row.base64;
  }
  if (typeof payload.b64_json === "string") return payload.b64_json;
  if (typeof payload.image_base64 === "string") return payload.image_base64;
  return null;
}

function assertCanSpend({ force, dry }) {
  if (!force && !imagesEnabled() && !dry) {
    const err = new Error(
      "Captain images disabled (ENABLE_CAPTAIN_IMAGES=false). OWNER-PAID MiniRouter credits only.",
    );
    err.code = "IMAGES_DISABLED";
    throw err;
  }
  if (!dry) {
    const used = countTodaySuccesses();
    const max = dailyMax();
    if (used >= max) {
      const err = new Error(
        `Daily image budget reached (${used}/${max}). OWNER-PAID guard.`,
      );
      err.code = "DAILY_BUDGET";
      throw err;
    }
  }
}

function mockResult(prompt, model) {
  const bytes = Buffer.from(MOCK_PNG_BASE64, "base64");
  const result = {
    base64: MOCK_PNG_BASE64,
    mimeType: "image/png",
    bytes,
    model,
    prompt,
    mock: true,
    costEstimate: 0,
    mode: "mock",
  };
  logImageGeneration({
    ok: true,
    mock: true,
    model,
    promptPreview: prompt.slice(0, 180),
    bytes: bytes.length,
    costEstimate: 0,
  });
  console.log(
    `[minirouter-images] MOCK (${bytes.length} B) — no owner credits spent`,
  );
  return result;
}

/**
 * Text-to-image (no reference). Prefer editCaptainImage for brand lock.
 */
export async function generateCaptainImage(prompt, options = {}) {
  const text = String(prompt || "").trim();
  if (!text) throw new Error("generateCaptainImage: prompt is required");

  const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };
  const dry = Boolean(options.dryRun) || mockMode();
  assertCanSpend({ force: Boolean(options.force), dry });
  if (dry) return mockResult(text, opts.model);

  const key = apiKey();
  if (!key) {
    const err = new Error("MINIROUTER_API_KEY missing in worker .env (OWNER-PAID).");
    err.code = "NO_API_KEY";
    throw err;
  }

  const body = {
    model: opts.model,
    prompt: text,
    quality: opts.quality,
    size: opts.size,
    output_format: opts.output_format,
    n: opts.n ?? 1,
  };

  return postJsonGenerations({
    key,
    body,
    prompt: text,
    model: opts.model,
    maxRetries: Number(options.maxRetries ?? 3),
    mode: "generations",
  });
}

/**
 * Identity-locked edit: reference PNG + scene prompt via /v1/images/edits.
 * Default path for Capsaicin posts (sunburst model).
 */
export async function editCaptainImage(prompt, options = {}) {
  const text = String(prompt || "").trim();
  if (!text) throw new Error("editCaptainImage: prompt is required");

  const opts = { ...DEFAULT_EDIT_OPTIONS, ...options };
  // Re-clamp after options merge — callers must not sneak medium/high past MiniRouter.
  opts.quality = resolveEditQualityFrom(opts.quality);
  const dry = Boolean(options.dryRun) || mockMode();
  assertCanSpend({ force: Boolean(options.force), dry });
  if (dry) return mockResult(text, opts.model);

  const key = apiKey();
  if (!key) {
    const err = new Error("MINIROUTER_API_KEY missing in worker .env (OWNER-PAID).");
    err.code = "NO_API_KEY";
    throw err;
  }

  const refPath = options.referencePath || CAPTAIN_REF_PNG;
  if (!existsSync(refPath)) {
    throw new Error(`Captain reference PNG missing: ${refPath}`);
  }
  // MiniRouter requires a real image/png at 1024×1024 (our asset was once a mislabeled JPEG).
  const sharp = (await import("sharp")).default;
  const refBytes = await sharp(readFileSync(refPath))
    .resize(1024, 1024, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const maxRetries = Math.max(0, Number(options.maxRetries ?? 3));
  let lastErr = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      console.warn(
        `[minirouter-images] edits retry ${attempt}/${maxRetries} after ${backoff}ms`,
      );
      await sleep(backoff);
    }
    const t0 = Date.now();
    try {
      const form = new FormData();
      form.append("model", opts.model);
      form.append("prompt", text);
      form.append("quality", opts.quality);
      form.append("size", opts.size);
      form.append("output_format", opts.output_format);
      form.append("n", String(opts.n ?? 1));
      form.append(
        "image",
        new Blob([new Uint8Array(refBytes)], { type: "image/png" }),
        "captain-capsaicin-ref.png",
      );

      const res = await fetch(`${MINIROUTER_BASE_URL}/images/edits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
        body: form,
        signal: AbortSignal.timeout(120_000),
      });

      const requestId =
        res.headers.get("x-request-id") ||
        res.headers.get("x-minirouter-request-id") ||
        undefined;
      const headerCost =
        res.headers.get("x-minirouter-cost-usd") ||
        res.headers.get("x-minirouter-cost");
      const rawText = await res.text();
      let payload = null;
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        payload = { raw: rawText.slice(0, 500) };
      }

      if (!res.ok) {
        const msg = `MiniRouter edits ${res.status}: ${rawText.slice(0, 400)}`;
        const transient = res.status === 429 || res.status >= 500;
        lastErr = new Error(msg);
        lastErr.status = res.status;
        lastErr.transient = transient;
        logImageGeneration({
          ok: false,
          mode: "edits",
          model: opts.model,
          promptPreview: text.slice(0, 180),
          status: res.status,
          requestId,
          error: msg.slice(0, 400),
          attempt,
          ms: Date.now() - t0,
        });
        if (transient && attempt < maxRetries) continue;
        throw lastErr;
      }

      const base64 = extractBase64(payload);
      if (!base64) {
        throw new Error(
          `MiniRouter edits missing base64: ${rawText.slice(0, 300)}`,
        );
      }
      const bytes = Buffer.from(base64, "base64");
      const usage = payload?.usage ?? undefined;
      const costEstimate = estimateImageCostUsd(usage, headerCost);
      const result = {
        base64,
        mimeType: "image/png",
        bytes,
        model: opts.model,
        prompt: text,
        mock: false,
        requestId,
        costEstimate,
        usage,
        mode: "edits",
        quality: opts.quality,
      };
      logImageGeneration({
        ok: true,
        mock: false,
        mode: "edits",
        model: opts.model,
        quality: opts.quality,
        promptPreview: text.slice(0, 180),
        bytes: bytes.length,
        requestId,
        costEstimate,
        usage: result.usage,
        ms: Date.now() - t0,
        note: "OWNER-PAID — check MiniRouter Activity for settled charge",
      });
      console.log(
        `[minirouter-images] edits OK ${bytes.length} B model=${opts.model} ` +
          `q=${opts.quality} est≈$${costEstimate} requestId=${requestId ?? "?"} OWNER-PAID`,
      );
      return result;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const transient =
        lastErr.transient ||
        lastErr.name === "TimeoutError" ||
        /fetch failed|ECONNRESET|ETIMEDOUT|network/i.test(lastErr.message);
      if (transient && attempt < maxRetries) continue;
      throw lastErr;
    }
  }
  throw lastErr ?? new Error("editCaptainImage failed");
}

async function postJsonGenerations({
  key,
  body,
  prompt,
  model,
  maxRetries,
  mode,
}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      await sleep(backoff);
    }
    const t0 = Date.now();
    try {
      const res = await fetch(`${MINIROUTER_BASE_URL}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
      const requestId =
        res.headers.get("x-request-id") ||
        res.headers.get("x-minirouter-request-id") ||
        undefined;
      const rawText = await res.text();
      let payload = null;
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        payload = { raw: rawText.slice(0, 500) };
      }
      if (!res.ok) {
        const msg = `MiniRouter ${res.status}: ${rawText.slice(0, 400)}`;
        lastErr = new Error(msg);
        lastErr.status = res.status;
        lastErr.transient = res.status === 429 || res.status >= 500;
        logImageGeneration({
          ok: false,
          mode,
          model,
          promptPreview: prompt.slice(0, 180),
          status: res.status,
          requestId,
          error: msg.slice(0, 400),
          attempt,
          ms: Date.now() - t0,
        });
        if (lastErr.transient && attempt < maxRetries) continue;
        throw lastErr;
      }
      const base64 = extractBase64(payload);
      if (!base64) {
        throw new Error(`MiniRouter missing base64: ${rawText.slice(0, 300)}`);
      }
      const bytes = Buffer.from(base64, "base64");
      const costEstimate = Number(
        process.env.MINIROUTER_IMAGE_COST_ESTIMATE ?? 0.015,
      );
      const result = {
        base64,
        mimeType: "image/png",
        bytes,
        model,
        prompt,
        mock: false,
        requestId,
        costEstimate,
        usage: payload?.usage ?? undefined,
        mode,
      };
      logImageGeneration({
        ok: true,
        mock: false,
        mode,
        model,
        promptPreview: prompt.slice(0, 180),
        bytes: bytes.length,
        requestId,
        costEstimate,
        ms: Date.now() - t0,
        note: "OWNER-PAID",
      });
      return result;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const transient =
        lastErr.transient ||
        lastErr.name === "TimeoutError" ||
        /fetch failed|ECONNRESET|ETIMEDOUT/i.test(lastErr.message);
      if (transient && attempt < maxRetries) continue;
      throw lastErr;
    }
  }
  throw lastErr ?? new Error("generateCaptainImage failed");
}

/**
 * Holder studio generations. They do not consume Captain's daily image cap.
 * OWNER-PAID MiniRouter credits still pay for a live call.
 */
export async function generateHolderImage(prompt, options = {}) {
  const text = String(prompt || "").trim();
  if (!text) throw new Error("generateHolderImage: prompt is required");
  if (String(process.env.DROP_STUDIO_ENABLED || "").toLowerCase() === "false") {
    throw new Error("Drop studio images are turned off");
  }
  const envModel = process.env.DROP_STUDIO_IMAGE_MODEL?.trim();
  const primaryModel = options.model || envModel || DEFAULT_IMAGE_OPTIONS.model;
  const opts = {
    ...DEFAULT_IMAGE_OPTIONS,
    ...options,
    model: primaryModel,
    quality: "low",
    n: 1,
  };
  const dry = Boolean(options.dryRun) || mockMode();
  if (dry) return mockResult(text, opts.model);
  const key = apiKey();
  if (!key) {
    const err = new Error("MINIROUTER_API_KEY missing in worker .env (OWNER-PAID).");
    err.code = "NO_API_KEY";
    throw err;
  }
  const fallbackModels = [
    opts.model,
    MINIROUTER_IMAGE_MODELS.sunburst,
    MINIROUTER_IMAGE_MODELS.flare,
    "minirouter/auto",
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastErr = null;
  for (const model of fallbackModels) {
    try {
      return await postJsonGenerations({
        key,
        body: {
          model,
          prompt: text,
          quality: "low",
          size: opts.size,
          output_format: "png",
          n: 1,
        },
        prompt: text,
        model,
        maxRetries: Number(options.maxRetries ?? 3),
        mode: "holder",
      });
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const tryNext =
        lastErr.status === 503 &&
        fallbackModels.indexOf(model) < fallbackModels.length - 1;
      if (tryNext) {
        console.warn(
          `[minirouter-images] holder ${model} unavailable (503), trying fallback…`,
        );
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr ?? new Error("generateHolderImage failed");
}

export function captainImagesConfig() {
  return {
    enabled: imagesEnabled(),
    mock: mockMode(),
    hasApiKey: Boolean(apiKey()),
    dailyMax: dailyMax(),
    usedToday: countTodaySuccesses(),
    baseUrl: MINIROUTER_BASE_URL,
    defaultModel: DEFAULT_EDIT_OPTIONS.model,
    referencePng: CAPTAIN_REF_PNG,
    referenceExists: existsSync(CAPTAIN_REF_PNG),
    ownerPaidOnly: true,
  };
}
