# SpicyAi — Dual-Model, Fully On-Chain AI Architecture

> **Audience:** developers who want to build a grounded AI assistant on the
> Internet Computer, using IC SPICY's production implementation as a reference.
>
> **Mainnet IDs (reference only):** `spicy_ai_canister` `pd5wn-sqaaa-aaaao-ba5ca-cai`,
> `llama_cpp` `pw2ha-tyaaa-aaaao-ba5bq-cai`, `docs_backend` `pyyki-iiaaa-aaaao-ba5aq-cai`.

SpicyAi answers questions about pepper growing, Korean Natural Farming, JADAM,
and the IC SPICY platform itself. It is **grounded, not fine-tuned**: instead of
training model weights on our content, every request retrieves the most relevant
passages from our on-chain knowledge base and injects them into the prompt
(retrieval-augmented generation). That distinction matters — the knowledge can be
updated any day by an admin re-seeding documents, with no model retraining.

## The three canisters

```
frontend ──► spicy_ai_canister (coordinator)
                 │
                 ├──► docs_backend      BM25 retrieval over chunked markdown
                 │
                 ├──► LLM canister      fast path — Llama 4 Scout (mo:llm)
                 │    (DFINITY, w36hm-eqaaa-aaaal-qr76a-cai)
                 │
                 └──► llama_cpp         deep path — DeepSeek-R1-Distill-Qwen-1.5B
                      (ONICAI llama_cpp_canister, fully on-chain weights)
```

- **`spicy_ai_canister`** (`src/spicy_ai_canister/main.mo`) — the coordinator.
  Owns sessions, rate limits, retrieval, prompt construction, and routing to one
  of the two model paths. No model weights live here.
- **`docs_backend`** (`src/docs_backend/main.mo`) — the knowledge base. Stores
  the document catalog (markdown + PDF blobs) and a flat array of BM25 chunks
  (~400 tokens each, rebuilt whenever a document is seeded or uploaded, see
  `lib/bm25.mo`). Exposes `queryChunks(query, topK)`.
- **`llama_cpp`** — ONICAI's [llama_cpp_canister](https://github.com/onicai/llama_cpp_canister)
  (v0.9.0 protocol), a port of llama.cpp that runs GGUF models **inside the
  canister**. Inference happens on the IC itself — no HTTPS outcalls, no
  off-chain GPU service.

## The two model paths

### Fast path — `chatWithLlm` (Llama 4 Scout via `mo:llm`)

One update call, full answer returned directly. The coordinator:

1. Runs BM25 retrieval against `docs_backend` for the user's last message.
2. Builds a system prompt: SpicyAi persona + variety-knowledge rules + the
   retrieved context block.
3. Calls DFINITY's LLM canister with `LLM.chat(#Llama4Scout)` and returns the
   response together with `docsReferenced` (the slugs of the source documents),
   so the UI can cite sources.

This is the default path for interactive chat — latency is a single update call.

### Deep path — `startChat` / `continueChat` (DeepSeek on-chain)

The fully on-chain path runs
`deepseek-r1-distill-qwen-1.5b-q4_k_m.gguf` (a 4-bit quantized 1.5B-parameter
DeepSeek-R1 distillation of Qwen) inside the ONICAI canister:

1. `startChat` — BM25 retrieval, ChatML prompt assembly, `new_chat` on
   `llama_cpp` with a per-session prompt-cache file.
2. `continueChat(chatId)` — one `run_update` inference step per call
   (~15–20 s each on mainnet). The frontend polls until `done = true`,
   rendering tokens incrementally.
3. `cancelChat` — cleans up the session and removes the prompt-cache file.

Why keep both? The fast path depends on the DFINITY LLM canister service; the
deep path is **sovereign** — the weights, the KV cache, and every inference
instruction execute in our own canister. It is slower and smaller, but it cannot
be turned off from outside, which is the point of an on-chain-first architecture.

## How the model got on-chain

GGUF weights are far larger than a single ingress message, so
`scripts/upload-deepseek-model.mjs` uploads the file in **1.5 MB chunks**
(sha256-verified) to the `llama_cpp` canister's filesystem, then the model is
loaded once:

```bash
node scripts/upload-deepseek-model.mjs \
  --network ic --canister <llama_cpp_id> \
  --model ./deepseek-r1-distill-qwen-1.5b-q4_k_m.gguf

dfx canister --network ic call llama_cpp load_model '(record {
  args = vec { "-m"; "/models/deepseek-r1-distill-qwen-1.5b-q4_k_m.gguf";
               "--ctx-size"; "512"; "--temp"; "0.1"; "--seed"; "42" }
})'
```

Provision ~20T cycles on the `llama_cpp` canister before a bulk upload.

**Reproducing this:** `vendor/` and `models/` are gitignored, so this repo does
not contain the ONICAI wasm or the GGUF weights. Fetch the canister build from
the [ONICAI repo](https://github.com/onicai/llama_cpp_canister) (`dfx.json`
expects it at `vendor/onicai/build/llama_cpp.wasm`) and the model from
HuggingFace (search `DeepSeek-R1-Distill-Qwen-1.5B GGUF`, Q4_K_M quant).

## How SpicyAi was "trained" (grounding, not fine-tuning)

The knowledge base is curated markdown: natural-farming guides, the masterclass,
platform docs, variety data. `scripts/spicyai-seed.mjs` and
`scripts/upload-app-docs.mjs` push documents into `docs_backend`, which chunks
each one and rebuilds the BM25 index. Adding knowledge = seeding a document;
correcting knowledge = replacing one. No GPU, no training run, no drift between
"what the model was trained on" and "what the docs say."

## Security and privacy posture

- **Zero-log policy** — no question or answer text is ever stored or
  `Debug.print`ed, on either path.
- `requireAuthenticated` on all update methods; `requireAdmin` on all
  configuration methods (model path, canister IDs, persona, rate limits).
- **Per-caller session lock** — one active chat session per principal, so a
  caller cannot stack concurrent inference sessions.
- **Daily rate limit** per principal, enforced in the coordinator.
- Retrieval failures are isolated from LLM failures so instruction-limit traps
  in BM25 are reported accurately instead of as generic model errors.
