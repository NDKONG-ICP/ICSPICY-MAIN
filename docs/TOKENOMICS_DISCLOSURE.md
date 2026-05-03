# IC SPICY — SPICY Token Disclosure Document

> **DRAFT — NOT FOR EXTERNAL DISTRIBUTION — LEGAL REVIEW REQUIRED.**
> This document is a project-owner artifact. It must be reviewed by qualified securities counsel in every jurisdiction in which the SPICY token will be offered, sold, or held before it is published, linked, or cited. Placeholders marked `[TBD]` must be filled in and all counsel-directed revisions incorporated before public release.

**Document version:** 0.1 (draft)
**Last updated:** `[TBD — set on publication]`
**Issuer / publisher:** `[TBD — legal entity name, registered address]`
**Applicable to:** The SPICY ICRC-1 token ("SPICY") deployed via the OHSHII Launcher in connection with the IC SPICY dapp ("IC SPICY") on the Internet Computer ("ICP").

---

## 0. Important notices

Read this section before reading any other part of this document.

### 0.1 Not a securities offering

This document is provided for informational purposes only. It is **not** a prospectus, offering memorandum, solicitation, or advertisement for the sale of securities. It is not an offer to sell, or a solicitation of an offer to buy, any security, financial instrument, or investment product in any jurisdiction in which such an offer, solicitation, or sale would be unlawful.

SPICY is designed and issued as a **utility token** used inside the IC SPICY dapp for the functions described in §9 (Utility and balance gates). SPICY is **not** intended to represent equity in any entity, debt obligation of any entity, a share of profits, a right to dividends, or any claim against the IC SPICY treasury, any associated legal entity, or any affiliated person.

### 0.2 No investment advice; no guarantees

Nothing in this document constitutes investment, legal, tax, accounting, or financial advice. **No person should purchase, receive, or hold SPICY in expectation of profit.** The value of SPICY may go down as well as up, and purchasers may lose the entire amount they contribute. See §13 (Risk factors).

No guarantee is made that:
- SPICY will ever be listed on any exchange or liquidity venue other than ICPSwap.
- A secondary market will exist or continue to exist for SPICY.
- Any buyback, burn, or redemption mechanism described in this document will continue to operate indefinitely, at any particular cadence, or in any particular amount.
- The IC SPICY dapp, nursery, or associated entities will continue to operate.

### 0.3 Forward-looking statements

Statements in this document regarding future events, including but not limited to roadmap phases, buyback execution, audit completion, and canister extraction, are forward-looking and subject to change without notice. Delivery timelines in `PROJECT_CONTEXT.md` and the whitepaper are estimates, not commitments.

### 0.4 Jurisdictional restrictions

SPICY is **not** offered or sold to residents of, or persons physically located in, any jurisdiction in which the offer or sale of SPICY would be unlawful. Restricted jurisdictions are to be determined by counsel and listed here before publication:

> Excluded jurisdictions `[TBD — legal review required]`.

It is the sole responsibility of each prospective purchaser to determine whether they are eligible to acquire SPICY in their jurisdiction of residence.

### 0.5 Reliance and updates

Any person who relies on this document does so at their own risk. This document may be updated at any time. The canonical version is the one published at `[TBD — canonical URL]`. Prior versions are superseded in full by later versions unless otherwise noted. See §14 (Amendment and versioning policy).

---

## 1. About IC SPICY and the SPICY token

**IC SPICY** is a real-world-asset (RWA) e-commerce dapp on the Internet Computer. It is the on-chain storefront and provenance system for a Florida-registered specialty pepper nursery in Port Charlotte, Florida (USDA Zone 10a). Each plant produced by the nursery is bound to an ICRC-7 NFT that carries a live, certified provenance record (variety, germination date, growing location, stage history, and per-stage weather snapshots).

**SPICY** is the native ICRC-1 utility token used inside IC SPICY for the narrow set of functions described in §9. SPICY is issued once, at the Liquidity Generation Event ("LGE") described in §3, and is not re-mintable.

The architecture, payment model, NFT mechanics, and governance posture referenced throughout this document are defined in `PROJECT_CONTEXT.md` and elaborated in the IC SPICY whitepaper (`docs/WHITEPAPER.md`). This disclosure document governs the SPICY token specifically; where apparent conflict arises between this document and marketing materials, this document controls.

