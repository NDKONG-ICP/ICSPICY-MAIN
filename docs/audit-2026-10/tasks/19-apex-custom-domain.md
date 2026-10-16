# Task 19 — Serve the apex directly from the IC (remove off-chain proxy) (F-19, Medium)

## Goal
Make `icspicy.app` (apex) resolve directly to the frontend canister via IC custom-domain
registration, eliminating the undocumented AWS EC2 reverse-proxy hop — or, if the proxy must
stay, document and lock it down.

## Files to read first
- Live fact: `curl -sID https://icspicy.app/` → 301 via `server: ip-10-123-124-254.ec2.internal`
  to `https://www.icspicy.app` (which serves from canister `7rukv-…`).
- `src/frontend/public/.well-known/ic-domains` (if present) and DNS/CNAME config.
- Fetch `custom-domains` SKILL.md fresh for the BN registration flow.

## Change description
Preferred — register the apex as an IC custom domain:
1. Add/confirm `.well-known/ic-domains` lists both `icspicy.app` and `www.icspicy.app`.
2. Set DNS per the IC custom-domain guide (CNAME/ALIAS to the boundary nodes +
   `_acme-challenge` + `_canister-id` TXT) so the apex is served and certified by the IC,
   not AWS.
3. Register via the boundary-node registration endpoint; verify the apex serves directly
   (no `ec2.internal` server header; `x-ic-canister-id` present).

If the proxy must remain (e.g. for apex→www redirect only):
4. Document it in PROJECT_CONTEXT, restrict it to a pure 301 with HSTS, ensure it terminates
   no application traffic, and note it as a known off-chain dependency in the threat model.

## Acceptance criteria
- `curl -sI https://icspicy.app/` shows an IC-served response (or a documented, minimal 301)
  with no app traffic through AWS.
- Both apex and `www` work with CSP + HSTS after Task 09.

## Tests to add
- Extend `scripts/audit/check-headers.sh` to assert the apex is IC-served (no `ec2.internal`
  server header) or a documented redirect-only host.

## Local verification
Not applicable locally (DNS/BN). Verify against mainnet after the owner performs DNS changes.

## Mainnet deploy notes (human only)
DNS + boundary-node registration are owner actions. Changing apex routing can cause brief
downtime — schedule a window. Keep the AWS proxy until the IC apex is confirmed, then
decommission.

## Risks & rollback
- Risk: DNS misconfig breaks the apex → stage with low TTLs; keep the proxy as fallback
  during cutover.
- Rollback: restore the previous DNS records.
