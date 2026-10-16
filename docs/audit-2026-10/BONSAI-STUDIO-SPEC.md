# Bonsai Studio — MiniRouter + ckSOL utility (design spec, security-first)

> Status: proposal, reviewed against the repo and this audit. This is a **feature spec**,
> not a single task — it is split into phased tasks at the end. Read AUDIT.md first: this
> feature re-touches F-01/F-03 (amount trust), F-04 (holder gate), F-10/F-14 (worker + API
> key custody), and the off-chain-custody constraints in PROJECT_CONTEXT.

## What the owner asked for
1. A Bonsai-collection utility tied to Captain Capsaicin's Bonsai drop.
2. Bonsai Drop holders get **10 free image generations** (parity with Hedera SentX holders).
3. A **luxury glassmorphism UI** with an animated cinematic bonsai-chili background.
4. Holders can **pay with ckSOL** for extra prompts through MiniRouter; ckSOL is converted to
   MINI and directed to the MiniRouter wallet the owner already funds.
5. Being a Bonsai Drop holder also **expands the MiniRouter experience**: the holder can
   choose which AI service/model MiniRouter exposes.

## Verified repo facts (corrections to the Cursor draft)
| Claim | Reality in repo |
|-------|-----------------|
| "Bonsai drop = 888 @ 1.2 ICP" | **LOCKED: eligibility = the 888 PepperHeads**, not the `manifest.json` set (that file's `eligibleCount: 7995` is a different artifact and is **not** used for this gate). PepperHeads are a contiguous range with an existing predicate — see below. |
| "Choose what AI service MiniRouter allows" (broad catalog) | `worker/src/clients/minirouter-images.js` wires only `flare`/`sunburst` (OpenAI GPT-image tiers). The picker is a **curated allowlist** of whatever MiniRouter actually exposes to your key, image-models only. |
| Holder gate | Reuse the Hedera pattern (`worker/src/lib/hedera-drop-studio.js`: `PER_NFT=10`, `siteCap`, 24h window, challenge, refund). Bonsai gate = ICRC-7 ownership of the **caller's II principal** ∩ the Bonsai token set. |
| ckSOL → MINI | No native on-ICP swap. Correct: treat conversion as **off-session treasury ops**, never a browser action. ckSOL ledger `ls5lp-lqaaa-aaaar-qb5oa-cai`, minter `lh22c-kyaaa-aaaar-qb5nq-cai` (verify before hardcoding). |

## Non-negotiable security guardrails (from this audit)
1. **The backend canister is authoritative for money and credits — not the worker.** The
   worker holds the MiniRouter key and calls the image API; it must **not** decide how many
   paid credits a ckSOL payment buys. The F-14 tunnel/worker is the weakest trust link —
   putting payment math there repeats F-01/F-03 in a place with even less auditability.
   - Flow: user pays ckSOL via ICRC-2 **to the backend canister** → backend verifies the
     on-ledger amount server-side → backend credits `paidRemaining` → backend issues a
     short-lived, signed **capability token** → worker accepts only that token to spend
     owner MiniRouter credits. The worker never sees ckSOL and never prices anything.
2. **Never trust a client-reported amount or model cost** (F-01/F-03). Quote paid packs in
   ckSOL from a USD target with margin, computed in the canister; verify the actual ICRC-2
   `transfer_from`/received balance equals the quote before crediting. Fail closed if the
   oracle (Task 13) has no fresh ckSOL price.
3. **Holder gate uses the caller's own principal**, intersected with the **PepperHead** set —
   do **not** use `linkWallet` balances (F-04) for eligibility, and do **not** build a second
   NFT registry. Eligibility = "the caller's II principal owns ≥1 token for which
   `isPepperHead(tokenId)` is true." The predicate already exists in `src/backend/lib/icrc7.mo`
   (pool IDs 7838–8725, i.e. token IDs 7839–8726: 50 Founder + 838 Rare PepperHead = 888).
   Count held PepperHeads by intersecting the caller's owned tokens (`icrc7Balances` /
   `icrc7_tokens_of`) with that range — a single range check, no manifest lookup.
4. **ckSOL custody = treasury, not an operator laptop.** The receiving principal should be a
   canister (reuse/extend `treasury_canister` patterns: audit log, two-admin on outflow).
   Routing ckSOL/SOL/MINI value to "the wallet I fund" is a **financial transfer the OWNER
   performs** — an implementing agent must not execute swaps/withdrawals (prohibited action);
   it only writes the runbook.
