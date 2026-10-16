# Captain Capsaicin — MiniRouter image generation

**OWNER-PAID ONLY.** All `api.minirouter.sh` costs are paid by the project owner via pre-funded MiniRouter credits. Never charge users.

## Status
| Phase | Status |
|-------|--------|
| 1 Core service | Done |
| 2 Prompt + ref lock | Done — `/v1/images/edits` + `assets/captain-capsaicin-ref.png` |
| 3 Posting | Done — always on Capsaicin **posts** (not comments); text-only fallback |
| 4 Owner controls | `.env` key + daily max + JSONL spend log |
| 5 Smoke | `scripts/test-minirouter-image.js` |
| 6 Proof of work | Hub audit `captain_pow:…` → Capsaicin admin panel |

## Proof of work (admin)
On each successful live image, the worker appends a compact token to hub `reportRun` detail:

```text
captain_pow:minirouter=req_…;model=…;est=$0.02;mock=0;icp=https://7rukv-….icp0.io/captain-posts/….jpg;blob=…;jpeg=191246B
```

- **MiniRouter** — `requestId` (match Activity at minirouter.sh)
- **ICP** — JPEG on frontend asset canister (`/captain-posts/`)

Admin UI: Agent Swarm → Capsaicin → **Proof of work**. Mock runs are omitted.

## Public share page
- Gallery: `https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io/p/captain`
- Detail: `https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io/p/captain/{id}`
- Artifacts: `/captain-posts/{id}.jpg`, `/captain-posts/{id}.proof.json`, `/captain-posts/index.json`

Worker writes proof JSON on each live upload; post ids are patched after Crumbeatr/SWOP publish.

## worker `.env` (never frontend / never hub)
```bash
MINIROUTER_API_KEY=…          # required for live
# ENABLE_CAPTAIN_IMAGES=false # kill-switch (default: on)
MINIROUTER_IMAGE_MOCK=false
CAPTAIN_IMAGES_DAILY_MAX=24
FRONTEND_CANISTER_ID=7rukv-hqaaa-aaaao-ba6ma-cai
FRONTEND_ASSET_IDENTITY_PEM=/Users/…/.config/dfx/identity/ic_deploy_plain/identity.pem
```

Spend log: `data/minirouter-image-spend.jsonl` (repo root)

## Cost per Capsaicin image post (OWNER-PAID)
One image edit per **post** (not comments). Model: `openai/gpt-image-2.5-sunburst` + ref PNG.

| Quality (`CAPTAIN_IMAGE_QUALITY`) | Typical settled cost | Notes |
|-----------------------------------|----------------------|--------|
| **`low` (required / default)** | **~$0.015–0.02** | MiniRouter edits currently **only** accept `low` + 1024×1024 PNG + n=1 |
| `medium` / `high` | n/a for edits | Return 400 `invalid_request`; client clamps to `low` so Capsaicin posts keep working |

Math (OpenAI GPT-Image-2.5 rates MiniRouter passes through): text in $5/M, image in $8/M, image out $30/M. MiniRouter: **1000 credits = $1**. Exact charge is in Activity / `x-minirouter-cost-usd` / spend JSONL `costEstimate`.

ICP upload + Crumbeatr/SWOP posting are **cycles/fees**, not MiniRouter credits (usually << $0.01 equivalent).

## Flow
1. `editCaptainImage(JSON prompt)` — sunburst + ref PNG (identity lock); camera angle rotates per post
2. JPEG compress &lt; 450KB
3. **Crumbeatr** — `add_post` with blob + markdown `![…](/blob/{id})` (bare `/blob/id` does **not** render)
4. **SWOP** — upload JPEG to frontend `/captain-posts/*.jpg`, attach via native `mediaRef` (`mediaId` = https image URL, `mimeType=image/jpeg`, `Public`). Markdown images are **not** rendered by SWOP.
5. Live runs always upload to ICP frontend for proof-of-work (even Crumbeatr-only posts)

## Smoke
```bash
cd worker
MINIROUTER_IMAGE_MOCK=true node scripts/test-minirouter-image.js
MINIROUTER_IMAGE_MOCK=true node scripts/test-minirouter-image.js --prepare
# live (OWNER-PAID):
# MINIROUTER_API_KEY=… node scripts/test-minirouter-image.js --live
```

Restart `com.icspicy.agent-worker` after setting `.env`.


See also: [captain-auto-community.md](./captain-auto-community.md) — daily Community + auto replies.
