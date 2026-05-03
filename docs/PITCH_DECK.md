# IC SPICY — Pitch Deck

> Real chili peppers. Real provenance. On chain.
>
> **A 12-slide investor deck — drafted from `PROJECT_CONTEXT.md`, `DESIGN.md`, and the live source.**
> Each slide is structured for direct paste into Pitch / Keynote / Notion. Speaker notes are included beneath every slide.

---

## Slide 1 — Title

# **IC SPICY**
### Real chili peppers. Real provenance. On chain.

**FDACS-registered specialty pepper nursery — Port Charlotte, FL · USDA Zone 10a**
**Built natively on the Internet Computer.**

> 30+ years cultivating the world's rarest hot peppers. Every plant tied to an on-chain provenance NFT, sold through a self-custody storefront with multi-token rails.

— *Project Lead — IC SPICY*

**Speaker note:** open with the brand, not the tech. The brand is real (FDACS license, 30 years, KNF/JADAM, 12 cultivars). The tech is what makes it institutionally credible.

---

## Slide 2 — The Problem

### "Premium" agriculture has no verifiable origin. NFTs have no real-world utility.

| Side | Pain |
|---|---|
| **Specialty growers** | Premium claims (organic, regenerative, single-origin) are paper-thin — buyers can't verify the journey from seed to sale. |
| **Buyers** | Pay premium prices for "rare" plants and dried spices with **no traceability** of variety, location, or growing method. |
| **Crypto NFTs** | Price-disconnected JPEGs. The market has rejected utility-free collections; meaningful RWA remains rare. |
| **Existing RWA dapps** | Real estate, gold, treasuries. **Nothing for living agricultural goods** with real lifecycle data. |

> The market is asking for **proof, not promises** — and for tokens to represent **something that actually grows.**

**Speaker note:** anchor the gap. RWA has been done for inert assets; living, lifecycle-tracked RWA on-chain is still wide open.

---

## Slide 3 — The Solution

### One ICRC-7 NFT per living plant — carrying its lifecycle and weather provenance from germination to your kitchen.

- **Plant germinates → NFT minted.** The NFT travels with the plant through every transplant, sale, and ownership transfer.
- **Certified, queryable provenance:**
  - Variety, germination date, growing location (Port Charlotte, FL — FDACS registered)
  - Stage history (germination → transplant → sale → claim)
  - **Weather snapshots** captured per stage via Open-Meteo HTTPS outcalls
  - Current owner principal, on-chain
- **Burn-redeem economics** — convert any NFT to SPICY tokens with anti-arbitrage guards.
- **Buy with ICP, ckBTC, ckETH, ckUSDC, ckUSDT, SPICY (10% off, burned), or Stripe.**

> *"Authentic IC SPICY plant grown in Port Charlotte, FL — FDACS registered."* That string is rendered from on-chain data, not marketing copy.

**Speaker note:** the on-chain provenance is *not* a static stamp — it's recomputed live at query time and includes weather snapshots. That's the moat.

---

## Slide 4 — Why Now

### The ICP stack went production-ready in 2024–2025. We're using all of it.

| Capability | Status (May 2026) | We use it for |
|---|---|---|
| **ICRC-1 / ICRC-2 ledgers** | Live on mainnet | Multi-token payments (ICP, ckBTC, ckETH, ckUSDC, ckUSDT, SPICY) |
| **ckBTC minter** (`mqygn-kiaaa-aaaar-qaadq-cai`) | Live | Real Bitcoin payments — deposit, sweep, withdraw |
| **`mo:llm` (Llama 4 Scout)** | Live, free during preview | SpicyAI in-canister chatbot, native — no off-chain API |
| **HTTPS outcalls** | Replicated, deterministic | Weather oracle, ICPSwap price oracle, Stripe verification |
| **ICRC-25 / 49 wallet signers** (OISY, Plug) | Live | Self-custody UX without holding user keys |
| **Internet Identity** | Mature | Frictionless app login |
| **Asset canisters with certified paths** | Mature | 1.33 GB NFT collection served from `icp0.io` (not raw) |

