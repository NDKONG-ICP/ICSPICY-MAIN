---
title: Masterclass → docs_backend RAG ingestion plan
status: PLAN_ONLY — do not execute until William approves lesson content
---

# RAG Prep (not executed)

## Target canister
- **docs_backend:** `pyyki-iiaaa-aaaao-ba5aq-cai`
- **Cycles (checked 2026-07-09):** ~**918B** (~0.92T)
- Gate note: below the 1T comfort line used for frontend deploys. Top up before any bulk seed/ingest. Report only this round — **no ingestion**.

## How indexing works today
There is no literal `namespace` field. Partitioning is by:

| Field | Masterclass value |
|---|---|
| `collection` | `"masterclass"` |
| `category` | `"masterclass"` (add category via `seedCategories` / admin upsert) |
| `slug` | `mc-{module}-{lesson}` e.g. `mc-01-01-soil-food-web` |
| markdown | lesson body (Core + Deeper Heat + Grow It Live + Further Reading) |
| tags | `["masterclass","module-1","soil-food-web","quiz:m1-l1", …]` |

Pipeline mirrors existing docs:
1. Approve markdown in `content/masterclass/`
2. Catalog generator (extend `scripts/generate-docs-catalog.mjs` **or** a dedicated `scripts/seed-masterclass.mjs`) reads approved files
3. `upsertDocument` + `uploadDocumentMarkdown` / `seedMarkdowns`
4. `rebuildChunksForSlug` → BM25 chunks (~400 tokens) in `_chunks`

## SpicyAI tutoring use
- `askSpicyAi` / `queryChunks` already retrieve across `_chunks`.
- Quiz miss explainers: pass quizId + wrong answer + lesson slug as query context; retrieve `mc-*` chunks first (tag boost or collection filter if we add one later).
- **Do not** re-ingest CookBook/Pepperpedia into masterclass — link out; those corpora already exist (`natural-farming`, `pepperpedia`).

## Safety
- Only ingest files with `status: approved` (after William clears `REVIEW_REQUIRED`).
- Strip frontmatter `REVIEW_REQUIRED` / draft notes before upload, or keep a `draft: true` tag and exclude from retrieval until approved.
- Never ingest third-party course transcripts.

## Suggested first ingest (later)
1. Top up `pyyki` above 1.5T
2. Seed category `masterclass`
3. Ingest **approved** 1.1 + 2.1 only as a smoke test
4. Query: `"what is the soil food web"` and `"FPJ dilution for peppers"` — confirm chunks hit `mc-*` slugs
5. Then batch remaining modules
