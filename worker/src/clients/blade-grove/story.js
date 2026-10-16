import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { cardToUnit, simulateFight } from "./combat.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const DEFAULT_PROGRESS_PATH = join(
  __dirname,
  "../../../data/blade-grove-progress.json",
);

export function loadCatalog() {
  const cards = JSON.parse(
    readFileSync(join(DATA_DIR, "cards.json"), "utf8"),
  ).cards;
  const campaign = JSON.parse(
    readFileSync(join(DATA_DIR, "campaign.json"), "utf8"),
  );
  const byId = new Map(cards.map((c) => [c.id, c]));
  return { cards, campaign, byId };
}

function emptyProgress(campaign) {
  const starters = campaign.nodes
    .filter((n) => n.startsUnlocked)
    .map((n) => n.id);
  return {
    inducted: false,
    unlockedNodeIds: starters,
    clearedNodeIds: [],
    ownedCardIds: [],
    sap: 0,
    packTickets: 0,
    deckXp: 0,
    seasonXp: 0,
    wins: 0,
    losses: 0,
    lastCleared: null,
    updatedAt: new Date().toISOString(),
  };
}

export function loadProgress(path = DEFAULT_PROGRESS_PATH) {
  const { campaign } = loadCatalog();
  if (!existsSync(path)) return emptyProgress(campaign);
  try {
    return { ...emptyProgress(campaign), ...JSON.parse(readFileSync(path, "utf8")) };
  } catch {
    return emptyProgress(campaign);
  }
}

export function saveProgress(progress, path = DEFAULT_PROGRESS_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  const next = { ...progress, updatedAt: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(next, null, 2));
  return next;
}

function nodeById(campaign, id) {
  return campaign.nodes.find((n) => n.id === id);
}

function nextUnlocked(campaign, progress) {
  const cleared = new Set(progress.clearedNodeIds);
  const unlocked = new Set(progress.unlockedNodeIds);
  return campaign.nodes.filter((n) => unlocked.has(n.id) && !cleared.has(n.id));
}

/** Pro formation: tank/sohei front, fill by threat, prefer tribe synergy. */
export function pickFormation(rosterCards, enemyCount, seed = 1) {
  const need = Math.max(1, Math.min(enemyCount + 1, 4, rosterCards.length));
  const scored = rosterCards.map((c, i) => {
    const p = c.playable;
    const tribe = p.faction;
    let score = p.stats.ATK * 0.45 + p.stats.DEF * 0.55 + p.stats.SPD * 0.15;
    if (p.ability === "circuit_guard") score += 40;
    if (p.rank === "Legend") score += 50;
    else if (p.rank === "Captain") score += 30;
    else if (p.rank === "Warden") score += 18;
    // slight seed jitter for retry variants
    score += ((seed * (i + 3)) % 17) - 8;
    return { c, score, tribe, ability: p.ability };
  });
  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, need).map((x) => x.c);
  // Front: highest DEF / circuit_guard
  picked.sort((a, b) => {
    const tank = (c) =>
      (c.playable.ability === "circuit_guard" ? 1000 : 0) + c.playable.stats.DEF;
    return tank(b) - tank(a);
  });
  return picked;
}

function rosterFromProgress(byId, progress, extraIds = []) {
  const ids = new Set([
    ...progress.ownedCardIds,
    ...extraIds.map(Number),
  ]);
  const cards = [...ids]
    .map((id) => byId.get(Number(id)))
    .filter(Boolean);
  return cards;
}

export function induct(progress, campaign) {
  if (progress.inducted) {
    return { progress, starterCardIds: [] };
  }
  const unlocked = new Set(progress.unlockedNodeIds);
  for (const n of campaign.nodes) {
    if (n.startsUnlocked) unlocked.add(n.id);
  }
  const owned = new Set(progress.ownedCardIds);
  for (const id of campaign.starterCardIds) owned.add(id);
  const next = {
    ...progress,
    inducted: true,
    unlockedNodeIds: [...unlocked],
    ownedCardIds: [...owned],
    sap: Math.max(progress.sap, campaign.starterSap),
  };
  return { progress: next, starterCardIds: [...campaign.starterCardIds] };
}