> Every dependency in our stack is **mainnet-stable today**. No vapor.

**Speaker note:** investors who burned on chains that promised features 18 months out should hear "we depend on nothing that isn't already shipping."

---

## Slide 5 — The Product

### A premium dapp, not a marketing site.

**The current `ic-spicy.com` is a static brand page. The dapp at `ic-spicy-8kx.caffeine.xyz` (and the v2 production build) is dramatically more capable.**

| Surface | What's inside |
|---|---|
| **Marketplace** | Seedlings ($6) · 1-Gallon ($25) · 5-Gallon ($45) · Artisan Spices ($12) · Garden Inputs · NFT resale market · offer/counter-offer engine |
| **NIMS** (Nursery Inventory Management System) | 72-cell tray grids (12×6), drag/drop, lifecycle stages, photos, schedule builder, weather widget, printable QR-coded tray maps |
| **Wallet** | Multi-token dashboard: ICP / ckBTC / ckETH / ckUSDC / ckUSDT + Plant NFTs, ICPSwap live prices |
| **Plants & Claim** | Per-plant detail view, QR/claim-token redemption flow at point-of-sale |
| **Community** | Posts, comments, likes, follows, profiles, anonymous mode, social sharing — fully on-chain |
| **CookBook** | KNF/JADAM preparations: OHN, FPJ, FAA, LAB, WCA, IMO, JLF, WS, JMS, JWA — printable, shareable, gated submissions |
| **DAO** | Proposal browser deep-linking to OHSHII governance |
| **SpicyAI** | Floating chatbot on every page — KNF/JADAM expertise, in-canister, zero-log |
| **Admin** | Multi-admin (≥2), CookBook curation, treasury logs, weather provenance controls |

**Speaker note:** Show three screenshots — Marketplace, NIMS tray view, NFT detail with weather provenance. The NIMS dashboard alone is the kind of tool nurseries currently pay $500/year for.

---

## Slide 6 — Traction & Moat

### What's already real — and what's nearly impossible to copy.

**Real today**
- **FDACS-registered nursery** (Florida Department of Agriculture). 30+ years of grower experience.
- **12 cultivars in active production**, including extreme-heat exotics (Apocalypse Scorpion, Death Spiral, RB003) and cherished heirlooms (Aji Charapita, Fish Pepper, Acoma Pueblo).
- **Caffeine → standard `dfx`/`mops` migration complete** (Phase 0.5). All 100+ canister methods running on standard `moc`.
- **Phase 1 security foundations shipped** — `requireAuthenticated` / `requireAdmin`, CallerGuard reentrancy, `inspect_message` filter, two-admin minimum.
- **Phase 2 asset infrastructure built** — 8888-NFT, ~1.3 GB collection upload pipeline, certified paths.

**Hard to copy**
- **30 years of varietal selection** and Florida-Zone-10a-specific KNF/JADAM cultivation knowledge.
- **Real, registered horticultural operation** behind every NFT — not a flipped JPEG.
- **A defensible distribution: 8888 fixed-supply ICRC-7** with rarity-tied burn-redeem economics.

> Capital can fund the chain integration. Capital can't fund 30 years of soil.

**Speaker note:** this is the slide where the founder's domain expertise has to land. The chain is rented; the soil is not.

---

## Slide 7 — Tech Architecture

### Eight-canister split. Single chain. Production-grade defaults.

```text
                   ┌──────────────────────┐
                   │       frontend       │  React + Tailwind, certified asset canister
                   └──────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌─────────────┐  ┌────────────┐  ┌────────────┐
      │ nft_assets  │  │ nft_canister│  │  spicy_ai  │
      │  (1.33 GB,  │  │  (ICRC-7/37,│  │  (mo:llm,  │
      │ 8888 NFTs)  │  │  burn-mint) │  │  Llama 4)  │
      └─────────────┘  └────────────┘  └────────────┘
              ▲               ▲               ▲
              │               │               │
              └───────────────┼───────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌─────────────┐  ┌────────────┐  ┌────────────┐
      │ marketplace │  │ treasury   │  │ community  │
      │  + offers   │  │ + buybacks │  │ + recipes  │
      └─────────────┘  └────────────┘  └────────────┘
                              ▲
                              │
                       ┌────────────┐
                       │    nims    │
                       │ + weather  │
                       └────────────┘
```

