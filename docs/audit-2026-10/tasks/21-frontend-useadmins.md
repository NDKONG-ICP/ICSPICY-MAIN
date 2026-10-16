# Task 21 — Replace hard-coded frontend admin PIDs with `useAdmins()` (F-20, Low)

## Goal
Make frontend admin gating reflect the backend admin set instead of a stale hard-coded list.

## Files to read first
- `src/frontend/src/hooks/useBackend.ts` (`ADMIN_PIDS` ~:866-870; `useIsAdmin` ~:937-950)
- `src/frontend/src/components/ActorReadyProvider.tsx` (`ADMIN_PIDS` ~:42-46)
- Backend `getAdmins()` query (confirmed live, returns 5 principals).
- PROJECT_CONTEXT B1/B2 for the documented intent.

## Change description
1. Add a `useAdmins()` hook that calls `actor.getAdmins()` (cached, refetch on login) and a
   `useIsAdmin()` derived from `admins.includes(myPrincipal)`.
2. Remove both hard-coded `ADMIN_PIDS` lists and the prefix-matching logic; gate admin UI and
   the admin-actor probe on the backend result.
3. Gate the always-on `console.log` of the principal (B2) behind `import.meta.env.DEV`.
4. Admin UI gating is UX only — backend methods already enforce `requireAdmin`; this just
   aligns the UI with reality.

## Acceptance criteria
- Admin UI appears for exactly the principals in `getAdmins()` and tracks rotation after
  refetch.
- No hard-coded PID list remains in the frontend.
- No principal is logged to the console in production.

## Tests to add
- Frontend test: mock `getAdmins()` returning a principal → `useIsAdmin` true for it, false
  for others.

## Local verification
```bash
cd src/frontend && pnpm typecheck && pnpm build
```

## Mainnet deploy notes (human only)
Frontend-only asset deploy. No backend change. Verify an admin principal sees the admin UI
and a non-admin does not after deploy.

## Risks & rollback
- Risk: `getAdmins()` latency hides the admin UI briefly on load → show a loading state, not
  a hard "not admin."
- Rollback: redeploy previous build.