5. **Disclosure.** Mixing a second-chain token (MINI) and routing value to an owner wallet,
   in a project heading to a SPICY LGE, must be reflected in the tokenomics/utility
   disclosure (PROJECT_CONTEXT §Tokenomics disclosure). Flag for the owner/legal; agents do
   not author it.
6. **Worker hardening still required** regardless (depends on Task 14): stable authenticated
   origin, admin token on all state-changing routes, MiniRouter key never leaves the worker.
7. **Image content moderation / prompt abuse**: generations are owner-paid or paid credits —
   add a prompt allow/deny filter and a per-principal + global ceiling (ties to F-16) so a
   holder can't burn the owner's MiniRouter balance or generate disallowed content.

## Recommended architecture
```
Browser (II)                         backend canister (ghxmp-…)                worker (MiniRouter key)
  │  prove Bonsai hold  ──────────►  icrc7 ownership ∩ bonsai set
  │                                   → freeRemaining = 10 × heldBonsai / 24h
  │  pay ckSOL (ICRC-2) ──────────►  verify received amount == server quote
  │                                   → paidRemaining += packSize
  │  request generation ─────────►   consume free→paid; issue signed capability ──► accept cap, call /v1/images/generations
  │                                                                                  (owner MINIROUTER_API_KEY)
  │                                   on MiniRouter 5xx: refund the consumed bucket ◄── report failure
  OWNER (off-session, manual): withdraw ckSOL→SOL (ckSOL minter) → swap SOL→MINI (Jupiter) → deposit MINI into MiniRouter wallet
```
Two credit buckets in one ledger (mirror Hedera): `freeRemaining` (10 × held Bonsai / rolling
24h), `paidRemaining` (ckSOL-settled), plus a global `siteCap`. Consume free first, then paid;
refund the correct bucket on MiniRouter failure (the Hedera studio already does this).

## Decisions to lock before coding (unchanged questions from the draft + audit-driven ones)
1. ~~**Eligibility set**~~ **LOCKED (owner, 2026-10-16): the 888 PepperHeads** — gate via the
   existing `isPepperHead(tokenId)` range check against the caller's owned tokens. The 7995-token
   `manifest.json` is unrelated to this gate.
2. **Paid path audience**: Bonsai holders only, or anyone once the drop exists?
3. **Pack pricing**: pack size + ckSOL price derived from USD target × margin that covers
   MiniRouter hold (image gens often reserve ~2× estimate) + the ckSOL→MINI slippage/fee and
   the +5% MINI bonus.
4. **Settlement home**: **backend Motoko** (recommended — audit trail, no worker trust) vs
   worker-only (rejected for payments). The model picker/generation stays in the worker.
5. **ckSOL receiver**: `treasury_canister` vs a new studio subaccount; who are the two admins.
6. **Route**: separate `/bonsai` (II) vs the Hedera `/drop` (HashPack) — separate is cleaner.

## Phased tasks (to split into tasks/23..27 when scheduled — gated on Phase 0/1 audit fixes)
| Task | Deliverable | Depends on |
|------|-------------|-----------|
| 23 | Spec lock: ~~eligibility~~ (DONE = 888 PepperHeads), pack sizes, site ceiling, allowlisted models, ckSOL receiver, disclosure note | — |
| 24 | Backend: PepperHead holder gate (`isPepperHead` ∩ caller's owned tokens) + free-gen ledger parity (10 × held / 24h) + capability-token issuance | 23; reuse F-04-safe pattern; reuse `lib/icrc7.mo isPepperHead` |
| 25 | Backend: ckSOL ICRC-2 pay → server-quoted paid credits (fail-closed pricing) | 24; Task 13 (oracle), Task 01 discipline |
| 26 | Worker: accept backend capability token only; curated image-model picker; prompt filter + global ceiling | 24; Task 14 (worker hardening), Task 16 (budget) |
| 27 | Luxury UI route `/bonsai`: glass panels + cinematic bonsai-chili background + model chooser gated on hold | 24–26 |
| 28 | Owner runbook: ckSOL→SOL→MINI treasury sweep (OWNER-executed; agent writes docs only) | 25 |

## Explicit scope boundary for implementing agents
- Do **not** execute any ckSOL/SOL/MINI withdrawal, swap, or deposit — these are financial
  transfers the owner performs. Agents build the metered credit system and the runbook only.
- Do **not** put payment pricing or credit math in the worker.
- Do **not** ship the MiniRouter key or any Solana key to the frontend or on-chain.
```
