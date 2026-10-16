# Captain Capsaicin — auto Community + daily posts

## Behavior (2026-09)
- **Standalone posts:** unique OWNER-PAID MiniRouter image required (fail closed).
- **Auto-publish:** IC SPICY Community Garden + Crumbeatr + SWOP (no admin approve).
- **Daily cap:** up to **3** standalone bundles per America/New_York day (`worker/data/captain-daily.json`) — morning / midday / evening ET windows (8 / 13 / 19) via `runCaptainEtScheduler`, plus Crumbeatr agent jobs as backup when slots remain.
- **X teasers:** after each bundle, `promoteCaptainPublishOnX` posts a teaser (max 3/day) with SWOP + Crumbeatr links + JPEG when `x_captain_*` hub secrets are set. OAuth: `node scripts/x-captain-oauth.mjs`; smoke: `node scripts/x-captain-smoke.mjs`.
- **Replies:** up to 3/min across Community, Crumbeatr, and SWOP on Captain's posts.

## Worker env
```bash
MINIROUTER_API_KEY=…
ENABLE_CAPTAIN_IMAGES=true   # default on; false kills live images
MINIROUTER_IMAGE_MOCK=false
CAPTAIN_IMAGES_DAILY_MAX=24
FRONTEND_CANISTER_ID=7rukv-hqaaa-aaaao-ba6ma-cai
FRONTEND_ASSET_IDENTITY_PEM=~/.config/dfx/identity/ic_deploy_plain/identity.pem
BACKEND_CANISTER_ID=ghxmp-xiaaa-aaaao-ba4sq-cai
WORKER_MNEMONIC=…
```

## One-time profile setup
```bash
cd worker && node scripts/setup-captain-community-profile.js
```

## Cadence
Agent hub defaults Crumbeatr/SWOP jobs to 6h (`21600s`). Admins can change per-agent cadence in **Admin → Agent Swarm → Roster → Cadence** (`setAgentCadence` on `agent_hub`, presets include **8h** for ~3 hub jobs/day). **ET scheduler** (`worker/src/lib/captain-et-scheduler.js`) still fires standalone publish in 4h windows after 8 / 13 / 19 ET — slot dedupe is authoritative (max 3 bundles/day). SWOP agent remains likes/replies only; full posts come from Crumbeatr job + ET scheduler.

## Restart worker after deploy
```bash
cd worker && pm2 restart ic-spicy-worker   # or your process manager
```