**Locked-in defaults — `PROJECT_CONTEXT.md`**
- Single-chain on ICP. **No bridges. No cross-chain.**
- **Self-custody only.** OISY/Plug via ICRC-25/49. No in-canister custodial wallet.
- **Standard `moc`** (no Caffeine fork, no `--default-persistent-actors`).
- **`shared(msg) persistent actor class`** for every canister — owner captured at deploy, not hardcoded.
- **Reentrancy lock + state-mutate-before-`await` + compensation** on every async settlement.
- **`inspect_message`** drops anonymous calls before consensus.
- **7-day timelock** on material economic params (discounts, redemption payouts, marketplace fees).
- **90-day freezing threshold** + admin `getCycleBalance()` on every canister.

**Speaker note:** if a security-minded VC is in the room, this slide is for them. Don't speed past it.

---

## Slide 8 — Tokenomics: SPICY

### ICRC-1 token, 1B supply, deployed via OHSHII Launcher.

**Allocation**

| Bucket | Amount | Treatment |
|---|---:|---|
| **LGE Public Sale** | 700M (70%) | Founder participates with verified wallet, **capped at 18M**. Founder's 18M is voluntarily locked **24 months** via OHSHII Locker (6-mo cliff + 18-mo linear vest). |
| **ICPSwap LP** | 200M (20%) | Locked **4 years** via OHSHII Locker. |
| **IC SPICY Treasury** | 100M (10%) | Held by `treasury_canister`, structured by subaccount. |

**Treasury subaccount structure (10% / 100M)**
- 40M — NFT redemption pool (backs burn-redeem payouts)
- 25M — Marketing & community
- 20M — Strategic reserve
- 10M — Operational reserve
- 5M — Quarterly burn reserve

**Burn destination**
- Anonymous principal **`2vxsx-fae`** — universal black hole, no governance handle.

**Buybacks (Phase 8, timer-driven monthly)**
- 2% of operational ICP balance → ICPSwap (SPICY/ICP).
- **TWAP slippage protection** — refuse swaps if outside 2% expected.
- **Public buyback log** queryable by anyone.

**NFT burn-redeem payouts (admin-tunable)**
| Rarity | SPICY out |
|---|---:|
| Common | 1,000 |
| Uncommon | 3,500 |
| Rare | 12,000 |
| Founder | 50,000 |

Anti-arbitrage: 30-day minimum hold, max 5 redemptions per principal per 24h, payouts admin-tunable.

**Speaker note:** every number on this slide is locked in `PROJECT_CONTEXT.md`. Don't ad-lib alternatives in the room.

---

## Slide 9 — Business Model

### Five revenue streams. One unit economics framework.

| Stream | Mechanism | Margin profile |
|---|---|---|
| **Plant sales** | $6 / $25 / $45 + Garden Inputs, paid in ICP / ckBTC / ckETH / ckUSDC / ckUSDT / Stripe / SPICY | High (in-house production, low COGS, premium pricing) |
| **Artisan spice line** | $12 hand-crafted smoked & infused spices from in-house harvest | Very high (vertical integration, branded) |
| **NFT resale royalties** | Marketplace facilitates secondary sales; project takes a small protocol fee per `lib/marketplace.mo` | Pure margin (digital) |
| **Pay-with-SPICY discount** | 10% off vs USD-equivalent; SPICY sent to burn account `2vxsx-fae` | Tokenholder value capture via supply reduction |
| **Treasury buybacks** | 2%/mo of operational ICP swapped to SPICY → redemption pool / burn reserve | Reflexive demand for the token |

