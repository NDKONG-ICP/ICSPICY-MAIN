# IC SPICY — Security & Correctness Audit (2026-10)

> Scope: all canisters in `src/`, frontend, `worker/`, scripts. Read-only on
> mainnet (anonymous `dfx` queries + `curl` header checks only). Every finding
> cites `file:line` with a short quote. Items I could not verify without admin
> access or state inspection are marked **unverified** in their section.
>
> Mainnet facts gathered read-only during this audit (2026-10-16):
> - `backend.getTokenPrices()` → `(vec {})` — oracle cache empty, fallbacks in use.
> - `backend.getAdmins()` → **5 principals** (deployer, OHSHII, OISY, + two others).
> - `https://www.icspicy.app/` served directly by canister `7rukv-…` with **no CSP,
>   no X-Frame-Options, no frame-ancestors** (only HSTS).
> - `https://icspicy.app/` (apex) 301-redirects through an **AWS EC2 reverse proxy**
>   (`server: ip-10-123-124-254.ec2.internal`) to `www`.
> - `src/frontend/env.json` ships `drop_studio_url` = a `*.trycloudflare.com` tunnel.

## Severity definitions
- **Critical** — direct, unauthenticated or low-cost theft of funds or NFTs, or total loss of custody.
- **High** — theft/seizure requiring a condition (admin key, brute force, specific flow), or a live XSS/custody gap.
- **Medium** — privacy leak, cycle drain, integrity weakness, or defense-in-depth gap with a plausible path.
- **Low / Info** — hardening, hygiene, or latent debt.

---

## Findings table

| ID | Sev | Title | File:line | Status |
|----|-----|-------|-----------|--------|
| F-01 | Critical | ICPay verification checks only id+status — no amount, currency, or order binding | `mixins/payment-api.mo:311`, `:744`, `:918`, `:1137` | Confirmed live |
| F-02 | Critical | Caller-controlled `OrderItem.plant_id` transfers any plant's NFT for a cheap product's price | `lib/marketplace-order.mo:129`, `lib/product-nft.mo:178`,`:304` | Code only |
| F-03 | Critical | RAVEN payments bypass all server-side amount validation | `mixins/payment-api.mo:496`,`:537`,`:868` | Code only |
| F-04 | High | `linkWallet` requires no proof of control; one-to-one guard enables grief-lockout | `main.mo:1494` | Confirmed live (method) |
| F-05 | High | Treasury `executeTransfer` compensation is rolled back by trap-after-await → stuck `#executing` | `src/treasury_canister/main.mo:333`,`:359`,`:375` | Code only |
| F-06 | High | Treasury two-admin+timelock bypass: single-admin `addAdmin` + untimelocked economic setters | `src/treasury_canister/main.mo:538`,`:510`,`:517`,`:524` | Code only |
| F-07 | High | Direct ICRC-2 order payment takes funds with no refund on settlement failure; non-atomic multi-line settlement | `mixins/payment-api.mo:565`,`:586`; `lib/product-nft.mo:259` | Code only |
| F-08 | High | Deterministic 40-bit claim tokens + never-expiring auto-armed pickup tokens → NFT theft from buyer | `lib/nft-claim.mo:30`; `mixins/payment-api.mo:441`,`:604`; `mixins/claim-api.mo:211` | Code only |
| F-09 | High | Live site serves no CSP / no frame-ancestors; config allows `unsafe-inline`+`unsafe-eval` | live headers; `src/frontend/public/.ic-assets.json5:6` | Confirmed live |
| F-10 | High | `storeCommunityImage` / `storeNimsPhotoFile` accept any MIME and any path → stored XSS + overwrite others' files | `mixins/artwork-upload-api.mo:225`,`:285` | Code only |
| F-11 | High | `adminReturnToPool` seizes any user-owned NFT; no ICRC-3 log; single-admin | `mixins/icrc7-api.mo:956`,`:965` | Confirmed (code + 5 admins live) |
| F-12 | High | 5 backend admins (incl. third parties); any one can withdraw all ledger balances with no timelock | `getAdmins()` live; `mixins/payment-api.mo:654` | Confirmed live |
| F-13 | Medium | Price oracle: empty live cache → fallbacks; unit semantics inconsistent; text-scan parse; `raw.icp0.io` + 95% tolerance | `lib/price-oracle.mo:39`,`:132`; `mixins/price-oracle-api.mo:55` | Confirmed live (empty cache) |
| F-14 | Medium | Drop Studio points frontend at an operator-laptop worker via a `trycloudflare.com` tunnel | `src/frontend/env.json:7`; `worker/src/drop-studio-server.js` | Confirmed live (config) |
| F-15 | Medium | `inspect` admits any anonymous update call with 8–199 byte args pre-consensus | `main.mo:1964` | Confirmed live |
| F-16 | Medium | Anonymous/low-cost HTTPS-outcall & LLM cycle-drain via free principals + `force` flag | `mixins/weather-hub-api.mo:906`; `spicy_ai_canister/main.mo:210` | Confirmed (code) |
| F-17 | Medium | `getOrder` leaks buyer principal + line items (incl. plant_id, prices) to any caller | `mixins/marketplace-api.mo:263` | Confirmed (code) |
| F-18 | Medium | II idle timeout disabled — delegation persists on shared machines | `src/frontend/providers/AuthProvider.tsx:56` | Confirmed (code) |
| F-19 | Medium | Apex `icspicy.app` routed through an off-chain AWS EC2 reverse proxy | live headers | Confirmed live |
| F-20 | Low | Frontend admin gating is a hard-coded PID list divorced from backend `getAdmins()` | `hooks/useBackend.ts` (B1, PROJECT_CONTEXT) | Confirmed (documented) |
| F-21 | Info | Ghost `wallets`/`txLog` stable state; `main.mo` 2k lines; `payment-api.mo` 1.8k; minify off | `main.mo:644`; `vite.config.js` | Confirmed (code) |

