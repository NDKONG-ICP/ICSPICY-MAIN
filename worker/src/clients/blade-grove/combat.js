/** Blade Grove Arena auto-battler — ported from Arena UI combat (`rv` / helpers). */

export const FACTION_TO_TRIBE = {
  "Root Ronin": "ronin",
  "Neon Kunoichi": "kunoichi",
  "Circuit Sohei": "sohei",
  "Data Yamabushi": "yamabushi",
  "Chrome Ashigaru": "ashigaru",
};

const ENEMY_TOKEN_BASE = 1_000_000;

export function cardToUnit(card, { side = "ally", slot = 0 } = {}) {
  const u = card.playable.stats;
  const legendBonus = card.playable.rank === "Legend" ? 1 : 0;
  const id = card.id;
  return {
    tokenId: side === "enemy" ? ENEMY_TOKEN_BASE + id * 10 + slot : id,
    cardId: id,
    tribe: FACTION_TO_TRIBE[card.playable.faction] || "ronin",
    attack: Math.max(1, Math.round(u.ATK / 12) + legendBonus),
    health: Math.max(1, Math.round(u.DEF / 10)),
    maxHealth: Math.max(1, Math.round(u.DEF / 10)),
    initiative: u.SPD,
    spell: u.ROOT,
    ability: card.playable.ability,
    rank: card.playable.rank,
    name: card.name,
    weapon: card.playable.weapon,
    veilUsed: false,
    firstStrikeUsed: false,
  };
}

function cloneBoard(units) {
  return units.map((r) => ({ ...r, veilUsed: false, firstStrikeUsed: false }));
}

function alive(board) {
  return board.some((r) => r.health > 0);
}

function firstLivingIndex(board) {
  return board.findIndex((r) => r.health > 0);
}

function hasAbility(board, ability) {
  return board.some((u) => u.health > 0 && u.ability === ability);
}

function applyDamage(target, dmg, log, extra) {
  if (dmg <= 0 || target.health <= 0) return;
  let died = false;
  if (target.health > dmg) {
    target.health -= dmg;
  } else if (target.ability === "neon_veil" && !target.veilUsed) {
    target.veilUsed = true;
    target.health = 1;
    log.push({ ability: { id: target.tokenId, name: "neon_veil" } });
  } else {
    target.health = 0;
    died = true;
  }
  if (extra) log.push({ damage: { to: target.tokenId, dmg, ...extra } });
  if (died) log.push({ death: { id: target.tokenId } });
}

function applySynergies(board, log) {
  const living = board.filter((g) => g.health > 0);
  const by = (tribe) => living.filter((z) => z.tribe === tribe);
  const ronin = by("ronin");
  const kunoichi = by("kunoichi");
  const sohei = by("sohei");
  const yamabushi = by("yamabushi");
  const ashigaru = by("ashigaru");

  if (ronin.length >= 2) {
    for (const g of ronin) g.attack += 1;
    log.push({ ability: { id: ronin[0].tokenId, name: "synergy_ronin" } });
  }
  if (kunoichi.length >= 2) {
    log.push({ ability: { id: kunoichi[0].tokenId, name: "synergy_kunoichi" } });
  }
  if (sohei.length >= 2) {
    for (const g of sohei) {
      g.health += 1;
      g.maxHealth += 1;
    }
    log.push({ ability: { id: sohei[0].tokenId, name: "synergy_sohei" } });
  }
  if (yamabushi.length >= 2) {
    log.push({ ability: { id: yamabushi[0].tokenId, name: "synergy_yamabushi" } });
  }
  if (ashigaru.length === 1) {
    ashigaru[0].attack += 1;
    log.push({
      ability: { id: ashigaru[0].tokenId, name: "synergy_ashigaru_solo" },
    });
  } else if (ashigaru.length >= 2) {
    log.push({
      ability: { id: ashigaru[0].tokenId, name: "synergy_ashigaru_volley" },
    });
  }

  return {
    kunoichiFollowup: kunoichi.length >= 2 ? 0.75 : 0.5,
    yamabushiRootThreshold: yamabushi.length >= 2 ? 35 : 45,
    ashigaruVolleyShots: ashigaru.length >= 2 ? 2 : 0,
  };
}

function styleFor(unit) {
  if (unit.ability === "blade_flare") return "katana";
  if (unit.ability === "neon_veil" || unit.tribe === "kunoichi") return "daggers";
  if (unit.ability === "circuit_guard" || unit.tribe === "sohei") return "staff";
  if (unit.ability === "root_bind" || unit.tribe === "yamabushi") return "roots";
  if (unit.ability === "ashigaru_volley" || unit.tribe === "ashigaru") return "rifle";
  switch (unit.tribe) {
    case "ronin":
      return "katana";
    case "kunoichi":
      return "daggers";
    case "sohei":
      return "staff";
    case "yamabushi":
      return "roots";
    case "ashigaru":
      return "rifle";
    default:
      return "slash";
  }
}