---

## 2. SPICY at a glance

| Attribute | Value |
|---|---|
| Token name | SPICY |
| Standard | ICRC-1 |
| Issuance mechanism | OHSHII Launcher |
| Total supply | 1,000,000,000 (one billion) |
| Decimals | `[TBD — confirm post-Launcher deployment]` |
| Genesis date | `[TBD — set at LGE]` |
| Ledger canister ID | `[TBD — set at LGE]` |
| ICPSwap pool (SPICY/ICP) | `[TBD — set after liquidity provision]` |
| Burn account | `2vxsx-fae` (anonymous principal, universal ICP burn destination) |
| Mintability post-LGE | **None.** Supply is fixed at genesis. |

No treasury, admin, or affiliated party has the technical ability to mint additional SPICY after genesis. The total supply of 1,000,000,000 is the hard cap for the life of the token. The only supply-modifying events after genesis are **burns** (see §7).

---

## 3. Allocation

The full 1,000,000,000 SPICY supply is allocated as follows at the LGE.

| Bucket | Amount | % of supply | Treatment |
|---|---:|---:|---|
| LGE Public Sale | 700,000,000 | 70% | Offered for contribution at the LGE via the OHSHII Launcher. The founder participates on equal terms as any public contributor, capped at 18,000,000 tokens. |
| ICPSwap Liquidity Pool (SPICY/ICP) | 200,000,000 | 20% | Paired with ICP from LGE proceeds to seed the ICPSwap SPICY/ICP pool. LP position locked for **four (4) years** via the OHSHII Locker. See §5. |
| IC SPICY Treasury | 100,000,000 | 10% | Custodied by the `treasury_canister`, structured by subaccount. See §6. |
| **Total** | **1,000,000,000** | **100%** | — |

There are no team, advisor, or private pre-sale allocations outside of the founder's capped LGE participation described in §4.

---

## 4. Founder participation and voluntary lock

### 4.1 Cap

The founder participates in the LGE **on the same economic terms as any other public contributor**, with a self-imposed cap of **18,000,000 SPICY** (1.8% of total supply). The founder does not receive a separate pre-mint, discount, bonus, or off-market allocation.

### 4.2 Voluntary lock

The founder voluntarily locks the entirety of the 18,000,000 SPICY received at LGE via the **OHSHII Locker** for a duration of **twenty-four (24) months** from the LGE date, structured as:

- **Cliff:** 6 months from LGE date, during which zero tokens are releasable.
- **Linear vest:** 18 months following the cliff, releasing the locked 18,000,000 SPICY on a linear schedule.

| Parameter | Value |
|---|---|
| Locked amount | 18,000,000 SPICY |
| Lock venue | OHSHII Locker |
| Lock start | `[TBD — LGE date]` |
| Cliff length | 6 months |
| Vest length | 18 months (linear, post-cliff) |
| Total lock duration | 24 months |
| Lock transaction ID | `[TBD — publish after lock is established on-chain]` |
| Lock beneficiary principal | `[TBD — founder wallet principal, publish after lock]` |

### 4.3 Verification

Once the lock is established, the following artifacts will be publishable and independently verifiable against OHSHII Locker state:

- The lock transaction ID on the OHSHII Locker canister.
- The lock beneficiary principal (founder wallet).
- The locked amount and vesting schedule as stored on-chain.

Until those artifacts are populated in §4.2 and independently verified, **no public claim that the founder allocation is locked should be made**.

### 4.4 Founder wallet transparency

The founder wallet principal used for LGE participation and OHSHII Locker beneficiary status will be published in this document (§4.2) after LGE. Transfers into or out of that wallet are publicly observable on the SPICY ledger.

---

## 5. Liquidity pool lock

### 5.1 LP structure

Two hundred million (200,000,000) SPICY — 20% of total supply — is paired with ICP raised at the LGE to seed the **SPICY/ICP liquidity pool on ICPSwap**. The ratio of SPICY to ICP deployed into the pool determines the initial market price.

### 5.2 Lock

The entirety of the LP position (SPICY and its paired ICP) is locked via the **OHSHII Locker** for **four (4) years** from the LGE date. No early unlock mechanism is provided. Fees earned by the LP position during the lock accrue according to ICPSwap pool mechanics and are subject to the lock until expiry.