---

## F-01 — ICPay verification checks only id + status (Critical, confirmed live)

**Evidence.** `verifyICPayPayment` does a `GET /sdk/payments/:id` with the merchant
secret key and validates **only** that the returned `id` matches and `status` is
`succeeded`/`completed`:

```motoko
// mixins/payment-api.mo:336-348
let responseId = … "id" …; if (responseId != paymentId) return #err("…mismatch");
let status = … "status" …;
if (status != "succeeded" and status != "completed") { return #err("ICPay payment status: " # status); };
#ok(());
```

It never reads the charged **amount**, **currency**, or any **order/token binding**.
The PepperHead path makes this explicit:

```motoko
// mixins/payment-api.mo:744-746
// but does not re-validate the charge amount (ICPay is the source of truth
// on what was collected).
```

Callers settle on a bare `#ok`:
- `purchasePepperHead` (`:918`) → mints a $25 PepperHead.
- `purchasePlantICPay` (`:1137`) → settles a plant of **any** catalog price.
- `confirmICPayPayment` (`:400`) → marks an order of **any** `total_cents` paid.

**Exploit sketch.** Attacker creates a legitimate ICPay payment to IC SPICY for the
minimum ICPay allows (e.g. $0.50), obtains its `paymentId`, then calls
`purchasePlantICPay(expensivePlantId, paymentId)` or `confirmICPayPayment(bigOrderId, paymentId)`.
`verifyICPayPayment` returns `#ok` (id matches, status succeeded), and the full-price
plant NFT / order settles. The `icpaySessionsConsumed` guard only prevents reusing the
same `paymentId` twice — it does not bind amount or order.

**Fix.** In `verifyICPayPayment`, additionally parse and return `amount`, `currency`,
and the ICPay `metadata.order_id` (or token id). At each call site, assert:
`amount >= expectedMinorUnits(order.total_cents, currency)`, `currency == expected`,
and `metadata.order_id == orderId` (for orders) / `metadata.sku == "pepperhead"` (for PH).
Mirror the Stripe discipline already documented in PROJECT_CONTEXT §Payment model.
See task `01-icpay-amount-currency-binding.md`.

---

## F-02 — Caller-controlled `OrderItem.plant_id` (Critical, code only)

**Evidence.** `OrderItem.plant_id` is part of the public `CreateOrderInput`:

```motoko
// types/marketplace.mo:118-121,151-152
public type OrderItem = { product_id; plant_id : ?Common.PlantId; quantity; price_cents };
public type CreateOrderInput = { items : [OrderItem]; … };
```

Order validation copies it verbatim and prices the line from the **product**, not the plant:

```motoko
// lib/marketplace-order.mo:124-132
let unitPrice = ProductShipping.lineUnitPriceCents(product, config);
… let validated = { product_id = item.product_id; plant_id = item.plant_id; quantity; price_cents = unitPrice };
```