/**
 * @param {ReturnType<typeof cardToUnit>[]} allies
 * @param {ReturnType<typeof cardToUnit>[]} enemies
 * @param {number} seed
 * @returns {{ winner: "a"|"b"|"draw", log: object[] }}
 */
export function simulateFight(allies, enemies, seed = 1) {
  const log = [];
  const a = cloneBoard(allies);
  const b = cloneBoard(enemies);
  const auraA = applySynergies(a, log);
  const auraB = applySynergies(b, log);

  for (const side of [a, b]) {
    for (const u of side) {
      if (u.ability === "circuit_guard" && u.health > 0) {
        for (const ally of side) {
          if (ally.health > 0) ally.health += 1;
        }
        log.push({ ability: { id: u.tokenId, name: "circuit_guard" } });
      }
    }
  }

  let x = seed >>> 0;
  let rounds = 0;
  while (alive(a) && alive(b) && rounds < 200) {
    rounds += 1;
    const order = [];
    a.forEach((H, D) => {
      if (H.health > 0) order.push({ side: "a", idx: D, init: H.initiative, tid: H.tokenId });
    });
    b.forEach((H, D) => {
      if (H.health > 0) order.push({ side: "b", idx: D, init: H.initiative, tid: H.tokenId });
    });
    order.sort((H, D) => D.init - H.init || H.tid - D.tid);

    for (const H of order) {
      if (!alive(a) || !alive(b)) break;
      const mine = H.side === "a" ? a : b;
      const theirs = H.side === "a" ? b : a;
      const aura = H.side === "a" ? auraA : auraB;
      const X = mine[H.idx];
      if (!X || X.health <= 0) continue;
      const Z = firstLivingIndex(theirs);
      if (Z < 0) continue;
      const ee = theirs[Z];
      const fe = styleFor(X);
      let Se = X.attack;
      let re = false;
      const firstStrike =
        (X.tribe === "kunoichi" || X.ability === "neon_veil") && !X.firstStrikeUsed;
      if (firstStrike) X.firstStrikeUsed = true;
      x = (x * 1103515245 + 12345) % 2147483648;
      if (X.rank === "Legend" && x % 5 === 0) {
        Se += 1;
        re = true;
      }
      log.push({
        attack: {
          from: X.tokenId,
          to: ee.tokenId,
          dmg: Se,
          style: fe,
          ability: X.ability,
          crit: re,
        },
      });
      applyDamage(ee, Se, log);
      if (firstStrike && ee.health > 0) {
        const Ee = Math.max(1, Math.floor(X.attack * aura.kunoichiFollowup));
        log.push({
          attack: {
            from: X.tokenId,
            to: ee.tokenId,
            dmg: Ee,
            style: "daggers",
            ability: X.ability,
          },
        });
        applyDamage(ee, Ee, log);
      }
      if (X.ability === "blade_flare") {
        const Ee = X.spell >= 40 ? 2 : 1;
        for (let se = Z + 1; se < theirs.length; se++) {
          if (theirs[se].health > 0) {
            applyDamage(theirs[se], Ee, log, {
              from: X.tokenId,
              tag: "blade_flare",
              style: "katana",
            });
            log.push({ ability: { id: X.tokenId, name: "blade_flare" } });
            break;
          }
        }
      }
      let rooted = false;
      if (
        X.ability === "root_bind" &&
        X.spell >= aura.yamabushiRootThreshold &&
        ee.health > 0
      ) {
        applyDamage(ee, 1, log, {
          from: X.tokenId,
          tag: "root_bind",
          style: "roots",
        });
        log.push({ ability: { id: X.tokenId, name: "root_bind" } });
        rooted = true;
      }
      if (X.ability === "ashigaru_volley") {
        const shots =
          aura.ashigaruVolleyShots || (X.spell >= 55 ? 2 : 1);
        for (let se = 0; se < shots; se++) {
          x = (x * 1103515245 + 12345) % 2147483648;
          const Ge = theirs.filter(
            (Oe) => Oe.health > 0 && Oe.tokenId !== ee.tokenId,
          );
          if (!Ge.length) break;
          const et = Ge[x % Ge.length];
          applyDamage(et, 1, log, {
            from: X.tokenId,
            tag: "ashigaru_volley",
            style: "rifle",
          });
          log.push({ ability: { id: X.tokenId, name: "ashigaru_volley" } });
        }
      }
      if (ee.health > 0 && X.health > 0 && !rooted) {
        let Ee = ee.attack;
        if (hasAbility(mine, "circuit_guard")) Ee = Math.max(1, Ee - 1);
        applyDamage(X, Ee, log, {
          from: ee.tokenId,
          tag: "retaliation",
          style: styleFor(ee),
        });
      }
    }
  }

  const winner = alive(a) && !alive(b) ? "a" : alive(b) && !alive(a) ? "b" : "draw";
  log.push({ end: { winner } });
  return { winner, log };
}