| Parameter | Value |
|---|---|
| Locked SPICY amount | 200,000,000 |
| Paired ICP amount | `[TBD — set at LP creation]` |
| Initial SPICY/ICP ratio | `[TBD — set at LP creation]` |
| Lock venue | OHSHII Locker |
| Lock start | `[TBD — LP creation date]` |
| Lock duration | 48 months (4 years) |
| Lock transaction ID | `[TBD — publish after lock is established]` |

### 5.3 Post-lock policy

Upon expiry of the 4-year LP lock, the IC SPICY treasury has **no predetermined commitment** to extend the lock, withdraw the liquidity, or take any other action. The decision will be disclosed in a then-current amendment to this document no later than 60 days before expiry.

---

## 6. Treasury structure and policy

### 6.1 Custodian

The 100,000,000 SPICY treasury allocation is custodied by the `treasury_canister`, a Motoko actor extracted from the IC SPICY backend canister in Phase 6 of the phase plan (see `PROJECT_CONTEXT.md` and the whitepaper).

### 6.2 Subaccount structure

The treasury allocation is partitioned across five named subaccounts so that each pool's balance is independently queryable by external observers.

| Subaccount | Allocation | Purpose |
|---|---:|---|
| NFT redemption pool | 40,000,000 | Backs the burn-redeem SPICY payouts described in §10. Once this pool is exhausted, burn-redeem availability is paused until it is refilled (which may never occur). |
| Marketing and community | 25,000,000 | Community grants, public-facing marketing spend, partnerships, creator programs. |
| Strategic reserve | 20,000,000 | Optionality for partnerships, M&A, future audits, unanticipated regulatory cost. |
| Operational reserve | 10,000,000 | Infrastructure cost, audit retainers, cycles top-ups paid in SPICY-denominated terms where applicable. |
| Quarterly burn reserve | 5,000,000 | Source of discretionary quarterly burns described in §7.3. |
| **Total** | **100,000,000** | — |

The balance of each subaccount is independently observable via the SPICY ICRC-1 ledger, using the subaccount indices published by the `treasury_canister` (to be documented in an admin-queryable endpoint after Phase 6 deployment).

### 6.3 Admin authority and constraints

Treasury outflows are executed by the multi-admin set of the `treasury_canister` under the following constraints:

- **Two-admin minimum** enforced by the canister; a single compromised admin cannot move treasury funds.
- **Material economic parameter changes** — including NFT redemption payouts, buyback cadence, buyback source percentage, and buyback routing — require a **seven (7) day timelock** as enforced in code. The proposed change is visible on-chain during the timelock window before it can be executed.
- **Operational fixes** (pause sales, hot-fix a bug, rotate an admin) are admin-only without timelock but are logged to the public admin audit trail.
- **All admin actions** are logged to a **public audit trail** queryable by any principal.

### 6.4 No treasury claim

Treasury holdings are used for the purposes described in this section and §7–§10. **No holder of SPICY has a legal or technical claim against treasury assets.** The treasury is operational working capital for the IC SPICY product, not a pro-rata distribution vehicle.

---

## 7. Burn mechanics

All burns described in this section transfer SPICY to the anonymous principal **`2vxsx-fae`**, the universal ICP burn destination. Tokens transferred to `2vxsx-fae` are permanently and irrecoverably removed from circulation. No party controls this address.

### 7.1 Pay-with-SPICY burn

When a customer pays for a product in SPICY, the full SPICY amount collected is transferred to `2vxsx-fae`. Pay-with-SPICY customers receive a **10% discount** relative to the USD-equivalent price. SPICY paid into this flow does **not** enter the treasury.

| Parameter | Value |
|---|---|
| Discount vs. USD-equivalent price | 10% |
| Destination of SPICY collected | `2vxsx-fae` (burn) |
| Pricing oracle | ICPSwap SPICY/ICP pool, 6-hour TWAP |
| Min price guard | USD $0.001 per SPICY (admin-tunable under timelock) |
| Max price guard | USD $1.00 per SPICY (admin-tunable under timelock) |

If the ICPSwap TWAP is outside the admin-configured min/max range at the time of checkout, the pay-with-SPICY path is refused and the customer is directed to another payment method. This protects both customers and the treasury from oracle manipulation.

### 7.2 Recipe submission burn