At settlement, the caller's `plant_id` **overrides** the product's and drives the NFT transfer:

```motoko
// lib/product-nft.mo:178-181
let plantId = switch (item.plant_id) { case (?pid) ?pid; case null product.plant_id; };
// :183-192 → fetch that plant's NFT token and #ok(tokenId)
// :304-311 → markPlantClaimedViaQr(…pid…); product.active := false;
```

**Exploit sketch.** List or find a $1 catalog product. Place an order whose single item is
`{ product_id = cheapProductId; plant_id = ?<a $500 plant with an NFT>; quantity = 1 }`.
Order total is computed from the $1 product. Pay $1 by any path. Settlement transfers the
$500 plant's NFT to the buyer and deactivates the cheap product. Net: NFT theft at an
arbitrary discount, plus collateral deactivation of an unrelated product listing.

**Fix.** Treat `plant_id` as **server-derived only**. Remove it from `OrderItem` input (or
ignore it in `createValidatedOrder` and `pickLineNft`, always using `product.plant_id`).
If a product is a live-plant listing, the plant binding must come from the product record.
See task `02-order-plant-id-server-derived.md`.

---

## F-03 — RAVEN payments bypass amount validation (Critical, code only)

**Evidence.** RAVEN is an allowed payment ledger (`lib/icrc-payment.mo:88,101,115`) but has
no oracle token, so the price check is skipped entirely:

```motoko
// mixins/payment-api.mo:496-505
func oracleTokenFromPayment(token) : ?OracleToken { … case (#RAVEN) null; };
// :537-562 (confirmOrderPaymentDirect) and :868-892 (purchasePepperHeadDirect)
switch (oracleTokenFromPayment(token)) {
  case (?oracleToken) { …isPaymentAmountSufficient… };
  case null {};  // RAVEN: no oracle price tracked — client validated amount via ICPSwap + 2% buffer
};
```

The comment defers validation to the **client**, violating the LOCKED-IN rule "never trust
amounts/prices from frontend." The subsequent `IcrcPayment.transferFrom(token, caller, canister, amount, …)`
pulls whatever `amount` the caller passed, then settles the order/PepperHead in full.

**Exploit sketch.** Call `confirmOrderPaymentDirect(orderId, ravenLedgerId, 1)` or
`purchasePepperHeadDirect(ravenLedgerId, 1)`. The canister pulls 1 base unit of RAVEN
(dust) and delivers the full-price NFT.

**Fix.** Either (a) remove RAVEN from the direct-payment allow-list until a server-side
RAVEN/ICP oracle exists, or (b) compute expected RAVEN from a canister-side ICPSwap quote
and enforce it. Do not accept client-validated amounts. See task `03-raven-amount-guard.md`.

---

## F-04 — `linkWallet` has no proof of control (High, confirmed live method)

**Evidence.**

```motoko
// main.mo:1494-1522
public shared ({ caller }) func linkWallet(walletPrincipal : Principal) : async Bool {
  AccessControl.requireAuthenticated(caller); … // rejects anon/self/canister
  switch (walletToIdentity.get(walletPrincipal)) { case (?existingOwner) { if (…!=caller) Runtime.trap("already linked to another identity"); … }; … };
  linkedWallets.add(caller, existing.concat([walletPrincipal]));
```

No signature, no ICRC-25/49 challenge, no balance-proof — the caller simply asserts a
principal. Linked wallets feed shop discounts (`lib/nft-discount.mo` via
`callerDiscountFromBalances`), RAVEN discount (`lib/marketplace-order.mo:36`), DAO votes
(`DAOAPI`), and co-op seats.

**Exploit sketch.** (1) *Benefit theft*: a user links a known whale OISY principal holding
Founder NFTs → inherits the 30% discount tier and any DAO/co-op weight tied to NFT balances.
(2) *Grief/lock-out*: because of the one-to-one guard at `:1504`, an attacker links a
victim's real OISY principal **first**; the victim can then never link their own wallet
(`trap("already linked to another identity")`).

**Fix.** Require a signed challenge: issue a nonce, have the wallet sign it via ICRC-49,
verify server-side before adding the link (or verify a micro-transfer from the wallet).
Until then, do not grant discounts/votes based on linked (vs. caller-held) balances.
See task `04-linkwallet-proof-of-control.md`.

---

