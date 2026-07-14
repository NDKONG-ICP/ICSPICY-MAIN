---
title: IC SPICY Masterclass — Content Index
status: REVIEW_REQUIRED
sourceCurriculum: Desktop/IC_SPICY_Masterclass_Curriculum.docx
note: Connective tissue over CookBook + Pepperpedia + natural-farming docs. No RAG ingestion until William approves.
---

# IC SPICY Masterclass — Content Backbone

**Status:** All 25 lessons are `draft-full` for William review. Nothing here is live in SpicyAI / docs_backend yet. **No RAG ingest. No deploy.**

**Integrity rules**
- Original IC SPICY prose that synthesizes existing CookBook recipes, Pepperpedia guides, and public soil science.
- Practitioners (Master Cho, Chris Trump, Youngsang Cho, Matt Powers, Dr. Elaine Ingham, etc.) credited by name with **official** further-reading links only — never scraped course text.
- Every lesson anchors to real `cookbookSlugs[]` and/or `pepperpediaVarietyIds[]` (live Pepperpedia: **1 = Scotch Bonnet**, **5 = Ghost**, **7 = Reaper**, **10 = Red Habanero**, **28 = Jalapeño**, **41 = Apocalypse Scorpion**, **840 = Sugar Rush Peach**).
- `[VERIFY vs CookBook: <slug>]` on every dosage/ratio/temp that must match a recipe card.
- Plain `[VERIFY]` only for biochemical named-hormone claims, region/number targets (SOM %, F:B), climate normals, food-safety pH thresholds, or uncited peak-heat day-counts.
- `REVIEW_REQUIRED: true` on every lesson file.

## Modules (6) · Lessons (25)

| ID | File | Status |
|---|---|---|
| **M1** Soil Biology Foundations · Badge: Soil Steward | | |
| 1.1 | `module-01-soil-biology/01-the-soil-food-web.md` | **FULL DRAFT** (voice template) |
| 1.2 | `module-01-soil-biology/02-fungi-and-mycorrhizae.md` | **FULL DRAFT** |
| 1.3 | `module-01-soil-biology/03-reading-your-soil.md` | **FULL DRAFT** |
| 1.4 | `module-01-soil-biology/04-feeding-the-biology.md` | **FULL DRAFT** |
| **M2** KNF & JADAM Inputs · Badge: Input Alchemist | | |
| 2.1 | `module-02-knf-jadam-inputs/01-fpj-fermented-plant-juice.md` | **FULL DRAFT** (voice template) |
| 2.2 | `module-02-knf-jadam-inputs/02-ohn-oriental-herbal-nutrient.md` | **FULL DRAFT** |
| 2.3 | `module-02-knf-jadam-inputs/03-jadam-jms-and-jlf.md` | **FULL DRAFT** |
| 2.4 | `module-02-knf-jadam-inputs/04-calcium-and-mineral-inputs.md` | **FULL DRAFT** |
| **M3** Regenerative Bed Building · Badge: Bed Builder | | |
| 3.1 | `module-03-regenerative-beds/01-no-till-principles.md` | **FULL DRAFT** |
| 3.2 | `module-03-regenerative-beds/02-imo-collection-and-culturing.md` | **FULL DRAFT** |
| 3.3 | `module-03-regenerative-beds/03-compost-and-vermicompost.md` | **FULL DRAFT** |
| 3.4 | `module-03-regenerative-beds/04-mulch-and-cover-systems.md` | **FULL DRAFT** |
| **M4** Rare Chili Cultivation · Badge: Chili Whisperer | | |
| 4.1 | `module-04-rare-chili/01-germinating-stubborn-superhots.md` | **FULL DRAFT** |
| 4.2 | `module-04-rare-chili/02-lineage-and-heat-genetics.md` | **FULL DRAFT** |
| 4.3 | `module-04-rare-chili/03-vegetative-vigor.md` | **FULL DRAFT** |
| 4.4 | `module-04-rare-chili/04-flower-to-fruit.md` | **FULL DRAFT** |
| 4.5 | `module-04-rare-chili/05-ripening-and-peak-heat.md` | **FULL DRAFT** |
| **M5** Climate, Weather & Seasons · Badge: Season Reader | | |
| 5.1 | `module-05-climate-seasons/01-soil-moisture-literacy.md` | **FULL DRAFT** |
| 5.2 | `module-05-climate-seasons/02-storms-and-extreme-weather.md` | **FULL DRAFT** |
| 5.3 | `module-05-climate-seasons/03-zone-10a-seasonality.md` | **FULL DRAFT** |
| 5.4 | `module-05-climate-seasons/04-overwintering-chilies.md` | **FULL DRAFT** |
| **M6** Small-Batch Craft & Provenance · Badge: Small-Batch Master | | |
| 6.1 | `module-06-small-batch-provenance/01-harvest-and-handling.md` | **FULL DRAFT** |
| 6.2 | `module-06-small-batch-provenance/02-flavor-balance.md` | **FULL DRAFT** |
| 6.3 | `module-06-small-batch-provenance/03-fermentation-and-preservation.md` | **FULL DRAFT** |
| 6.4 | `module-06-small-batch-provenance/04-provenance-and-grower-token.md` | **FULL DRAFT** |

## Review order (by module)

1. **M1** — soil biology voice + remaining `[VERIFY]` on SOM / F:B / AMF multipliers
2. **M2** — CookBook-locked input numbers (highest spot-check priority)
3. **M3** — IMO ladder timings/temps
4. **M4** — FPJ/FAA/WCA/FFJ/seawater numbers + genetics prose
5. **M5** — threshold-based recipes + climate-normal flags
6. **M6** — LAB/BRV field rates + food-safety pH `[VERIFY]`

## Related existing corpus (do not duplicate)

- CookBook seed: `scripts/data/cookbook-recipes.json` (50 canonical + 7 legacy live)
- Natural-farming docs: `docs/natural-farming/NF_01…NF_15` (already in SpicyAI `natural-farming` category)
- Pepperpedia: variety guides via `/variety/{id}/guide`
- RAG plan: `content/masterclass/RAG_PLAN.md` (do not execute until approved)
