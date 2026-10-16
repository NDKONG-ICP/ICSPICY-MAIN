# Task 18 — Enable Internet Identity idle timeout (F-18, Medium)

## Goal
Re-enable an idle session timeout so a delegation does not persist indefinitely on a
shared/public machine.

## Files to read first
- `src/frontend/src/providers/AuthProvider.tsx` (:56-58 `disableIdle: true`,
  `disableDefaultIdleCallback: true`)
- `src/frontend/src/lib/agent-hub-idl.ts` (:292-294 same options — update consistently)
- Fetch `internet-identity` SKILL.md for `idleOptions`/`maxTimeToLive` guidance.

## Change description
1. In `AuthProvider.tsx`, set a finite idle timeout (e.g. `idleOptions: { idleTimeout:
   30 * 60 * 1000, disableIdle: false }`) and provide an `onIdle` callback that logs the user
   out (clears the agent/identity) and shows a re-login prompt.
2. Bound the delegation `maxTimeToLive` (e.g. 8 hours) at login if not already.
3. Apply the same change to `agent-hub-idl.ts` so both actors share the policy.
4. Ensure in-progress long operations (uploads) handle logout gracefully (surface a message,
   not a crash).

## Acceptance criteria
- After the idle timeout with no activity, the session is cleared and the user must re-auth.
- Active use resets the idle timer (no surprise logout mid-session).

## Tests to add
- Frontend unit/integration test mocking the AuthClient idle callback → asserts logout state.
- Manual: log in, idle past the timeout, confirm logout.

## Local verification
```bash
cd src/frontend && pnpm typecheck && pnpm build
```

## Mainnet deploy notes (human only)
Frontend-only asset deploy. No backend change.

## Risks & rollback
- Risk: timeout too short annoys growers doing long NIMS sessions → make it generous
  (30–60 min) and reset on activity.
- Rollback: redeploy previous build.