## F-05 — Treasury `executeTransfer` compensation defeated by trap (High, code only)

**Evidence.** Status is set to `#executing` **before** the ledger await; on failure the code
sets it back to `#pending` and then traps:

```motoko
// src/treasury_canister/main.mo:333
proposalStatus.add(id, #executing);
… await ledger.icrc1_transfer(…) …
// :359  proposalStatus.add(id, #pending); // compensation
// :371  Runtime.trap("Ledger transfer failed: " # msgTxt);
// :375  proposalStatus.add(id, #pending); // :377 Runtime.trap(...)
```

On the IC, a trap **rolls back all state changes made since the last `await`**. The
`#pending` write at `:359`/`:375` happens after the `icrc1_transfer`/`icrc1_fee` await, so
the trap discards it. The `#executing` write at `:333` was committed at the first await and
survives. Net: any failed transfer sticks in `#executing`, and `executeTransfer` then always
traps `"Proposal is already executing"` (`:322`) — the proposal is permanently wedged with
no reset method.

**Fix.** Do not trap after compensation. Return a `Result`/variant instead of trapping, so
the `#pending` write commits; or move the status reset into a `catch`-free path that returns
normally. Add an admin `resetStuckProposal(id)` for existing wedged proposals. See task
`05-treasury-execute-compensation.md`.

---

## F-06 — Treasury two-admin + timelock is bypassable (High, code only)

**Evidence.** `addAdmin` is single-admin, no timelock:

```motoko
// src/treasury_canister/main.mo:538-543
public shared ({ caller }) func addAdmin(p) { requireAdmin(caller); … admins := admins.concat([p]); … };
```

`executeTransfer` requires `liveApprovalCount(id) >= 2` (`:325`) — "two distinct admins." A
single compromised admin can `addAdmin(theirSecondPrincipal)`, then approve the proposal
from both, satisfying the quorum. The 7-day timelock still applies to the *transfer*, but
the economic-config setters have **no** timelock and are single-admin:

```motoko
// :510 setSpicyLedger  :517 setIcpswapPool  :524 setPolicyCanister  :531 setIcpLedger
requireAdmin(caller); … // direct state write, audit-logged, no second approval, no delay
```

`setPolicyCanister`/`setIcpswapPool` redirect buyback behavior and the DAO-policy source —
the security posture requires timelocks on material economic params.

**Fix.** Gate `addAdmin`/`removeAdmin` and the ledger/policy setters behind the same
two-admin + 7-day timelock as transfers (or a dedicated admin-rotation timelock). See task
`06-treasury-admin-timelock.md`.

---

## F-07 — Direct ICRC-2 payment: funds taken, no refund; non-atomic settlement (High, code only)

**Evidence.** `doConfirmOrderPaymentDirect` pulls funds, then settles; a settlement error
returns without refunding:

```motoko
// mixins/payment-api.mo:565-575  await IcrcPayment.transferFrom(token, caller, canister, amount, …) // funds now in canister
// :578-588  switch (ProductNft.settleOrderLineItems(…)) { case (#err(e)) { return { success=false; message=e; … }; }  // NO refund
```

`settleOrderLineItems` is a loop that mutates `icrc7Owners` per line and `return #err`s
mid-loop on later failures (`lib/product-nft.mo:261,277,287,291,299`). Because these are
`return` values (not traps) after the caller's `transferFrom` await, earlier lines' NFT
transfers persist while the method reports failure — partial settlement + funds captured.

**Exploit / failure sketch.** A two-line order where line 2 is out of pool NFTs: line 1's
NFT transfers to buyer, line 2 errors, method returns `success=false`, funds stay in the
canister, order not marked paid, buyer has one NFT and no record. Also any transient
settlement error after a successful transferFrom strands the buyer's funds with no automatic
refund path.

**Fix.** Validate the entire order can settle **before** `transferFrom` (dry-run pool
availability + ownership), make settlement all-or-nothing, and on any post-transfer failure
issue an `icrc1_transfer` refund (minus fee) with a logged compensation. See task
`07-direct-payment-atomic-refund.md`.

---

## F-08 — Deterministic claim tokens + never-expiring pickup tokens (High, code only)

**Evidence.** Claim tokens are a deterministic function of time, token id and count,
truncated to 40 bits — no `Random.blob`/`raw_rand`:

