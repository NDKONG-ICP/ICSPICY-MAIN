import { hitRadiusFor } from "./atlas";
import {
  BLADE_FADE_MS,
  COMBO_WINDOW_MS,
  DIFFICULTY,
  FRENZY_DURATION_MS,
  FRENZY_INTERVAL_MS,
  GRAVITY,
  MAX_LIVES,
  MAX_OBJECTS,
  SHU_BASE,
  SPAWN_WEIGHTS,
  SWIPE_VELOCITY_MIN,
  comboMultiplier,
  scoreToTier,
  tierIndex,
  type BatchTier,
  type IngredientKind,
} from "./constants";
import {
  drawBladeSegment,
  drawEmberRing,
  drawFrenzyCinematicOverlay,
  drawHeatRing,
  drawIngredient,
  drawSplatter,
  initFxSprites,
  juiceColor,
  type SplatterDecal,
} from "./draw";
import { ParticlePool } from "./particles";
import {
  DEFAULT_SPAWN_SEQUENCE_LEN,
  deriveSpawnSequence,
  kindNatToIngredient,
  type SpawnEvent,
} from "./spawn-sequence";
import {
  buildSliceLogJson,
  shuBase,
  validateRun,
  type SliceLogEntry,
} from "./slicer-scoring";

export type GamePhase = "ready" | "playing" | "paused" | "over";

export interface BladePoint {
  x: number;
  y: number;
  t: number;
}

export interface GameObject {
  id: number;
  kind: IngredientKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotV: number;
  radius: number;
  whole: boolean;
  half?: "left" | "right";
  lifeMs: number;
  flameOrbit: number;
  /** Prep Mode: pantry raw id — unsliced misses leave pantry untouched. */
  pantryId?: string;
  /** Arcade sequence index for validated runs. */
  spawnIndex?: number;
  /** Frenzy 2× from spawn event (not global frenzyActive). */
  spawnIsFrenzy?: boolean;
}

export interface PopupEvent {
  text: string;
  id: number;
}

export interface SliceResult {
  scoreGain: number;
  popup?: string;
  shake?: boolean;
  slowMo?: boolean;
  legendary?: boolean;
  /** Prep Mode: successfully sliced pantry raw ids (convert raw→sliced). */
  slicedPantryIds?: string[];
}

export type SlicerMode = "arcade" | "prep";

export interface PrepSpawnItem {
  pantryId: string;
  kind: IngredientKind;
}

let nextId = 1;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export type FrenzyCinematicTier = "full" | "lite" | "off";

export interface FrenzyCinematic {
  scale: number;
  vignette: number;
  bloom: number;
  shimmer: number;
  focalX: number;
  focalY: number;
}

function pickIngredient(pool: IngredientKind[]): IngredientKind {
  let total = 0;
  for (const k of pool) total += SPAWN_WEIGHTS[k];
  if (total <= 0) return pool[0] ?? "lime";
  let r = Math.random() * total;
  for (const k of pool) {
    r -= SPAWN_WEIGHTS[k];
    if (r <= 0) return k;
  }
  return pool[pool.length - 1] ?? "lime";
}

function segmentCircleHit(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) {
    const d = Math.hypot(cx - x1, cy - y1);
    return d <= r;
  }
  let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  return Math.hypot(cx - px, cy - py) <= r;
}

export class SlicerEngine {
  width = 0;
  height = 0;
  dpr = 1;

  phase: GamePhase = "ready";
  score = 0;
  combo = 0;
  bestCombo = 0;
  lives = MAX_LIVES;
  elapsedMs = 0;
  lastSliceMs = 0;
  swipeSliceCount = 0;
  frenzyActive = false;
  frenzyEndsAt = 0;
  nextFrenzyAt = FRENZY_INTERVAL_MS;
  slowMoUntil = 0;
  shakeUntil = 0;
  shakeMag = 0;
  /** full = zoom + slow-mo + overlays; lite = vignette only; off = burst only. */
  frenzyCinematicTier: FrenzyCinematicTier = "full";
  frenzyCineStart = 0;
  frenzyFocalX = 0;
  frenzyFocalY = 0;
  lastTierReached = 0;
  tier: BatchTier = "Mild Batch";
  level = 1;
  private announcedUnlockLevel = 1;

  objects: GameObject[] = [];
  blade: BladePoint[] = [];
  splatters: SplatterDecal[] = [];
  particles = new ParticlePool();
  embers: { x: number; y: number; vy: number; size: number; alpha: number }[] =
    [];

