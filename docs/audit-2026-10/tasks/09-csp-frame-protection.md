# Task 09 — Serve a strict CSP + frame protection on the live site (F-09, High)

## Goal
Make the deployed asset canister actually serve a strict Content-Security-Policy with
`frame-ancestors`, remove `unsafe-eval`, and eliminate `unsafe-inline` for scripts.

## Files to read first
- `src/frontend/public/.ic-assets.json5` (current policy :6)
- AGENTS.md Phase 2 learnings: **`set_asset_properties` does NOT update the certified tree**;
  headers must be set at `commit_batch` time — so the upload script / asset config is the
  source of truth, and you must re-verify headers after deploy.
- `scripts/upload-frontend.mjs` (how headers are applied during upload)
- Fetch `asset-canister` SKILL.md fresh.

## Change description
1. In `.ic-assets.json5`, replace the `script-src` to drop `'unsafe-eval'` and
   `'unsafe-inline'`; use nonces/hashes for any required inline scripts (Vite can emit
   hashed scripts — prefer no inline). Pin exact IC origins instead of `*.icp0.io`/`*.ic0.app`
   where possible.
2. Add `frame-ancestors 'none'` (or only the II origin if the app is ever framed by II) and
   keep `X-Content-Type-Options: nosniff`. Add `Referrer-Policy: strict-origin-when-cross-origin`.
3. Verify the policy is applied at upload/commit time (not via `set_asset_properties`), since
   the boundary node validates response headers against the certified tree built at
   `commit_batch`. Confirm `scripts/upload-frontend.mjs` stores headers inside
   `batch.store({ headers: [...] })`.
4. Investigate why the current `.ic-assets.json5` CSP is **not** present in live responses
   (confirmed absent via `curl`): likely the `security_policy: "standard"` + custom header
   interaction, or the policy was never deployed. Fix so the header appears.

## Acceptance criteria
- `curl -sI https://www.icspicy.app/` shows a `content-security-policy` header with no
  `unsafe-eval`, and a `frame-ancestors` directive, after deploy.
- The app still loads and functions (II login, ICPay, PayPal, images) under the new policy —
  test each third-party (PayPal SDK, YouTube embeds) and widen the policy minimally if needed.
- No `503 Invalid tree root hash` (headers set at commit time, not post-hoc).

## Tests to add
- `scripts/audit/check-headers.sh`: `curl -sI` the live/local asset canister and assert the
  presence of CSP + `frame-ancestors` + `nosniff`; fail if `unsafe-eval` present.
- Manual smoke: load every page, confirm no CSP console violations that break functionality.

## Local verification
```bash
cd src/frontend && pnpm build
cd ../.. && dfx deploy --network local frontend
bash scripts/audit/check-headers.sh http://<local-frontend>.localhost:4943/
```

## Mainnet deploy notes (human only)
Frontend asset deploy. Re-run the upload script path that sets headers at commit. After
deploy, run `check-headers.sh` against `https://www.icspicy.app/` and confirm the header is
present. Keep the previous build to roll back.

## Risks & rollback
- Risk: too-strict CSP breaks a third-party (PayPal/YouTube/II) → iterate with the console
  violation report; stage on the local/preview canister first.
- Rollback: redeploy the previous frontend build.