```motoko
// lib/nft-claim.mo:30-33
let seed = Int.abs(now) + tokenId * 1_000_000_007 + existingCount * 997;
"spcy_" # toHex10(seed % 1_099_511_627_776)   // 2^40 space
```

Paid-order pickup tokens are auto-armed with **no expiry**:

```motoko
// mixins/payment-api.mo:441,604
nftClaimArms.add(t, { armedAt = Time.now(); expiresAt = null });
```

`redeemClaim` transfers the NFT if the current holder is the canister, an admin, **or the
plant owner**:

```motoko
// mixins/claim-api.mo:209-213
switch (nftClaimPlantIds.get(claimToken)) { case (?plantId) { switch (plantOwners.get(plantId)) { case (?owner) owner == currentOwner.owner; … }; … }; };
```

After a plant sale, `markPlantClaimedViaQr` sets `plantOwners[plantId] := buyer`, so for a
plant-linked pickup token the NFT is held by the buyer AND `plantOwners[plantId] == buyer` →
`holderOk` is true. An attacker who guesses the token can call `redeemClaim` and move the
NFT **out of the buyer's wallet** into their own.

**Exploit sketch.** The 40-bit space and the known inputs (token id is small and public;
mint time is the order's settlement time, observable; count is roughly the number of claim
tokens) make targeted search tractable, especially for recently settled orders. A hit on a
never-expiring, still-armed plant token transfers the buyer's NFT to the attacker.

**Fix.** Generate tokens from `raw_rand` (≥128 bits of entropy). Give auto-armed pickup
tokens a bounded expiry. In `redeemClaim`, do not treat "plant owner == current owner" as a
transfer authorization once the NFT already belongs to a non-nursery principal. See task
`08-claim-token-entropy-expiry.md`.

---

## F-09 — No CSP / no frame protection on the live site (High, confirmed live)

**Evidence (live).** `curl -sD- https://www.icspicy.app/` returns `200` from canister
`7rukv-…` with only `strict-transport-security`; **no** `Content-Security-Policy`,
`X-Frame-Options`, or `frame-ancestors`. The committed policy additionally weakens CSP:

```json5
// src/frontend/public/.ic-assets.json5:6
"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' … https://*.icp0.io https://*.ic0.app …; …"
```