  spawnAccumulator = 0;
  spawnInterval: number = DIFFICULTY.l1.spawnIntervalMs;
  maxSimultaneous: number = DIFFICULTY.l1.maxSimultaneous;
  launchSpeed: number = DIFFICULTY.l1.launchSpeed;
  pointerDown = false;
  popupQueue: PopupEvent[] = [];
  private popupId = 0;

  /** Soft-bridge Prep Mode — fixed pantry queue, no LB / no level ramp. */
  mode: SlicerMode = "arcade";
  prepQueue: PrepSpawnItem[] = [];
  private prepSpawned = 0;
  private prepSliced = 0;

  /** Deterministic arcade spawn schedule (signed-in server seed or guest seed). */
  useSpawnSequence = false;
  spawnSeed: bigint | null = null;
  sessionId: string | null = null;
  spawnSequence: SpawnEvent[] = [];
  spawnCursor = 0;
  private frenzyWindowsSeen = new Set<number>();
  sliceLog: SliceLogEntry[] = [];

  reset(
    mode: SlicerMode = "arcade",
    prepItems: PrepSpawnItem[] = [],
    options?: { spawnSeed?: bigint; sessionId?: string },
  ): void {
    this.mode = mode;
    this.prepQueue = mode === "prep" ? [...prepItems] : [];
    this.prepSpawned = 0;
    this.prepSliced = 0;
    this.phase = "playing";
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.lives = MAX_LIVES;
    this.elapsedMs = 0;
    this.lastSliceMs = 0;
    this.swipeSliceCount = 0;
    this.frenzyActive = false;
    this.frenzyEndsAt = 0;
    this.nextFrenzyAt = FRENZY_INTERVAL_MS;
    this.slowMoUntil = 0;
    this.shakeUntil = 0;
    this.frenzyCineStart = 0;
    this.frenzyFocalX = 0;
    this.frenzyFocalY = 0;
    this.lastTierReached = 0;
    this.tier = "Mild Batch";
    this.level = 1;
    this.announcedUnlockLevel = 1;
    this.objects = [];
    this.blade = [];
    this.splatters = [];
    this.spawnAccumulator = 0;
    const p = DIFFICULTY.paramsForLevel(1);
    this.spawnInterval =
      mode === "prep" ? 1100 : p.spawnIntervalMs;
    this.maxSimultaneous = mode === "prep" ? 3 : p.maxSimultaneous;
    this.launchSpeed = p.launchSpeed;
    this.popupQueue = [];
    this.initEmbers();

    this.spawnSeed = options?.spawnSeed ?? null;
    this.sessionId = options?.sessionId ?? null;
    this.useSpawnSequence = mode === "arcade" && this.spawnSeed != null;
    this.spawnSequence = this.useSpawnSequence
      ? deriveSpawnSequence(this.spawnSeed!, DEFAULT_SPAWN_SEQUENCE_LEN)
      : [];
    this.spawnCursor = 0;
    this.frenzyWindowsSeen.clear();
    this.sliceLog = [];

    if (mode === "prep" && prepItems.length === 0) {
      this.pushPopup("Pantry empty — grow pods first!");
      this.phase = "over";
    }
  }

