import { MAX_PARTICLES } from "./constants";

export type ParticleKind = "spark" | "juice" | "flame" | "ember";

export interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rot: number;
}

export class ParticlePool {
  readonly pool: Particle[];
  live = 0;

  constructor(capacity = MAX_PARTICLES) {
    this.pool = Array.from({ length: capacity }, () => ({
      active: false,
      kind: "spark" as ParticleKind,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: "#fff",
      rot: 0,
    }));
  }

  emit(p: Omit<Particle, "active">): void {
    if (this.live >= this.pool.length) return;
    const slot = this.pool.find((x) => !x.active);
    if (!slot) return;
    slot.active = true;
    slot.kind = p.kind;
    slot.x = p.x;
    slot.y = p.y;
    slot.vx = p.vx;
    slot.vy = p.vy;
    slot.life = p.life;
    slot.maxLife = p.maxLife;
    slot.size = p.size;
    slot.color = p.color;
    slot.rot = p.rot;
    this.live += 1;
  }

  burst(
    x: number,
    y: number,
    color: string,
    count: number,
    kind: ParticleKind = "juice",
  ): void {
    const n = Math.min(count, this.pool.length - this.live);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.15 + Math.random() * 0.35;
      this.emit({
        kind,
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.1,
        life: 400 + Math.random() * 500,
        maxLife: 900,
        size: 2 + Math.random() * 4,
        color,
        rot: Math.random() * Math.PI,
      });
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.live = Math.max(0, this.live - 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "juice" || p.kind === "spark") p.vy += 0.00025 * dt;
      if (p.kind === "ember") p.vy -= 0.00008 * dt;
      if (p.kind === "flame") {
        p.vy -= 0.00012 * dt;
        p.vx *= 0.998;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.kind === "spark" || p.kind === "flame") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * t, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "ember") {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 0.5, -p.size, p.size, p.size * 2);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