Two problems: (1) the header is **not actually being served** by the deployed asset canister
(so even the weak policy isn't in effect), and (2) the policy itself allows `unsafe-inline`
+ `unsafe-eval` and wildcard `*.icp0.io`/`*.ic0.app` script sources, and has **no
`frame-ancestors`** — the site can be framed (clickjacking the Connect/pay buttons).

**Impact.** Combined with F-10 (attacker-controlled HTML/JS stored on a sibling asset
origin), the missing CSP removes the main defense against stored/reflected XSS and
clickjacking of wallet-signing and checkout flows.

**Fix.** Serve a strict CSP from the asset canister (verify it appears in response headers
after deploy). Drop `unsafe-eval`; remove `unsafe-inline` for scripts (hash/nonce the few
inline scripts); pin exact IC origins; add `frame-ancestors 'none'` (or the II origin only)
and `X-Content-Type-Options: nosniff`. See task `09-csp-frame-protection.md`.

---

## F-10 — Arbitrary MIME + unscoped paths in user uploads (High, code only)

**Evidence.** `storeCommunityImage` validates only the path prefix and passes `mimeType`
through unchecked:

```motoko
// mixins/artwork-upload-api.mo:225-245
if (not isCommunityImagePath(path)) Runtime.trap("…community-images/");
… await AssetUpload.storeToUploadsCanister(uploadsCanisterPrincipal(), path, data, mimeType);  // mimeType unchecked
```

`storeNimsPhotoFile` (`:285-305`) is identical. By contrast the admin variant
`adminStoreVerifiedGrowerImage` **does** validate (`:261`
`if (mimeType != "image/jpeg" and … != "image/webp") Runtime.trap`). The path after the
prefix is caller-chosen with **no per-principal scoping** (unlike `storeAvatarFile`, which
namespaces by `Principal.toText(caller)` at `:205`).

**Impact.** (1) *Stored XSS*: any authenticated user stores `text/html` or JS under
`community-images/evil.html` on the uploads asset canister (`r53pg-…`); if that origin is
trusted or framed by the app, script runs with access the app grants its own origin. With
F-09 (no CSP) this is unmitigated. (2) *Overwrite*: user A writes
`community-images/<B's known key>` to clobber B's image/content.

**Fix.** Enforce an image MIME allow-list in both methods; namespace the stored key by
caller principal; reject `..`/path traversal; set `Content-Type` and
`X-Content-Type-Options: nosniff` on served assets. See task `10-upload-mime-path-scope.md`.

---

## F-11 — Admins can seize any user-owned NFT; no ICRC-3 log (High, confirmed)

**Evidence.** `adminReturnToPool` moves a token from **whoever currently owns it** to the
pool with only `requireAdmin`:

```motoko
// mixins/icrc7-api.mo:965-976
let currentOwner = switch (icrc7Owners.get(tokenId)) { case null …; case (?o) o; };
let poolAccount = { owner = selfPrincipal(); subaccount = null };
… IcrcLib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?currentOwner, poolAccount) …
```

There is no precondition that the token is unsold/canister-held — a user's NFT can be
reclaimed and re-airdropped (`adminBatchAirdrop :989`) or relocked
(`adminRelockHederaTwin :905`). The backend keeps a local `nextBlockIndex` counter but
exposes **no ICRC-3 transaction log** (grep for `icrc3_`/`get_transactions` finds only the
unrelated ghost `txLog`). Transfers/seizures/burns leave no standard, independently
queryable on-chain trail — only the internal `auditLog`.

**Impact.** Any one of the 5 admins (F-12) can seize holders' NFTs; buyers of a "RWA
provenance" NFT have no spec-level transfer ledger to prove or detect this.

**Fix.** Restrict `adminReturnToPool`/relock to tokens still owned by the canister/nursery
(reject if owned by an external principal) or require the same two-admin+timelock as other
material actions. Implement ICRC-3 (`icrc3_get_blocks`) so every ownership change is logged.
See task `11-restrict-admin-nft-move.md` and `20-icrc3-transaction-log.md`.

---

## F-12 — Five backend admins; any one can drain all balances (High, confirmed live)

**Evidence (live).** `getAdmins()` returns 5 principals: deployer `gqkko-…`, OHSHII
`evzpj-…`, OISY `yyirv-…`, and two others (`mbz2t-…`, `sh7h6-…`). Any single admin can:

```motoko
// mixins/payment-api.mo:654-659
public shared ({ caller }) func adminWithdrawTokens(ledgerCanisterId, to, amount) {
  AccessControl.requireAdmin(accessControlState, caller); … // rate-limited 3/hr, NO timelock, NO second approval
```

and transfer the canister's ICP/ckBTC/ckETH/ckUSDC/ckUSDT/RAVEN balances to any principal,
move NFTs (F-11), or `removeAdmin` others (`main.mo` admin API). Third-party team principals
(OHSHII/OISY) thus hold full withdrawal + custody power over backend funds and all 8,888
NFTs.

**Impact.** Single-key compromise of **any** of 5 principals = full treasury + NFT custody
loss. The documented "two-admin minimum" protects only the separate treasury canister, not
the backend that actually holds the funds and NFTs today.

**Fix.** Minimize the backend admin set to the operator's keys; move third-party governance
to the policy/treasury canisters. Put `adminWithdrawTokens` behind a two-admin+timelock
proposal (or route all custody through `treasury_canister`). See task
`12-backend-admin-minimization.md`.

---

## F-13 — Price oracle: empty live cache, unit confusion, fragile parse (Medium, confirmed live)

**Evidence (live).** `getTokenPrices()` → `(vec {})`: the cache has never populated, so every
conversion uses the hard-coded `defaultPrice` fallbacks. The fallbacks and the conversion
math disagree about units:

```motoko
// lib/price-oracle.mo:33 (doc)  "how many ICP e8s equal 1 base unit of this token"
// :132-139  #ckUSDC { 8_000_000 }  // 0.08 ICP — only sensible as ICP-per-WHOLE-USDC, not per base unit
// :39-57  usdCentsToTokenBase: icpE8sNeeded = cents * icpPerUsdcBase * 10_000; (icpE8sNeeded*1e8)/tokenPricePerBase
```

For a 6-decimal stable the `* 10_000` only balances if the cached price is per-whole-token,
but the same values are reused for ckETH (18 decimals) and ckBTC (8 decimals) through a
formula whose dimensional factor is fixed — a ~10^6 class error for volatile tokens. The
refresh path is a best-effort **text scan** (`mixins/price-oracle-api.mo:93` "no JSON
library") of a **`raw.icp0.io`** (uncertified) 50 KB response with a transform that strips
only headers (`:18-23`), so per-replica body differences can fail consensus and keep the
cache empty — matching the observed `(vec {})`.

**Impact.** Non-stable crypto payment amounts are validated against wrong/placeholder prices
with a 95% tolerance (`lib/price-oracle.mo:70`), enabling under/over-charging; combined with
F-03 (RAVEN) and F-01 (ICPay) the amount-integrity story for crypto checkout is broken.

**Fix.** Query the ICPSwap pool canister directly (typed inter-canister call) rather than
scraping `raw` JSON; store prices in explicit `ICP-e8s per whole token` units with
per-token decimals applied in `usdCentsToTokenBase`; add unit tests for each token. See task
`13-price-oracle-units-source.md`.

---

## F-14 — Drop Studio tunneled to an operator laptop (Medium, confirmed live config)

**Evidence.** The shipped frontend config points Drop Studio at a Cloudflare quick tunnel:

```json
// src/frontend/env.json:7
"drop_studio_url": "https://far-anchor-paradise-springs.trycloudflare.com",
```

`src/frontend/src/lib/drop-studio.ts` fetches `/v1/drop-studio/*` from that base
(`:52,:60,:87`), and `worker/src/drop-studio-server.js` serves those routes on
`localhost:8787` (`:18,:54,:63-77`). So an admin-facing mint/allowance/generate flow in a
"fully on-chain" dapp depends on a laptop process exposed through an **ephemeral, public,
unauthenticated-by-default** tunnel.

**Impact.** Availability (tunnel/laptop down → feature broken, see the error strings at
`drop-studio.ts:63,77`), integrity (no TLS pinning/cert of the operator; MITM of mint
requests), and exposure (anyone with the URL can probe the worker's endpoints; admin-gating
relies on `DROP_STUDIO_ADMIN_TOKEN`, `worker/src/lib/hedera-drop-studio.js:279`).

**Fix.** Move Drop Studio behind a stable, authenticated origin (or into a canister). Do not
ship ephemeral tunnel URLs in the production bundle; load from runtime config and fail
closed. See task `14-drop-studio-harden.md`.

---

## F-15 — `inspect` admits any small anonymous update (Medium, confirmed live)

**Evidence.**

```motoko
// main.mo:1964-1972
system func inspect({ caller; arg }) : Bool {
  if (arg.size() > MAX_INGRESS_BYTES) return false;
  if (not caller.isAnonymous()) return true;
  arg.size() >= 8 and arg.size() < 200;   // ANY anonymous update with 8..199-byte args passes
};
```

The gate is a size heuristic, not a method allow-list. Every anonymous update whose argument
encodes to 8–199 bytes is accepted into a consensus round; the in-method
`requireAuthenticated` then traps — **after** the canister has paid to run the round.

**Impact.** Cheap pre-consensus cycle drain and a weaker pre-filter than the documented
"one ALLOW, everything else BLOCK" intent. (Does not by itself bypass in-method auth.)

**Fix.** Allow anonymous ingress only for the explicit method set
(`_initializeAccessControl`, `resolveZip`, `ensureWeatherOutlook`, `ensureTropicalSummary`)
by matching the method name, not the arg size. See task `15-inspect-method-allowlist.md`.

---

## F-16 — Outcall / LLM cycle-drain via free principals (Medium, confirmed code)

**Evidence.** `ensureTropicalSummary(forceFlag)` is anonymous-reachable (F-15) and `force`
skips the freshness cache straight to a paid HTTPS outcall:

```motoko
// mixins/weather-hub-api.mo:906-922
let force = forceFlag != 0; if (not force) { … return cached if fresh … };
RateLimit.trapIfLimited(rateLimits.weatherTropical, caller, …);  // per-caller
await fetchTropicalSummary();  // HTTPS outcall (~2e11 cycles elsewhere in this file)
```

Rate limits are **per principal**; the SpicyAI canister likewise keys on
`Principal.toText(caller)` (`spicy_ai_canister/main.mo:210`). II principals are free to
mint, so an attacker rotates principals to multiply the budget; each `force` call burns an
outcall's worth of cycles.

**Impact.** Sustained cycle drain on the backend (weather outcalls) and spicy_ai (LLM
calls); no global/IP/PoW ceiling.

**Fix.** Add a global per-method budget (token bucket) in addition to per-principal limits;
require authentication for `force`; consider PoW or a small fee for anonymous outcall
triggers. See task `16-global-outcall-budget.md`.

---

## F-17 — `getOrder` leaks buyer + line items to anyone (Medium, confirmed code)

**Evidence.**

```motoko
// mixins/marketplace-api.mo:263-273
public query ({ caller }) func getOrder(order_id) : async ?OrderPublic {
  … if (buyer==caller or isAdmin) ?pub else ?stripOrderShipping(pub);  // non-owner still gets buyer + items
```

Shipping is now stripped for non-owners (an improvement over the prior review), but the
returned `OrderPublic` still includes the buyer **principal**, line items (`product_id`,
`plant_id`, quantities), and totals. Order ids are sequential, so anyone can enumerate the
order book and build a purchase-history/deanonymization map.

**Fix.** Return `null` (or a minimal public shape) to non-owner/non-admin callers. See task
`17-getorder-authz.md`.

---

## F-18 — II idle timeout disabled (Medium, confirmed code)

**Evidence.**

```tsx
// src/frontend/src/providers/AuthProvider.tsx:56-58
idleOptions: { disableIdle: true, disableDefaultIdleCallback: true },
```

The delegation never auto-expires on inactivity; on a shared/public computer the session
(and any linked-wallet actions) stays usable after the user walks away.

**Fix.** Enable a sane idle timeout (e.g. 30 min) with a re-auth prompt; keep the delegation
TTL bounded. See task `18-ii-idle-timeout.md`.

---

## F-19 — Apex routed through an off-chain AWS proxy (Medium, confirmed live)

**Evidence (live).** `curl -sID https://icspicy.app/` → `HTTP/2 301`, `location:
https://www.icspicy.app`, `server: ip-10-123-124-254.ec2.internal`. The apex domain is
fronted by an AWS EC2 host, not the IC boundary nodes. `www` then serves from the canister.

**Impact.** A "fully on-chain" RWA dapp has an off-chain, operator-run hop in its canonical
URL. That host can observe/modify apex traffic (including redirect targets), is a single
point of failure and a MITM/compromise surface outside the IC trust model, and is
undocumented in the architecture.

**Fix.** Serve the apex via IC custom-domain registration (BN `_acme-challenge` / `.well-known/ic-domains`)
so both apex and `www` resolve directly to the canister, or document and lock down the proxy
(it should only 301, with HSTS, and never terminate app traffic). See task
`19-apex-custom-domain.md`. **Unverified:** whether the proxy also fronts `www` for some
routes or only the apex redirect.

---

## F-20 — Frontend admin gating divorced from backend (Low, documented)

Per PROJECT_CONTEXT.md B1: `src/frontend/src/hooks/useBackend.ts` and
`components/ActorReadyProvider.tsx` hold a hard-coded `ADMIN_PIDS` list of three legacy II
PIDs that do **not** match the live admin set (`getAdmins()` above). Frontend admin UI
gating cannot observe backend admin rotation and is both stale and a parallel trust list.
**Fix:** replace with a `useAdmins()` hook backed by `getAdmins()`. See task
`21-frontend-useadmins.md`.

---

## F-21 — Hygiene / tech-debt (Info)

- Ghost stable state `wallets` / `txLog` (`main.mo:644-645`) still carried for upgrade
  compat; schedule the documented zeroing migration.
- `main.mo` ~2,028 lines and `payment-api.mo` ~1,839 lines — oversized; Phase 6 extraction
  pending.
- Vite `minify` is off (per scope note; confirm in `src/frontend/vite.config.js`) — larger
  bundle, source readable in prod.
- `confirmICPayPayment` idempotency guard **is** present now (`icpaySessionsConsumed`,
  `payment-api.mo:382,411`) — the prior "no already-paid guard" sub-finding is **remediated**;
  only the amount/currency/order-binding gap (F-01) remains.

---

## Remediation priority

1. **F-01, F-02, F-03** — stop crypto underpayment / NFT theft (Phase 0, hours).
2. **F-09 + F-10** — CSP + upload MIME/scoping (XSS chain) (Phase 0/1).
3. **F-12** — shrink backend admin set / gate withdrawals (Phase 1).
4. **F-04, F-07, F-08, F-11** — custody & payment-flow integrity (Phase 1).
5. **F-05, F-06** — treasury correctness before any SPICY funds move (Phase 5 gate).