**Anti-pattern explicitly excluded**: gating purchases on SPICY balance. Discounts are **NFT-only** (5/10/20/30% by rarity, computed server-side). Token utility is membership/community, not a paywall.

**Unit economics — illustrative (5-Gallon plant)**
- Sale price: $45 (or 0.45 ICP equivalent at oracle TWAP)
- Discount tier (Founder NFT holder): 30% → $31.50 net
- Stripe rail: 2.9% + $0.30 fee → ~$30.30 net
- ICRC-2 rail: ICP transfer fee (looked up via `icrc1_fee()`, never hardcoded) → ~$31.45 net
- COGS (in-house): regenerative, low input cost (KNF/JADAM = no synthetic fertilizer/pesticide line item)

**Speaker note:** the founder's KNF/JADAM practice is also a **gross-margin lever** — input costs are dramatically lower than conventional ag.

---

## Slide 10 — Roadmap

### 12 weeks to mainnet. Phase 8 layers on after LGE.

| Phase | Description | Weeks | Status |
|---|---|---:|---|
| 0 | Pre-flight: snapshot, asset inventory, principals verification | 0.2 | ✅ Done |
| 0.5 | Caffeine → `dfx`/`mops` migration (tooling, `moc`, deps) | 0.5 | ✅ Done |
| 1 | Security foundations (anonymous reject, owner, CallerGuard, `inspect_message`) | 0.7 | ✅ Done |
| 2 | Asset infrastructure (`nft_assets` canister, 1.33 GB upload) | 0.7 | ✅ Done |
| 3 | ICRC-7 + certified provenance | 1.7 | 🟡 In progress |
| 3.6 | Provenance UX (lifecycle history, claim chain) | 0.3 | 🟡 |
| 4 | Real payments (ICP + ckBTC + Stripe + SPICY pay) | 2.8 | ⚪ Next |
| 5 | ckBTC integration (deposit/sweep/withdraw) | 0.7 | ⚪ |
| 5.5 | Weather provenance (per-plant, backfill, sale/claim) | 0.7 | ⚪ |
| 6 | Multi-canister split + ops + transparency dashboard | 2.3 | ⚪ |
| 6.5 | SpicyAI chatbot + badges + recipe burn | 1.2 | ⚪ |
| 7 | Audit & polish | ongoing | ⚪ |
| 8 | OHSHII integration + treasury structure + buybacks | 2.7 | ⚪ Post-LGE |

**Mainnet target:** week ~11 (Phases 0–7).
**LGE & buyback engine:** Phase 8, post-mainnet.

**Speaker note:** real, dated, with checked boxes. Trust is built by showing what already works.

---

## Slide 11 — Team & Advisors

### Owner-operator. Engineering velocity. External audit.

**Project lead — Owner-operator**
- 30+ years of chili pepper cultivation across 12 active rare cultivars.
- FDACS-registered nursery operator (Florida Department of Agriculture and Consumer Services).
- Direct practitioner of Korean Natural Farming (KNF) and JADAM Organic Farming methods.
- Solo founder — engineering velocity multiplied via AI-paired development (Claude / Cursor) under explicit plan-then-execute discipline (`AGENTS.md`).

**Engineering pattern**
- All code reviewed by founder before commit. No vibe-coded mainnet deploys.
- Plan-then-execute working mode: every change is scoped, reviewed, and locally tested (`mops check` + local replica) before mainnet.
- `PROJECT_CONTEXT.md` is the single source of architectural truth — locked decisions, no relitigation.

**External audit — pre-mainnet**
- Budget allocated: **$30K–$60K**.
- Shortlist: **Trail of Bits · Vespertine · OAK Security · Hacken**.
- Phase 7 schedule — slot reserved before audit firms book months out.

**Open advisor seats**
- IC ecosystem (DFINITY, ICPSwap, OISY, OHSHII) — for protocol & launch coordination.
- Specialty agriculture / direct-to-consumer commerce.
- Securities counsel (Florida + DAO governance).

**Speaker note:** the founder's domain expertise is the differentiator. Engineering is leveraged via AI under disciplined process — not "AI vibe-coded the dapp."