function applyClear(progress, node, firstClear) {
  const unlocked = new Set(progress.unlockedNodeIds);
  const cleared = new Set(progress.clearedNodeIds);
  cleared.add(node.id);
  for (const id of node.unlocks || []) unlocked.add(id);
  const owned = new Set(progress.ownedCardIds);
  let sap = progress.sap;
  let packTickets = progress.packTickets;
  let deckXp = progress.deckXp;
  const granted = [];
  if (firstClear) {
    sap += node.rewards?.sap ?? 0;
    packTickets += node.rewards?.packTickets ?? 0;
    deckXp += node.rewards?.xp ?? 0;
    for (const id of node.rewards?.grantCardIds ?? []) {
      owned.add(id);
      granted.push(id);
    }
  }
  return {
    progress: {
      ...progress,
      unlockedNodeIds: [...unlocked],
      clearedNodeIds: [...cleared],
      ownedCardIds: [...owned],
      sap,
      packTickets,
      deckXp,
      wins: progress.wins + 1,
      lastCleared: {
        nodeId: node.id,
        title: node.title,
        firstClear,
        granted,
        sapGain: firstClear ? node.rewards?.sap ?? 0 : 0,
      },
    },
    granted,
  };
}

/**
 * Clear up to maxNodes Chronicle nodes with formation AI.
 * @returns {{ progress, results: Array, summary: string }}
 */
export function playStory({
  maxNodes = 3,
  progressPath = DEFAULT_PROGRESS_PATH,
  extraCardIds = [],
  seedBase = Date.now(),
} = {}) {
  const { campaign, byId } = loadCatalog();
  let progress = loadProgress(progressPath);
  const inducted = induct(progress, campaign);
  progress = inducted.progress;

  const results = [];
  let remaining = Math.max(1, Number(maxNodes) || 3);

  while (remaining > 0) {
    const queue = nextUnlocked(campaign, progress);
    if (!queue.length) break;
    const node = queue[0];
    const enemies = (node.enemyIds || [])
      .map((id, slot) => {
        const card = byId.get(id);
        return card ? cardToUnit(card, { side: "enemy", slot }) : null;
      })
      .filter(Boolean);
    if (!enemies.length) {
      results.push({ nodeId: node.id, error: "missing enemy cards" });
      break;
    }

    const roster = rosterFromProgress(byId, progress, extraCardIds);
    if (!roster.length) {
      results.push({ nodeId: node.id, error: "empty roster" });
      break;
    }

    let won = false;
    let lastWinner = "draw";
    let formationIds = [];
    for (let attempt = 0; attempt < 3 && !won; attempt++) {
      const form = pickFormation(roster, enemies.length, seedBase + attempt * 97);
      formationIds = form.map((c) => c.id);
      const allies = form.map((c, slot) => cardToUnit(c, { side: "ally", slot }));
      const { winner } = simulateFight(allies, enemies, (seedBase + attempt) >>> 0);
      lastWinner = winner;
      if (winner === "a") won = true;
    }

    if (!won) {
      progress = {
        ...progress,
        losses: progress.losses + 1,
      };
      results.push({
        nodeId: node.id,
        title: node.title,
        won: false,
        winner: lastWinner,
        formationIds,
      });
      break;
    }

    const firstClear = !progress.clearedNodeIds.includes(node.id);
    const applied = applyClear(progress, node, firstClear);
    progress = applied.progress;
    results.push({
      nodeId: node.id,
      title: node.title,
      district: node.district,
      won: true,
      firstClear,
      formationIds,
      granted: applied.granted,
      sapGain: firstClear ? node.rewards?.sap ?? 0 : 0,
      xpGain: firstClear ? node.rewards?.xp ?? 0 : 0,
    });
    remaining -= 1;
  }

  progress = saveProgress(progress, progressPath);
  const cleared = results.filter((r) => r.won).length;
  const summary =
    cleared > 0
      ? `Cleared ${cleared} Chronicle node(s): ${results
          .filter((r) => r.won)
          .map((r) => `${r.title}${r.firstClear ? " ★" : ""}`)
          .join("; ")}. Sap ${progress.sap}, deck XP ${progress.deckXp}, roster ${progress.ownedCardIds.length}, record ${progress.wins}–${progress.losses}.`
      : `No nodes cleared (queue empty or loss). Progress: ${progress.clearedNodeIds.length}/${campaign.nodes.length}, sap ${progress.sap}.`;

  return {
    progress,
    results,
    summary,
    inductedStarters: inducted.starterCardIds,
    campaignTitle: campaign.title,
  };
}

export function statusSnapshot(progressPath = DEFAULT_PROGRESS_PATH) {
  const { campaign } = loadCatalog();
  const progress = loadProgress(progressPath);
  const pending = nextUnlocked(campaign, progress).map((n) => n.id);
  return {
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    totalNodes: campaign.nodes.length,
    cleared: progress.clearedNodeIds.length,
    pending,
    inducted: progress.inducted,
    sap: progress.sap,
    packTickets: progress.packTickets,
    deckXp: progress.deckXp,
    wins: progress.wins,
    losses: progress.losses,
    rosterSize: progress.ownedCardIds.length,
    lastCleared: progress.lastCleared,
    updatedAt: progress.updatedAt,
  };
}

export { DEFAULT_PROGRESS_PATH };
