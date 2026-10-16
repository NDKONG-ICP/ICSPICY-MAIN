# Task 14 — Remove the Drop Studio tunnel from the prod bundle (F-14, Medium)

## Goal
Stop shipping an ephemeral `trycloudflare.com` tunnel URL (pointing at an operator laptop)
in the production frontend, and make the feature fail closed when unconfigured.

## Files to read first
- `src/frontend/env.json` (`drop_studio_url` :7)
- `src/frontend/src/lib/drop-studio.ts` (`dropStudioUrl` :52; DEV localhost :55; error
  strings :63,:77; fetch sites :60,:87,:101)
- `src/frontend/src/lib/runtime-env.ts` (:4)
- `worker/src/drop-studio-server.js`; `worker/src/lib/hedera-drop-studio.js` (admin token :279)

## Change description
1. Remove the hard-coded tunnel URL from `env.json`; leave `drop_studio_url` empty/unset in
   production. Load it only from runtime config the operator controls (never a committed
   ephemeral URL).
2. In `drop-studio.ts`, if no stable URL is configured in production, disable the Drop Studio
   UI (fail closed) rather than calling a dead tunnel. Keep `127.0.0.1:8787` for DEV only.
3. Decide the long-term home: either (a) move Drop Studio behind a stable, authenticated
   HTTPS origin with TLS the app can trust, or (b) move the mint/allowance logic into a
   canister. Document the decision.
4. Ensure the worker endpoints require `DROP_STUDIO_ADMIN_TOKEN` for all state-changing
   routes (`/allowance`, `/generate`), and that the token is not logged.
5. Confirm no `trycloudflare.com` string remains in `src/frontend/dist` after build.

## Acceptance criteria
- `grep -r trycloudflare src/frontend/dist` returns nothing after build.
- With no configured URL, the Drop Studio admin UI shows a clear "not configured" state and
  makes no network calls.
- Worker state-changing routes reject requests without the admin token.

## Tests to add
- `scripts/audit/no-tunnel-in-bundle.sh`: build frontend, grep dist for `trycloudflare`/`8787`
  and fail if present (outside DEV guard).

## Local verification
```bash
cd src/frontend && pnpm build && cd ../.. && bash scripts/audit/no-tunnel-in-bundle.sh
```

## Mainnet deploy notes (human only)
Frontend asset deploy. Provide the operator a documented way to set a stable Drop Studio URL
at runtime (or leave disabled). Rotate `DROP_STUDIO_ADMIN_TOKEN` if the tunnel was ever
public.

## Risks & rollback
- Risk: Drop Studio becomes unavailable until a stable origin exists — acceptable; it was
  already unreliable.
- Rollback: redeploy previous build (re-introduces the tunnel — avoid).
