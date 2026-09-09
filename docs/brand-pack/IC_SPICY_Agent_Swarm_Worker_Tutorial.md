# IC SPICY Agent Swarm Worker Setup

**Step-by-step guide to run the off-chain agent worker on Mac or Chromebook.**

*For IC SPICY admins setting up newsletter, social drafts, and ops agents.*

---

## What You Are Building

The Agent Swarm has two parts: agent_hub (on-chain brain on ICP) and a Node.js worker (off-chain hands). You control both. The worker uses a BIP39 seed phrase to derive a principal — register that principal in Admin → Agent Swarm → Worker principals.

The hub stores jobs, drafts, approvals, subscribers, secrets, and audit logs. The worker polls for jobs, reads backend data (recipes, orders, weather), calls your LLM API, and submits drafts for your approval before anything is sent.

Never store API keys in git. Only the seed phrase lives on the worker machine (in .env or a file with chmod 600). Resend and LLM keys are set in Admin → Agent Swarm → Secrets.

## Prerequisites

Node.js 20+ (nvm recommended on Mac; Crostini Linux on Chromebook).

- dfx 0.29+ and mops for canister deploys (already in this repo).

- Resend account (resend.com) with a verified sending domain DNS records.

- LLM API key: OpenAI or Anthropic (SpicyAI on-chain fallback is rate-limited).

Admin access to icspicy.app Admin → Agent Swarm tab.

~3T cycles for agent_hub canister on mainnet (one-time create).

## Live Mainnet Canister IDs

All canisters are deployed. Paste these into worker/.env:

AGENT_HUB_CANISTER_ID=swzzi-lyaaa-aaaao-bbfha-cai

BACKEND_CANISTER_ID=ghxmp-xiaaa-aaaao-ba4sq-cai

PUBLIC_SITE_URL=https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io

Related fleet: newsletter qzcaz-uaaaa-aaaao-bbflq-cai, weather concierge qqblf-ciaaa-aaaao-bbfka-cai, weather sentinel qxanr-pqaaa-aaaao-bbfkq-cai, fleet cycles ops q6dgn-zyaaa-aaaao-bbfla-cai.

## Step 1 — Generate Worker Identity

- cd worker && cp .env.example .env

- Generate a new 12-word BIP39 mnemonic (write it on paper; never commit it): node -e "console.log(require('bip39').generateMnemonic())"

- Set WORKER_MNEMONIC="word1 word2 ..." in .env OR save words to ~/.ic-spicy/worker-mnemonic.txt and set WORKER_MNEMONIC_FILE.

- npm install && npm run show-principal — copy the printed principal.

- In Admin → Agent Swarm → Worker principals → Register that principal. Also register it on backend via backend addAgentPrincipal (same Admin flow uses hub; backend agent role enables fleet/orders reads).

## Step 2 — Configure Secrets (Admin UI)

Admin → Agent Swarm → Secrets. Set: resend_api_key, resend_from_email (e.g. newsletter@yourdomain.com), llm_api_key, llm_provider (openai or anthropic), llm_model (e.g. gpt-4o-mini), admin_alert_email (optional), newsletter_reply_to (optional).

- Set AGENT_HUB_CANISTER_ID and BACKEND_CANISTER_ID in worker/.env after deploy (see canister_ids.json).

- Set PUBLIC_SITE_URL to your frontend URL for newsletter confirm links (mainnet: https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io).

## Step 3 — M1 MacBook Air Setup

- Install nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

- nvm install 20 && nvm use 20

Clone or open this repo. cd worker && npm install

- Test one poll cycle: npm run once (requires local or mainnet canisters deployed and worker principal registered).

- Always-on: edit worker/deploy/com.icspicy.agent-worker.plist — replace CHANGE_ME paths with your repo path. mkdir worker/logs

- launchctl load ~/Library/LaunchAgents/com.icspicy.agent-worker.plist (copy plist there first).

- Monitor: tail -f worker/logs/stdout.log

## Step 4 — Chromebook (Crostini Linux)

Settings → Developers → Linux → Turn on. Open Terminal.

- sudo apt update && sudo apt install -y curl git build-essential

- Install nvm and Node 20 (same commands as Mac).

Clone repo into Linux files (~/IC-SPICY-MAIN). cd worker && npm install

Prevent sleep: Settings → Device → Power → Sleep when inactive → Never (while plugged in).

Copy worker/deploy/ic-spicy-agent-worker.service — replace CHANGE_ME paths and User.

- sudo cp ic-spicy-agent-worker.service /etc/systemd/system/ && sudo systemctl daemon-reload

- sudo systemctl enable --now ic-spicy-agent-worker.service

- Check status: sudo systemctl status ic-spicy-agent-worker

## Step 5 — Resend DNS Verification

- In Resend dashboard → Domains → Add domain (your sending domain).

Add the SPF, DKIM, and optional DMARC DNS records Resend provides.

- Wait for verification (usually minutes to hours).

- Use the verified address as resend_from_email in Admin secrets.

Test: subscribe your email via site footer → confirm link → approve newsletter draft in Admin → worker sends on next poll.

## Step 6 — Daily Workflow

- Orchestrator enqueues jobs on a timer inside agent_hub. Worker claims jobs every POLL_INTERVAL_SEC (default 60s).

Social agents submit drafts only — review in Admin → Agent Swarm → Approval Queue. Approve, edit, or reject.

- Newsletter agent creates HTML draft weekly. After approval, worker sends via Resend with idempotency keys (no double-send on retry).

Ops agents (fleet/cycles, weather, orders/claims, analytics) post internal digests to the same queue.

Compliance reviewer runs rule checks + optional LLM review before drafts enter the queue.

## Step 7 — Deploy Canisters

- Local first: dfx start --background --clean && dfx deploy --network local backend agent_hub

- dfx generate backend && pnpm bindgen from repo root.

Frontend: cd src/frontend && pnpm build. Set CANISTER_ID_AGENT_HUB in env for Vite.

- Mainnet (requires explicit confirmation): dfx deploy --network ic agent_hub (~3T cycles), then dfx deploy --network ic backend, then node scripts/upload-frontend.mjs --network ic --canister 7rukv-hqaaa-aaaao-ba6ma-cai

Post-deploy: register worker principal, set secrets, subscribe test email, run npm run once on worker.

## Troubleshooting

- agent only / admin or agent only: worker principal not registered in hub or backend.

- Newsletter service not configured: CANISTER_ID_AGENT_HUB missing in frontend build env.

- Resend 403: domain not verified or wrong from address.

- LLM errors: check llm_api_key and provider/model in Admin secrets.

- Revoke compromised worker: Admin → remove worker principal immediately; rotate mnemonic and re-register.

## Security Checklist

- Seed phrase: paper backup only; chmod 600 on .env and mnemonic file.

Worker is agent role, never full admin.

All public sends require human approval in Admin queue (start here; auto-post later per platform).

Audit log in Admin → Agent Swarm → Audit for every draft and secret change.

Do not log customer email content in worker stdout in production.