Users submitting recipes to the IC SPICY CookBook must (i) hold a minimum balance of SPICY and (ii) burn a per-submission amount. Both checks occur canister-side.

| Parameter | Default | Mutability |
|---|---:|---|
| Minimum balance to submit | 100 SPICY | Admin (7-day timelock) |
| Burn per submission | 10 SPICY (to `2vxsx-fae`) | Admin (7-day timelock) |

### 7.3 Quarterly burn reserve

Up to 5,000,000 SPICY in the quarterly burn reserve subaccount (§6.2) may be transferred to `2vxsx-fae` at the admin's discretion on a quarterly cadence. Each quarterly burn is:

- Logged to the public admin audit trail.
- Queryable via the treasury canister's public burn log.
- Not a commitment — the admin may execute no burn in a given quarter, or may exhaust the reserve earlier than quarterly if warranted.

The quarterly burn reserve is finite and is **not** automatically refilled from other subaccounts.

### 7.4 NFT redemption is not a burn of SPICY

See §10. NFT burn-redeem transfers SPICY **out** of the treasury redemption pool to the redeeming user; it does not burn SPICY.

---

## 8. Buyback policy

### 8.1 Cadence and source

Beginning in Phase 8 of the roadmap (post-LGE), the IC SPICY treasury executes **timer-driven monthly buybacks** via `Timer.recurringTimer` in the `treasury_canister`:

- **Cadence:** monthly.
- **Source:** 2% of the `treasury_canister`'s operational ICP balance per month.
- **Venue:** ICPSwap SPICY/ICP pool (§5).

### 8.2 Slippage protection

Each buyback checks the quoted execution price against the 6-hour TWAP:

- If the quoted price is within **2%** of the TWAP, the swap executes.
- If the quoted price is outside 2% of the TWAP, the swap is **refused** and no execution occurs that month. A record of the refusal is logged to the buyback log.

This guard exists to prevent the treasury from executing into manipulated or illiquid conditions.

### 8.3 Public buyback log

Every buyback attempt — successful, refused, or errored — emits a record to a public log queryable via `getBuybackLog()` on the `treasury_canister`. The log includes, at minimum:

- Timestamp.
- Attempted ICP input amount.
- Quoted SPICY output amount.
- TWAP reference price.
- Execution outcome (success / refused / error).
- Block index on ICPSwap (on success).

### 8.4 Routing of acquired SPICY

SPICY acquired via buyback is routed to one of two subaccounts, admin-configurable under 7-day timelock:

- **NFT redemption pool** (§6.2) — refills the redemption capacity.
- **Quarterly burn reserve** (§6.2) — accumulates for discretionary burns.

Routing policy defaults to the redemption pool. Any change to the default is disclosed via the timelock mechanism and logged to the admin audit trail.

### 8.5 No commitment to permanent buybacks

The buyback policy is operational treasury management, not a return-of-capital program. The multi-admin set may pause, reduce, or end buybacks at any time subject to the 7-day timelock. No holder of SPICY has a claim to continued buybacks.

---

## 9. Utility and balance gates

SPICY is a utility token. Its on-canister utility inside IC SPICY is limited to the following functions.

### 9.1 Pay-with-SPICY discount

A 10% discount at checkout when paying in SPICY, with the paid amount burned to `2vxsx-fae` (§7.1).

### 9.2 Recipe submission

Hold ≥ 100 SPICY (default) to submit a recipe to the CookBook; 10 SPICY burned per submission (§7.2).

### 9.3 SpicyAI chatbot bonus calls

NFT-holder and authenticated tiers of the in-canister SpicyAI chatbot receive a base daily call budget (see whitepaper §10.4). Holders receive an **additional** 50 calls per 24 hours per 100 SPICY held, capped at **+2,000 bonus calls per 24 hours**. No calls are debited from SPICY balance — the balance is read, not consumed.

### 9.4 Legend badge

Holding ≥ 100,000 SPICY (admin-tunable) grants a **display-only** "Legend" badge on the user's community profile. The badge is cosmetic and does not confer governance, economic, or access rights.

### 9.5 What SPICY does NOT entitle the holder to

Explicit anti-entitlements (to rule out by construction):