---

## Slide 12 — The Ask

### What we want. What you get. What's next.

**Ask**

| Item | Detail |
|---|---|
| **LGE allocation participation** | Strategic checks into the 700M LGE on OHSHII (founder is also participating, capped at 18M, vested 24 months). |
| **Audit budget** | Co-funding $30–60K for Trail of Bits / Vespertine / OAK / Hacken. |
| **Strategic intros** | DFINITY ecosystem, OISY/Plug integration partners, ICPSwap LP coordination, specialty-ag distribution. |
| **Anchor liquidity** | Post-LGE LP support on the SPICY/ICP pool (4-year locked LP per tokenomics). |

**What you get**

- Exposure to a **production-grade RWA dapp** with a real, registered, multi-decade horticultural operation behind it.
- Single-chain ICP exposure — no bridge risk, no cross-chain attack surface.
- Tokenholder value capture via **NFT burn-redeem**, **pay-with-SPICY burns**, and **monthly buyback program**.
- A reference-class case study: how disciplined teams ship full-stack RWA on ICP without Caffeine training wheels.

**What's next**

1. Mainnet deploy (week ~11), audit start in parallel.
2. SPICY LGE on OHSHII.
3. SPICY/ICP LP creation on ICPSwap (4-year lock).
4. Buyback engine activation (Phase 8).
5. Quarterly burn cadence + public transparency dashboard.

> **Get in touch — contact via project lead, IC SPICY (Port Charlotte, FL).**

**Speaker note:** end strong, end specific. Real numbers, real names, real timeline. No hand-waving.

---

## Appendix A — Disclosure & Risk Notes (for due diligence)

- **Pre-LGE**: SPICY ledger canister ID, SPICY/ICP pool canister ID, and `nft_assets` canister ID are TBD until LGE / Phase 2 deploy on mainnet. All three will be published in the public tokenomics disclosure document before LGE.
- **Founder allocation transparency**: 18M cap; 24-month vesting (6-month cliff + 18-month linear); OHSHII Locker lock ID published at LGE.
- **No off-chain custody of funds.** All token movements happen via ICRC ledgers; treasury principals and subaccounts are public.
- **Stripe rail** is intentionally one-way verified via HTTPS outcalls (`GET /v1/checkout/sessions/:id`) — no webhook receiver, idempotent against double-spend on `session_id`.
- **Open items** (non-blocking): external audit firm selection (Phase 7), Spanish translation (deferred), OHSHII LGE config details (contribution unit, default vesting schedule, ability to extend lock post-LGE).
- **Coding agents** (Claude / Cursor) **may not generate the formal tokenomics disclosure document** — that is a project-owner artifact requiring legal review per `PROJECT_CONTEXT.md`. This deck is a marketing document, not the disclosure document.

---

## Appendix B — Key facts cheat sheet

| Fact | Value |
|---|---|
| Network | Internet Computer (ICP) — single chain |
| Token standard | ICRC-1 (SPICY) · ICRC-7/37 (NFTs) · ICRC-2 (payment approvals) |
| NFT supply | 8888 total (5000 Common · 2838 Uncommon · 1000 Rare · 50 Founder) |
| Tokenomics supply | 1,000,000,000 SPICY |
| Burn account | `2vxsx-fae` (anonymous principal) |
| Discount tiers (NFT) | 5% / 10% / 20% / 30% |
| Burn-redeem payouts | 1k / 3.5k / 12k / 50k SPICY |
| Anti-arbitrage holds | 30-day minimum hold; 5 redemptions / 24h / principal |
| Audit budget | $30K–$60K, Phase 7 |
| Mainnet target | ~week 11 of phase plan |
| Buyback cadence | Monthly, 2% of operational ICP, TWAP-protected |
| Founder vesting | 18M cap, 24 mo (6-mo cliff + 18-mo linear) |

---

*Document drawn from `PROJECT_CONTEXT.md`, `DESIGN.md`, and the live source. Not a securities offering. Subject to legal review before external distribution.*
