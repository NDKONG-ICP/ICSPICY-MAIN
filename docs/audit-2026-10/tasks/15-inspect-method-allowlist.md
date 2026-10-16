# Task 15 — Method-name allow-list in `inspect` (F-15, Medium)

## Goal
Replace the arg-size heuristic with an explicit allow-list so anonymous ingress only reaches
the few methods intended to be anonymous.

## Files to read first
- `src/backend/main.mo` (`inspect` :1964-1972; `MAX_INGRESS_BYTES`)
- AGENTS.md "inspect_message shape: one ALLOW, everything else BLOCK" and the local-replica
  caveat (inspect is not enforced on the local replica — test logic by reading, verify on
  mainnet).
- The intended anonymous methods: `_initializeAccessControl`, `resolveZip`,
  `ensureWeatherOutlook`, `ensureTropicalSummary`.

## Change description
1. Change `inspect`'s signature to also receive `msg` (the method variant), i.e.
   `system func inspect({ caller; arg; msg })`. Match on `msg` to allow anonymous only for
   the explicit set; block all other methods for anonymous callers:
   ```motoko
   if (arg.size() > MAX_INGRESS_BYTES) return false;
   if (not caller.isAnonymous()) return true;
   switch (msg) {
     case (#_initializeAccessControl _ ) true;
     case (#resolveZip _)            true;
     case (#ensureWeatherOutlook _)  true;
     case (#ensureTropicalSummary _) true;
     case _ false;
   };
   ```
   (Use the exact variant names moc generates; `_initializeAccessControl` keeps its leading
   underscore per AGENTS.md.)
2. Keep the `MAX_INGRESS_BYTES` cap as a first-line DoS guard.

## Acceptance criteria
- Anonymous calls to any method outside the allow-list are refused pre-consensus (verify on
  mainnet — local replica does not enforce inspect; see AGENTS.md).
- The four allow-listed methods still accept anonymous ingress.
- Authenticated callers are unaffected.

## Tests to add
- Code review assertion + a mainnet post-deploy check in LIVE-CHECKS.md (anonymous call to a
  non-allow-listed update returns IC0503 inspect refusal).

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
```
(Functional verification is mainnet-only per AGENTS.md; do not conclude from local.)

## Mainnet deploy notes (human only)
Backend upgrade, no stable migration. After deploy, confirm an anonymous call to e.g.
`placeOrder` is rejected by inspect, and `resolveZip` still works anonymously.

## Risks & rollback
- Risk: a frontend path that calls another method anonymously breaks → inventory anonymous
  calls first (II-less flows). Add to the allow-list only if truly anonymous-safe.
- Rollback: revert.