- SPICY does **not** entitle the holder to any discount on plant, spice, or garden-input purchases. Discounts are **NFT-only** (see whitepaper §4.4).
- SPICY does **not** confer voting rights over IC SPICY canisters. IC SPICY canisters do not query or execute on governance state (see §11).
- SPICY does **not** represent equity in any legal entity.
- SPICY does **not** represent a claim on treasury or nursery assets.
- SPICY does **not** confer any right to dividends, distributions, or revenue share.
- SPICY does **not** guarantee access to any future IC SPICY product, airdrop, allowlist, or reward.

---

## 10. NFT burn-redeem

### 10.1 Mechanism

A holder of an IC SPICY ICRC-7 NFT may **burn the NFT** in exchange for SPICY paid from the treasury NFT redemption pool (§6.2). This is a **one-way conversion**; a burned NFT cannot be recovered.

Payouts are per-rarity and admin-tunable under 7-day timelock.

| Rarity | Default payout (SPICY) |
|---|---:|
| Common | 1,000 |
| Uncommon | 3,500 |
| Rare | 12,000 |
| Founder | 50,000 |

### 10.2 Anti-arbitrage guards

The following guards are enforced canister-side and are not bypassable by the holder:

- **Minimum hold:** 30 days from the NFT's most recent mint or transfer timestamp before the NFT becomes redemption-eligible.
- **Rate limit:** maximum 5 redemptions per principal per rolling 24-hour window.
- **Admin tunability:** the per-rarity payouts may be **lowered** (or raised) by the multi-admin set under 7-day timelock. If SPICY's market price drops below the payout tier's economic break-even, the admin may reduce payouts rather than allow the redemption pool to be drained at a loss to the treasury.

### 10.3 Pool exhaustion

The redemption pool is finite: **40,000,000 SPICY** at genesis. Once exhausted, burn-redeem is paused. The pool may be refilled by buyback routing (§8.4) at admin discretion; there is **no commitment** that it will be.

### 10.4 NFT custody on burn

A burned NFT is transferred to the burn account `2vxsx-fae` using standard ICRC-7 transfer semantics. No `#Burned` status flag is introduced, in order to preserve ICRC-7 enumeration correctness.

### 10.5 Compensation for failed payouts

If the SPICY transfer from the redemption pool to the holder fails after the NFT has been marked burned, the canister executes a compensation path that **un-burns** the NFT (restores ownership to the original holder). This guarantees that no holder loses an NFT without receiving the corresponding SPICY.

---

## 11. Governance

### 11.1 SPICY governance venue: OHSHII

Governance of SPICY — to the extent such governance exists — is hosted entirely on **OHSHII**. Holders of SPICY may participate in OHSHII-hosted proposals at `ohshii.com` per OHSHII's then-current rules. IC SPICY's community canister contains a proposal browser that **deep-links** to OHSHII; the IC SPICY canisters themselves **do not** query OHSHII governance state and **do not** execute OHSHII governance outcomes.

### 11.2 No canister-level SPICY governance

IC SPICY canisters do not have a governance mechanism keyed to SPICY balance. Specifically, the IC SPICY canisters:

- Do not query OHSHII governance proposals or voting power.
- Do not accept DAO-voted parameter pushes.
- Do not grant governance-based administrative authority to any principal based on SPICY holdings.

If, in the future, IC SPICY canisters are modified to accept governance-driven parameter changes, this document will be amended to describe the exact authority granted and the safeguards imposed.

### 11.3 Canister operational governance (multi-admin)

Operational governance of the IC SPICY canisters themselves is performed by a **multi-admin set** captured at canister deployment:

- Two-admin minimum, verified on every phase boundary.
- `addAdmin` / `removeAdmin` methods for rotation without redeployment.
- 7-day timelock on material economic parameter changes (discount tiers, redemption payouts, marketplace fees, buyback policy).
- Operational fixes (pause, hot-fix, rotate) admin-only with no timelock, logged to the public audit trail.

The multi-admin set is **not** a SPICY-gated governance body. Admin authority is set at deployment and rotated via admin action, not by token-holder vote. Changes to this posture would require both (a) amendment of this document and (b) corresponding code changes under the 7-day timelock.

### 11.4 Separation from OHSHII platform risk

Holders of SPICY should assume that the continued operation of OHSHII as a governance venue is subject to OHSHII's own availability and policy decisions. IC SPICY does not guarantee OHSHII availability and does not contractually commit OHSHII to any outcome.

