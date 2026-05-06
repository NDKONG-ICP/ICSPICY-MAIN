# IC SPICY Mainnet Launch Checklist

**Operational checklist for production deployment readiness.**

*For ICP launch planning and internal discipline.*

> IC SPICY branding: dark luxury agriculture, fire-red accents, gold highlights, and the tagline "Rare. Hot. Alive."

> Draft marketing material. Legal review required before public token, investment, or regulatory claims.

---

## Before Deploy

Read PROJECT_CONTEXT.md and AGENTS.md, fetch relevant ICP skills, complete local tests, verify admins, verify canister IDs, confirm cycles, and review upgrade risks.

## Security

Authenticated methods guarded, admin methods protected, CallerGuard on async settlement, no hardcoded secrets, no frontend-trusted prices, and no user content in Debug.print.

## Assets

Frontend built, NFT assets verified, certified paths used, raw access policy reviewed, metadata templating correct, and upload scripts tested.

## Comms

Publish launch notes, privacy policy, terms, risk notes, support channel, known limitations, and no token claims beyond reviewed disclosures.

## After Deploy

Run smoke tests, verify queries, check cycle balances, record module hashes, archive release notes, and monitor errors and customer reports.