  initEmbers(): void {
    this.embers = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vy: 0.00003 + Math.random() * 0.00004,
      size: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.4,
    }));
  }

  resize(w: number, h: number, dpr: number): void {
    this.width = w;
    this.height = h;
    this.dpr = dpr;
  }

  pushPopup(text: string): void {
    this.popupQueue.push({ text, id: ++this.popupId });
  }

  consumePopup(): PopupEvent | null {
    return this.popupQueue.shift() ?? null;
  }

  applyLevelParams(): void {
    const p = DIFFICULTY.paramsForLevel(this.level);
    this.spawnInterval = p.spawnIntervalMs;
    this.maxSimultaneous = p.maxSimultaneous;
    this.launchSpeed = p.launchSpeed;
  }

  checkLevelUp(): void {
    const next = DIFFICULTY.levelFromScore(this.score);
    if (next <= this.level) return;
    this.level = next;
    this.applyLevelParams();
    this.pushPopup("LEVEL UP!");
    for (const u of DIFFICULTY.unlocks) {
      if (u.level > this.announcedUnlockLevel && u.level <= this.level) {
        this.pushPopup(u.popup);
      }
    }
    this.announcedUnlockLevel = this.level;
  }

  spawnObject(
    burst = false,
    kindOverride?: IngredientKind,
    spawnIndex?: number,
    spawnIsFrenzy?: boolean,
  ): void {
    const wholes = this.objects.filter((o) => o.whole).length;
    if (wholes >= this.maxSimultaneous && !burst) return;

    let kind: IngredientKind;
    let pantryId: string | undefined;

    if (this.mode === "prep") {
      if (this.prepSpawned >= this.prepQueue.length) return;
      const item = this.prepQueue[this.prepSpawned]!;
      this.prepSpawned += 1;
      kind = item.kind;
      pantryId = item.pantryId;
    } else if (kindOverride) {
      kind = kindOverride;
    } else {
      const pool = DIFFICULTY.poolForLevel(this.level);
      kind = pickIngredient(pool);
    }

    this.spawnObjectPhysics(kind, pantryId, spawnIndex, spawnIsFrenzy);
  }

  private spawnObjectPhysics(
    kind: IngredientKind,
    pantryId?: string,
    spawnIndex?: number,
    spawnIsFrenzy?: boolean,
  ): void {
    const r = hitRadiusFor(kind);
    const speed = this.launchSpeed;
    // L1: mostly bottom arcs; higher levels mix side launches
    const sideChance =
      this.mode === "prep"
        ? 0.15
        : Math.min(0.55, 0.12 + (this.level - 1) * 0.08);
    const useSide = Math.random() < sideChance;
    let x = this.width * (0.25 + Math.random() * 0.5);
    let y = this.height + r;
    let vx = (Math.random() - 0.5) * 0.22 * speed;
    let vy = -(0.42 + Math.random() * 0.14) * speed;

    if (useSide) {
      const fromLeft = Math.random() < 0.5;
      x = fromLeft ? -r : this.width + r;
      y = this.height * (0.55 + Math.random() * 0.3);
      vx = (fromLeft ? 1 : -1) * (0.28 + Math.random() * 0.14) * speed;
      vy = -(0.28 + Math.random() * 0.14) * speed;
    }

    this.objects.push({
      id: nextId++,
      kind,
      x,
      y,
      vx,
      vy,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.006 * speed,
      radius: r,
      whole: true,
      lifeMs: 8000,
      flameOrbit: Math.random() * Math.PI * 2,
      pantryId,
      spawnIndex,
      spawnIsFrenzy,
    });
  }

  private spawnFromScheduledEvent(ev: SpawnEvent): void {
    if (ev.isFrenzy && !this.frenzyWindowsSeen.has(ev.spawnTimeMs)) {
      this.frenzyWindowsSeen.add(ev.spawnTimeMs);
      this.triggerFrenzyVisuals();
    }
    const kind = kindNatToIngredient(ev.kind);
    this.spawnObject(true, kind, ev.index, ev.isFrenzy);
  }

  private processSpawnSequence(): void {
    while (this.spawnCursor < this.spawnSequence.length) {
      const ev = this.spawnSequence[this.spawnCursor]!;
      if (this.elapsedMs < ev.spawnTimeMs) break;
      this.spawnFromScheduledEvent(ev);
      this.spawnCursor += 1;
    }
  }

  triggerFrenzyVisuals(): void {
    this.frenzyActive = true;
    this.frenzyEndsAt = this.elapsedMs + FRENZY_DURATION_MS;
    this.frenzyCineStart = this.elapsedMs;

    const wholes = this.objects.filter((o) => o.whole);
    if (wholes.length > 0) {
      let sx = 0;
      let sy = 0;
      for (const o of wholes) {
        sx += o.x;
        sy += o.y;
      }
      this.frenzyFocalX = sx / wholes.length;
      this.frenzyFocalY = sy / wholes.length;
    } else {
      this.frenzyFocalX = this.width * 0.5;
      this.frenzyFocalY = this.height * 0.58;
    }

    if (this.frenzyCinematicTier === "full") {
      this.slowMoUntil = this.elapsedMs + 1200;
    } else {
      this.slowMoUntil = 0;
    }
    this.pushPopup("FRENZY!");
  }

  frenzyBurst(): void {
    const p = DIFFICULTY.paramsForLevel(this.level);
    const n = p.frenzyBaseCount + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) this.spawnObject(true);
    this.triggerFrenzyVisuals();
  }

  sliceAt(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dt: number,
    velocity: number,
  ): SliceResult | null {
    if (velocity < SWIPE_VELOCITY_MIN) return null;
    let hits = 0;
    let totalGain = 0;
    let rareHit = false;
    const now = this.elapsedMs;

    // Collect hits first; score in spawnIndex order (matches server sortSlices tie-break).
    const hitObjects: GameObject[] = [];
    for (const obj of this.objects) {
      if (!obj.whole) continue;
      if (!segmentCircleHit(x1, y1, x2, y2, obj.x, obj.y, obj.radius)) continue;
      hitObjects.push(obj);
    }
    hitObjects.sort(
      (a, b) => (a.spawnIndex ?? 0) - (b.spawnIndex ?? 0),
    );

    const sliced: GameObject[] = [];
    const slicedPantryIds: string[] = [];
    for (const obj of hitObjects) {
      hits += 1;
      if (obj.kind === "rare_chili") rareHit = true;

      if (now - this.lastSliceMs > COMBO_WINDOW_MS) this.combo = 0;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.lastSliceMs = now;

      const mult = comboMultiplier(this.combo);
      const frenzyMult = obj.spawnIsFrenzy ? 2 : 1;
      const kindNat =
        obj.kind === "lime"
          ? 0
          : obj.kind === "tomato"
            ? 1
            : obj.kind === "onion"
              ? 2
              : obj.kind === "garlic"
                ? 3
                : obj.kind === "mango"
                  ? 4
                  : obj.kind === "chili"
                    ? 5
                    : 6;
      const gain = shuBase(kindNat) * mult * frenzyMult;
      totalGain += gain;
      sliced.push(obj);
      if (
        this.useSpawnSequence &&
        obj.spawnIndex !== undefined &&
        this.sessionId
      ) {
        this.sliceLog.push({
          objectIndex: obj.spawnIndex,
          sliceTimeMs: Math.floor(now),
        });
      }
      if (obj.pantryId) {
        slicedPantryIds.push(obj.pantryId);
        this.prepSliced += 1;
      }
    }

    // Phase 2 — remove each original and spawn halves (no ghost whole in draw).
    for (const obj of sliced) {
      this.splitObject(obj);
      this.addSplatter(obj.x, obj.y, juiceColor(obj.kind));
      this.particles.burst(obj.x, obj.y, juiceColor(obj.kind), 14);
      if (obj.kind === "chili" || obj.kind === "rare_chili") {
        this.particles.burst(obj.x, obj.y, "#fb923c", 8, "flame");
        this.particles.burst(obj.x, obj.y, "#fef08a", 6, "spark");
      }
    }

    if (hits === 0) return null;

    this.score += totalGain;
    this.tier = scoreToTier(this.score);
    if (this.mode === "arcade") this.checkLevelUp();
    const tierIdx = tierIndex(this.tier);
    const surgeTier = Math.floor(this.score / 10_000);
    if (
      this.mode === "arcade" &&
      surgeTier > this.lastTierReached &&
      this.score >= 10_000
    ) {
      this.lastTierReached = surgeTier;
      this.pushPopup("SCOVILLE SURGE!");
    }

    const result: SliceResult = {
      scoreGain: totalGain,
      shake: rareHit,
      slicedPantryIds:
        slicedPantryIds.length > 0 ? slicedPantryIds : undefined,
    };
    const mult = comboMultiplier(this.combo);
    if (this.combo >= 2) this.pushPopup(`COMBO x${mult}!`);
    this.swipeSliceCount += hits;
    if (this.swipeSliceCount >= 3 && hits >= 1) {
      this.pushPopup(`MULTI x${this.swipeSliceCount}!`);
    }
    if (rareHit) this.pushPopup("HOT SLICE!");

    if (rareHit) {
      this.shakeUntil = now + 100;
      this.shakeMag = 3;
    }

    if (tierIdx >= 3) {
      result.legendary = true;
    }

    return result;
  }

  /** Replace a whole with left/right halves. Caller must score before this. */
  splitObject(obj: GameObject): void {
    const sp = 0.25;
    const a = obj.rot;
    const left: GameObject = {
      id: nextId++,
      kind: obj.kind,
      x: obj.x,
      y: obj.y,
      vx: obj.vx + Math.cos(a) * sp,
      vy: obj.vy + Math.sin(a) * sp - 0.05,
      rot: obj.rot,
      rotV: obj.rotV - 0.012,
      radius: obj.radius,
      whole: false,
      half: "left",
      lifeMs: 600,
      flameOrbit: 0,
    };
    const right: GameObject = {
      id: nextId++,
      kind: obj.kind,
      x: obj.x,
      y: obj.y,
      vx: obj.vx - Math.cos(a) * sp,
      vy: obj.vy - Math.sin(a) * sp - 0.05,
      rot: obj.rot + Math.PI,
      rotV: obj.rotV + 0.012,
      radius: obj.radius,
      whole: false,
      half: "right",
      lifeMs: 600,
      flameOrbit: 0,
    };
    const idx = this.objects.indexOf(obj);
    if (idx >= 0) this.objects.splice(idx, 1);
    this.objects.push(left, right);
  }

  addSplatter(x: number, y: number, color: string): void {
    if (this.splatters.length >= 12) this.splatters.shift();
    this.splatters.push({
      x,
      y,
      color,
      alpha: 0.35,
      scale: 0.8 + Math.random() * 0.5,
      rot: Math.random() * Math.PI,
    });
  }

  pointerStart(x: number, y: number): void {
    if (this.phase !== "playing") return;
    this.pointerDown = true;
    this.swipeSliceCount = 0;
    this.blade.push({ x, y, t: this.elapsedMs });
  }

  pointerMove(x: number, y: number, dt: number): SliceResult | null {
    if (!this.pointerDown || this.phase !== "playing") return null;
    const prev = this.blade[this.blade.length - 1];
    if (!prev) return null;
    const dist = Math.hypot(x - prev.x, y - prev.y);
    const vel = dist / Math.max(dt, 1);
    const res = this.sliceAt(prev.x, prev.y, x, y, dt, vel);
    this.blade.push({ x, y, t: this.elapsedMs });
    if (this.blade.length > 24) this.blade.shift();
    return res;
  }

  pointerEnd(): void {
    this.pointerDown = false;
    this.swipeSliceCount = 0;
  }

  togglePause(): void {
    if (this.phase === "playing") this.phase = "paused";
    else if (this.phase === "paused") this.phase = "playing";
  }

  update(rawDt: number): void {
    if (this.phase !== "playing") return;

    let dt = rawDt;
    // Slow-mo dilates the authoritative game clock uniformly (physics + elapsedMs +
    // sliceTimeMs). Spawn schedule uses the same clock — dilation is self-consistent.
    // Post-last-slice miss tail is bounded separately (MAX_END_TAIL_MS on server).
    if (this.frenzyCinematicTier === "full" && this.elapsedMs < this.slowMoUntil) {
      dt *= 0.55;
    }

    this.elapsedMs += dt;
    if (this.mode === "arcade") this.applyLevelParams();

    if (this.mode === "arcade") {
      if (this.useSpawnSequence) {
        this.processSpawnSequence();
      } else {
        if (!this.frenzyActive && this.elapsedMs >= this.nextFrenzyAt) {
          this.frenzyBurst();
        }
      }
      if (this.frenzyActive && this.elapsedMs >= this.frenzyEndsAt) {
        this.frenzyActive = false;
      }
    }

    if (this.mode === "prep" || !this.useSpawnSequence) {
      this.spawnAccumulator += dt;
      while (this.spawnAccumulator >= this.spawnInterval) {
        this.spawnAccumulator -= this.spawnInterval;
        this.spawnObject();
      }
    }

    this.blade = this.blade.filter((p) => this.elapsedMs - p.t < BLADE_FADE_MS);

    for (const e of this.embers) {
      e.y -= e.vy * dt;
      if (e.y < 0) {
        e.y = 1;
        e.x = Math.random();
      }
    }

    for (const s of this.splatters) s.alpha *= 0.9992;

    const toRemove: number[] = [];
    for (let i = 0; i < this.objects.length; i++) {
      const o = this.objects[i]!;
      o.vy += GRAVITY * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.rot += o.rotV * dt;
      o.lifeMs -= dt;
      o.flameOrbit += dt * 0.004;

      if (o.whole && o.y > this.height + o.radius * 1.5) {
        // Miss: lose a life. Prep Mode — pantry raw stays (never removed until slice).
        this.lives -= 1;
        this.combo = 0;
        toRemove.push(i);
        if (this.lives <= 0) this.phase = "over";
      } else if (!o.whole && (o.lifeMs <= 0 || o.y > this.height + 80)) {
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.objects.splice(toRemove[i]!, 1);
    }

    if (this.objects.length > MAX_OBJECTS) {
      this.objects.splice(0, this.objects.length - MAX_OBJECTS);
    }

    this.particles.update(dt);

    // Prep Mode: session ends when queue exhausted and no wholes remain.
    // Unslices raws were never removed from pantry — session-only game-over.
    if (
      this.mode === "prep" &&
      this.phase === "playing" &&
      this.prepSpawned >= this.prepQueue.length &&
      !this.objects.some((o) => o.whole)
    ) {
      this.phase = "over";
      this.pushPopup(
        `Prepped ${this.prepSliced}/${this.prepQueue.length} → Pantry`,
      );
    }
  }

  getFrenzyCinematic(): FrenzyCinematic {
    const focalX = this.frenzyFocalX || this.width * 0.5;
    const focalY = this.frenzyFocalY || this.height * 0.58;
    if (this.frenzyCinematicTier === "off") {
      return { scale: 1, vignette: 0, bloom: 0, shimmer: 0, focalX, focalY };
    }

    const age = this.elapsedMs - this.frenzyCineStart;
    let scale = 1;
    let vignette = 0;
    let bloom = 0;
    let shimmer = 0;

    if (this.frenzyCinematicTier === "lite") {
      if (this.frenzyCineStart > 0 && age >= 0 && age < FRENZY_DURATION_MS + 400) {
        if (age < 300) vignette = 0.22 * (age / 300);
        else if (age < FRENZY_DURATION_MS) vignette = 0.22;
        else {
          const t = (age - FRENZY_DURATION_MS) / 400;
          vignette = 0.22 * (1 - easeInOutCubic(Math.min(1, t)));
        }
      }
      return { scale: 1, vignette, bloom: 0, shimmer: 0, focalX, focalY };
    }

    if (this.frenzyCineStart > 0 && age >= 0 && age < 2600) {
      if (age < 380) {
        const t = age / 380;
        scale = 1 + 0.12 * easeOutCubic(t);
        vignette = 0.15 * t;
        bloom = 0.25 * t;
        shimmer = 0.3 * t;
      } else if (age < 1200) {
        scale = 1.12;
        vignette = 0.38;
        bloom = 0.45 + Math.sin(age * 0.012) * 0.08;
        shimmer = 0.5;
      } else if (age < 2000) {
        const t = (age - 1200) / 800;
        const e = easeInOutCubic(t);
        scale = 1.12 - 0.12 * e;
        vignette = 0.38 * (1 - e);
        bloom = 0.45 * (1 - e);
        shimmer = 0.5 * (1 - e);
      }
    }

    return { scale, vignette, bloom, shimmer, focalX, focalY };
  }

  /** Active render camera — inverse maps pointer coords to world hit-test space. */
  getCameraTransform(): {
    scale: number;
    focalX: number;
    focalY: number;
    shakeX: number;
    shakeY: number;
  } {
    const shake = this.getShakeOffset();
    const { scale, focalX, focalY } = this.getFrenzyCinematic();
    return {
      scale,
      focalX,
      focalY,
      shakeX: shake.x,
      shakeY: shake.y,
    };
  }

  /**
   * Inverse of draw() camera: translate(shake) → translate(cx,cy) → scale → translate(-focal).
   * screen = shake + center + scale * (world - focal)
   */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const { scale, focalX, focalY, shakeX, shakeY } = this.getCameraTransform();
    const cx = sx - shakeX;
    const cy = sy - shakeY;
    if (Math.abs(scale - 1) < 0.001) {
      return { x: cx, y: cy };
    }
    return {
      x: (cx - this.width / 2) / scale + focalX,
      y: (cy - this.height / 2) / scale + focalY,
    };
  }

  getShakeOffset(): { x: number; y: number } {
    if (this.elapsedMs >= this.shakeUntil) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shakeMag,
      y: (Math.random() - 0.5) * this.shakeMag,
    };
  }

  drawBackdrop(ctx: CanvasRenderingContext2D): void {
    const w = this.width;
    const h = this.height;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0a0000");
    bg.addColorStop(0.45, "#1a0505");
    bg.addColorStop(1, "#2d0a00");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.1, w * 0.5, h * 0.5, h * 0.85);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(120,20,10,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  drawEmbers(ctx: CanvasRenderingContext2D): void {
    const w = this.width;
    const h = this.height;
    for (const e of this.embers) {
      ctx.fillStyle = `rgba(251,146,60,${e.alpha})`;
      ctx.fillRect(e.x * w, e.y * h, e.size, e.size * 2);
    }
  }

  drawSplatters(ctx: CanvasRenderingContext2D): void {
    for (const s of this.splatters) {
      if (s.alpha < 0.05) continue;
      drawSplatter(ctx, s);
    }
  }

  /** @deprecated Split into drawBackdrop + drawEmbers + drawSplatters */
  drawBackground(ctx: CanvasRenderingContext2D): void {
    this.drawBackdrop(ctx);
    this.drawEmbers(ctx);
    this.drawSplatters(ctx);
  }

  drawObjects(ctx: CanvasRenderingContext2D): void {
    for (const o of this.objects) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rot);
      if (o.whole && o.kind === "rare_chili") {
        drawEmberRing(ctx, o.radius, 0.65 + Math.sin(o.flameOrbit) * 0.1);
      }
      if (o.whole && (o.kind === "chili" || o.kind === "rare_chili")) {
        const fo = o.flameOrbit;
        for (let i = 0; i < 3; i++) {
          const a = fo + (i * Math.PI * 2) / 3;
          const fx = Math.cos(a) * (o.radius + 6);
          const fy = Math.sin(a) * (o.radius + 6);
          ctx.fillStyle = o.kind === "rare_chili" ? "#f97316" : "#fb923c";
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      drawIngredient(ctx, o.kind, o.radius, o.half ?? "whole");
      ctx.restore();
    }
  }

  drawBlade(ctx: CanvasRenderingContext2D): void {
    for (let i = 1; i < this.blade.length; i++) {
      const a = this.blade[i - 1]!;
      const b = this.blade[i]!;
      const age = this.elapsedMs - b.t;
      const alpha = 1 - age / BLADE_FADE_MS;
      if (alpha <= 0) continue;
      drawBladeSegment(ctx, a.x, a.y, b.x, b.y, alpha);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    initFxSprites();
    const shake = this.getShakeOffset();
    const cine = this.getFrenzyCinematic();
    const canvas = ctx.canvas;

    // Clear in physical pixel space — never inside the camera transform.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Full-canvas backdrop (gradient + vignette + embers) in logical coords.
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackdrop(ctx);
    this.drawEmbers(ctx);
    ctx.restore();

    // World layer: camera transform for objects, splatters, blade, particles.
    ctx.save();
    ctx.translate(shake.x, shake.y);
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(cine.scale, cine.scale);
    ctx.translate(-cine.focalX, -cine.focalY);

    this.drawSplatters(ctx);
    this.drawObjects(ctx);
    this.drawBlade(ctx);
    if (this.frenzyActive) {
      drawHeatRing(
        ctx,
        cine.focalX,
        cine.focalY,
        Math.min(this.width, this.height) * 0.42,
        0.35,
      );
    }
    this.particles.draw(ctx);
    ctx.restore();

    if (cine.vignette > 0 || cine.bloom > 0 || cine.shimmer > 0) {
      drawFrenzyCinematicOverlay(ctx, this.width, this.height, cine);
    }
  }

  displayDataJson(): string {
    return JSON.stringify({
      bestCombo: this.bestCombo,
      tier: this.tier,
    });
  }

  /** Recompute score/combo from slice log — must match server validateRun. */
  syncAuthoritativeScore(): boolean {
    if (this.spawnSeed == null || this.sliceLog.length === 0) return false;
    const run = {
      durationMs: Math.floor(this.elapsedMs),
      livesLost: MAX_LIVES - this.lives,
      slices: [...this.sliceLog],
    };
    const r = validateRun(this.spawnSeed, run);
    if ("err" in r) return false;
    this.score = r.ok.score;
    this.bestCombo = r.ok.bestCombo;
    this.tier = r.ok.tier as BatchTier;
    return true;
  }

  /** Ranked run payload for submitSlicerRun (null when guest / no session). */
  buildSliceLogJson(): string | null {
    if (!this.sessionId || this.sliceLog.length === 0) return null;
    this.syncAuthoritativeScore();
    return buildSliceLogJson({
      durationMs: Math.floor(this.elapsedMs),
      livesLost: MAX_LIVES - this.lives,
      slices: this.sliceLog,
    });
  }

  isLegendary(): boolean {
    return tierIndex(this.tier) >= 3;
  }
}