---

## 12. Audit and transparency commitments

### 12.1 Pre-mainnet audit

An external security audit of the IC SPICY Motoko canister suite is budgeted and scheduled for Phase 7 of the roadmap, prior to mainnet launch of the full dapp.

| Item | Value |
|---|---|
| Budget | USD $30,000 – $60,000 |
| Shortlist | Trail of Bits · Vespertine · OAK Security · Hacken |
| Scope | All IC SPICY canisters: backend / `nft_canister`, `marketplace_canister`, `treasury_canister`, `community_canister`, `nims_canister`, `spicy_ai_canister` |
| Audit firm selected | `[TBD]` |
| Audit start date | `[TBD]` |
| Audit report URL | `[TBD — publish after delivery]` |

Audit findings and their remediation status will be published in full after the audit firm signs off on disclosure. Findings rated Critical or High by the audit firm will be remediated or explicitly accepted-with-mitigation **before** the canisters accept user funds at mainnet launch.

### 12.2 Continuous transparency surfaces

The following read-only surfaces are (or will be, per the phase in which they are introduced) queryable by any principal:

- **Treasury subaccount balances** via the SPICY ICRC-1 ledger, using subaccount indices published by the `treasury_canister`.
- **Buyback log** via `getBuybackLog()` on the `treasury_canister`.
- **Admin audit trail** via the public audit-trail query on every canister.
- **NFT collection state** via ICRC-7 standard methods (`icrc7_total_supply`, `icrc7_owner_of`, `icrc7_token_metadata`).
- **Locker state** for the founder lock (§4) and LP lock (§5) via OHSHII Locker's public queries.

### 12.3 Cycle hygiene

Every IC SPICY canister is configured with a **90-day freezing threshold** and exposes an admin `getCycleBalance()` method for monitoring. Top-ups are performed via the NNS Cycles Minting Canister, not via raw `--with-cycles` deploy flags.

### 12.4 Open-source posture

The IC SPICY canister source code is `[TBD — confirm repo visibility policy: fully public vs. mirror-on-release]`. The audit report will reference specific commit hashes; the canister Wasm hashes corresponding to those commits will be published and independently verifiable against the on-chain installed module hashes via `dfx canister info`.

---

## 13. Risk factors

The following list is **not exhaustive**. Prospective purchasers should consult their own advisors before acquiring SPICY.

### 13.1 Token price volatility

SPICY is expected to trade in a small, concentrated liquidity venue (ICPSwap) early in its life. Prices may be highly volatile. Large trades may meaningfully move the price in either direction. The IC SPICY treasury's min/max price guards (§7.1) protect the treasury and the pay-with-SPICY flow, not token holders, from such volatility.

### 13.2 Thin liquidity

Initial SPICY/ICP pool depth is 200M SPICY (§5) paired with the ICP raised at LGE. This depth may be insufficient to absorb large trades without significant slippage, and may be insufficient to support active secondary-market trading.

### 13.3 Smart contract and canister risk

IC SPICY canisters contain complex Motoko code. Despite the security posture described in the whitepaper (§9) and the pre-mainnet audit (§12), undiscovered bugs may exist. Exploitation of such bugs may result in loss of SPICY, loss of NFTs, loss of treasury funds, or service disruption. The same risk applies to every dependency: the SPICY ICRC-1 ledger, ICPSwap, OHSHII Launcher, OHSHII Locker, the ckBTC minter, and the Internet Computer protocol itself.

### 13.4 Oracle and outcall risk

The pay-with-SPICY price and buyback slippage protection rely on the ICPSwap SPICY/ICP 6-hour TWAP. Manipulation of that TWAP in a thin pool may cause the protection to fail or trigger erroneously. Weather provenance relies on Open-Meteo HTTPS outcalls; Open-Meteo outages do not affect SPICY economics but do affect NFT provenance completeness.

### 13.5 Regulatory risk

The legal characterization of utility tokens varies by jurisdiction and evolves over time. A jurisdiction may, now or in the future, classify SPICY as a security, commodity, or other regulated instrument. Such classification could restrict or prohibit the sale, holding, or use of SPICY by residents of that jurisdiction and could require changes to the IC SPICY product, including the removal of features described in this document.

