# IC SPICY — Remediation Plan (phased)

Each phase lists tasks **in dependency order** with an exit checklist. Task files
live in `tasks/`. Mainnet deploys are always gated by explicit owner confirmation
(AGENTS.md rule) — no agent deploys. Local verification (`moc --check`,
`dfx deploy --network local`, replica smoke) is required before every phase exit.

Severity → phase mapping is in AUDIT.md "Remediation priority".

---

## Phase 0 — Stop the bleeding (ships in hours)

Goal: close the three live money/NFT-theft holes and the XSS chain with the
smallest safe changes.

1. `01-icpay-amount-currency-binding.md` (F-01) — parse + enforce amount/currency/order-id in `verifyICPayPayment` call sites.
2. `02-order-plant-id-server-derived.md` (F-02) — ignore client `plant_id`; derive from product.
3. `03-raven-amount-guard.md` (F-03) — remove RAVEN from direct-pay allow-list (fastest safe stop) OR add server quote.
4. `09-csp-frame-protection.md` (F-09) — deploy a strict CSP + `frame-ancestors` from the asset canister.
5. `10-upload-mime-path-scope.md` (F-10) — MIME allow-list + per-principal key scoping on the two upload methods.

**Dependencies:** 1–3 independent; 4 and 5 are mutually reinforcing (ship together).

**Exit checklist**
- [ ] `verifyICPayPayment` rejects wrong amount/currency/order in a local replica test.
- [ ] A cheap-product + expensive-`plant_id` order fails or settles the cheap product's own NFT only.
- [ ] RAVEN direct payment of dust is rejected (or quote-validated).
- [ ] `curl -I https://www.icspicy.app/` shows `content-security-policy` and `frame-ancestors` after deploy.
- [ ] `storeCommunityImage("community-images/x.html", …, "text/html")` traps; keys are caller-namespaced.
- [ ] `moc --check`, `pnpm typecheck`, `pnpm build` all green.

---

## Phase 1 — Security hardening release

Goal: custody and payment-flow integrity; shrink the trust surface.

1. `12-backend-admin-minimization.md` (F-12) — reduce admin set; gate `adminWithdrawTokens` behind two-admin+timelock (or route via treasury).
2. `04-linkwallet-proof-of-control.md` (F-04) — ICRC-49 signed-challenge before linking.
3. `07-direct-payment-atomic-refund.md` (F-07) — pre-validate full order; refund on post-transfer failure; atomic settlement.
4. `08-claim-token-entropy-expiry.md` (F-08) — `raw_rand` tokens, bounded expiry, fix `holderOk`.
5. `11-restrict-admin-nft-move.md` (F-11) — forbid seizing externally-owned NFTs (or timelock it).
6. `15-inspect-method-allowlist.md` (F-15) — method-name allow-list in `inspect`.
7. `17-getorder-authz.md` (F-17) — non-owners get null/minimal.
8. `18-ii-idle-timeout.md` (F-18) — enable idle timeout.
9. `14-drop-studio-harden.md` (F-14) — remove tunnel URL from prod bundle; fail closed.
10. `19-apex-custom-domain.md` (F-19) — IC custom-domain apex (or document+lock the proxy).

**Dependencies:** 1 before 5 (admin model informs NFT-move gating). 2 before any
feature that reads linked-wallet balances. Others independent.

**Exit checklist**
- [ ] Backend admin set == operator keys only; withdrawal requires 2 approvals + delay (or treasury route).
- [ ] `linkWallet` without a valid signature is rejected; grief-lock path closed.
- [ ] Failed multi-line settlement refunds funds and transfers no NFTs (replica test).
- [ ] Claim tokens are ≥128-bit random, expire, and cannot move a non-nursery holder's NFT.
- [ ] `inspect` rejects anonymous calls to non-allow-listed methods (note: test on mainnet, not local — see AGENTS.md).
- [ ] No `trycloudflare.com` string in `src/frontend/dist`.

---

## Phase 2 — Correctness, tests, CI

Goal: lock the fixes with automated tests and a CI gate.

1. `13-price-oracle-units-source.md` (F-13) — typed units + ICPSwap pool query.
2. `20-icrc3-transaction-log.md` (F-11 companion) — ICRC-3 ledger for all ownership changes.
3. Tests: T1 (pricing units), T4 (ownership invariant), T2 (money-path replica scripts).
4. CI: T3 — `moc --check` + `pnpm typecheck` + `pnpm build` + gitleaks + smoke on PR.

**Exit checklist**
- [ ] Pricing unit tests cover every token, stable + volatile, at cent boundaries.
- [ ] `icrc3_get_blocks` returns a block per transfer/mint/burn.
- [ ] CI is required on PRs to `main` and passes on a clean branch.

---

## Phase 3 — Refactor, cost, performance

1. A1 payment-api split; A3 pricing module; A5 remove `Array.concat`-in-loop hot paths.
2. A4 ghost-state migration (zero `wallets`/`txLog`).
3. P2 query conversions; P3 product pagination; P4 bundle minify + route split; P6 cycle dashboards.

**Exit checklist**
- [ ] No settlement/audit/price path builds arrays with `concat` in a loop.
- [ ] Ghost stable vars removed via explicit migration; upgrade clean locally.
- [ ] Bundle size reduced; admin/NIMS/weather lazy-loaded.

---

## Phase 4 — Product & UX upgrades

1. U1 server-computed price breakdown at checkout; U2 soft error states.
2. U5 NFT-page SEO/prerender; U6 NIMS onboarding tooltips.
3. U3 accessibility pass; U4 mobile/responsive audit.
4. G2 PepperHead holder portal; G3 newsletter double opt-in.

**Exit checklist**
- [ ] Checkout shows authoritative server pricing; no client price is trusted.
- [ ] Lighthouse a11y + perf budgets set and met on key pages.

---

## Phase 5 — Token-launch readiness (gate before any SPICY funds move)

1. `05-treasury-execute-compensation.md` (F-05) — fix trap-after-compensation; add `resetStuckProposal`.
2. `06-treasury-admin-timelock.md` (F-06) — timelock admin rotation + economic setters.
3. O1 public transparency dashboard (ICRC-3 + treasury logs); D1 tokenomics disclosure (owner); D2 document/remove off-chain hops.
4. External audit firm engagement (PROJECT_CONTEXT open item) — schedule early.

**Exit checklist**
- [ ] A failed treasury transfer returns to `#pending` (replica test with a failing ledger stub).
- [ ] Admin rotation + ledger/policy changes require two admins + 7-day timelock.
- [ ] Transparency dashboard live; disclosure published; external audit booked.
- [ ] No single key controls both treasury funds and the NFT ledger.

---

## Cross-cutting rules (every phase)
- Plan-then-execute; show diffs before applying (AGENTS.md).
- `moc --check` + local deploy + smoke before "done."
- Never add a `var` field or variant case to a stable record without an explicit migration (PROJECT_CONTEXT Patterns 1–3).
- Read-only on mainnet during development; owner performs all `--network ic` deploys.