Purchasers residing in jurisdictions not on the excluded list (§0.4) are nevertheless solely responsible for their own legal compliance.

### 13.6 Founder-dependence risk

IC SPICY is operated by a single founder with AI-paired engineering. The multi-admin model (§11.3) mitigates single-principal compromise of the canisters, but **does not** mitigate the risk of founder incapacity. Disposition of founder-held tokens and operational authority in the event of founder incapacity is governed by personal estate arrangements and is outside the scope of this document.

### 13.7 ICPSwap counterparty risk

ICPSwap is an independent decentralized exchange on the Internet Computer. Its continued operation, pool custody integrity, and governance are outside the control of IC SPICY. Loss or compromise of the ICPSwap SPICY/ICP pool would impair or prevent the pay-with-SPICY flow, the buyback program, and SPICY's primary liquidity venue.

### 13.8 OHSHII Launcher and Locker counterparty risk

The LGE, founder lock, and LP lock rely on OHSHII Launcher and OHSHII Locker contracts. Loss, compromise, or unilateral policy change at OHSHII could affect the economics and enforceability described in §3–§5.

### 13.9 Redemption pool exhaustion

The NFT redemption pool is finite (40M SPICY) and may be exhausted. Once exhausted, holders of IC SPICY NFTs who expected to redeem for SPICY may be unable to do so. Refilling is discretionary (§8.4).

### 13.10 Parameter changes under admin authority

Several economic parameters — NFT redemption payouts, recipe gate amounts, buyback cadence, buyback routing, pay-with-SPICY price guards, Legend badge threshold — are admin-tunable under 7-day timelock. These parameters **will** change over time in response to observed behavior and market conditions. The timelock provides advance notice but does not grant a veto.

### 13.11 LGE-specific risks

- Contribution currency, minimum/maximum contribution, pricing mechanism, and refund policy at the LGE are governed by the OHSHII Launcher terms in effect at the LGE date. Those terms may differ from default behavior described in marketing materials and prevail over this document on all LGE mechanics.
- Failure to reach a minimum soft-cap (if configured) may result in LGE cancellation and the return of contributions, per OHSHII Launcher terms.
- Successful LGE participation does not guarantee a specific secondary-market price.

### 13.12 Tax

The acquisition, holding, and disposition of SPICY may have tax consequences that vary by jurisdiction and by circumstance. Purchasers are solely responsible for their own tax reporting. IC SPICY does not provide tax advice.

### 13.13 Informational completeness

This document is a summary; it is not a substitute for the IC SPICY whitepaper, `PROJECT_CONTEXT.md`, the OHSHII Launcher and Locker terms, the ICPSwap pool documentation, the relevant ledger canister Candid interfaces, or the audit report (once published). Prospective purchasers are encouraged to read all of the foregoing and to consult independent advisors.

---

## 14. Amendment and versioning policy

### 14.1 Versioning

This document uses `MAJOR.MINOR` semantic versioning:

- **MAJOR** increments on material changes to allocation, lock terms, burn mechanics, buyback policy, or governance posture.
- **MINOR** increments on clarifications, typographical corrections, or updates that populate previously-`[TBD]` fields without changing committed substance.

Every published version carries a date stamp in the header block.

### 14.2 Change log

A running change log is maintained below this section (§14.3) for all versions from 1.0 forward. The draft 0.x versions are superseded in full by 1.0 on publication.

### 14.3 Change log

- **0.1** `[TBD — publication date]` — Initial draft, pending legal review.

### 14.4 Precedence

Where this document, the whitepaper, marketing materials, and on-chain code diverge, **on-chain code is dispositive of the actual behavior of the system**. This document is dispositive of the intent and the disclosures made to contributors. Where intent has not yet been reduced to code, this document controls until code catches up; where code has diverged from this document without a corresponding amendment, the divergence is a bug to be resolved.

---

## 15. Contact

| Subject | Channel |
|---|---|
| Legal entity | `[TBD]` |
| Registered address | `[TBD]` |
| General inquiries | `[TBD — email]` |
| Security disclosures | `[TBD — security email or bug bounty URL]` |
| Token-holder support | `[TBD — support channel]` |
| Canonical document URL | `[TBD]` |

---

*End of document. This is a draft. Do not distribute without completed legal review and population of all `[TBD]` fields.*
