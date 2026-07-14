import type { IngredientId } from "./constants";
import { blendSauceColor, type BatchMixEntry } from "./scoring";

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
}

interface Steam {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  drift: number;
}

interface Flame {
  x: number;
  y: number;
  vy: number;
  life: number;
  size: number;
}

interface FlyingIngredient {
  id: IngredientId;
  x: number;
  y: number;
  tx: number;
  ty: number;
  t: number;
  duration: number;
}

export class PotEngine {
  width = 0;
  height = 0;
  sauceColor: [number, number, number] = [0.15, 0.05, 0.06];
  heatLevel = 0;
  scorched = false;
  shimmerPhase = 0;

  bubbles: Bubble[] = [];
  steam: Steam[] = [];
  flames: Flame[] = [];
  flying: FlyingIngredient[] = [];
  splashUntil = 0;

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    if (this.bubbles.length === 0) this.initBubbles();
  }

  initBubbles(): void {
    this.bubbles = Array.from({ length: 14 }, () => ({
      x: 0.25 + Math.random() * 0.5,
      y: 0.55 + Math.random() * 0.2,
      r: 3 + Math.random() * 5,
      vy: 0.00015 + Math.random() * 0.0002,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  setMix(mix: BatchMixEntry[], heatShu: number, scorched: boolean): void {
    this.sauceColor = blendSauceColor(mix);
    this.heatLevel = Math.min(1, heatShu / 1_500_000);
    this.scorched = scorched;
  }

  launchIngredient(
    id: IngredientId,
    fromX: number,
    fromY: number,
  ): void {
    const cx = this.width * 0.5;
    const cy = this.height * 0.52;
    this.flying.push({
      id,
      x: fromX,
      y: fromY,
      tx: cx + (Math.random() - 0.5) * 40,
      ty: cy,
      t: 0,
      duration: 380,
    });
    this.splashUntil = performance.now() + 200;
    for (let i = 0; i < 6; i++) {
      this.steam.push({
        x: cx + (Math.random() - 0.5) * 50,
        y: cy - 10,
        vy: 0.12 + Math.random() * 0.08,
        life: 500,
        maxLife: 500,
        drift: (Math.random() - 0.5) * 0.04,
      });
    }
    if (this.heatLevel > 0.25) {
      for (let i = 0; i < 4; i++) {
        this.flames.push({
          x: cx + (Math.random() - 0.5) * 60,
          y: cy + 20,
          vy: 0.15 + Math.random() * 0.1,
          life: 400,
          size: 4 + Math.random() * 4,
        });
      }
    }
  }

  update(dt: number): void {
    this.shimmerPhase += dt * 0.004;
    const w = this.width;
    const h = this.height;

    for (const b of this.bubbles) {
      b.y -= b.vy * dt;
      b.phase += dt * 0.005;
      if (b.y < 0.48) {
        b.y = 0.62 + Math.random() * 0.08;
        b.x = 0.28 + Math.random() * 0.44;
      }
    }

    this.steam = this.steam.filter((s) => {
      s.life -= dt;
      s.y -= s.vy * dt * 0.06 * h;
      s.x += s.drift * dt * 0.04 * w;
      return s.life > 0;
    });

    this.flames = this.flames.filter((f) => {
      f.life -= dt;
      f.y -= f.vy * dt * 0.05 * h;
      return f.life > 0;
    });

    this.flying = this.flying.filter((f) => {
      f.t += dt;
      return f.t < f.duration;
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const w = this.width;
    const h = this.height;
    const cx = w * 0.5;
    const potTop = h * 0.38;
    const potBot = h * 0.78;
    const potW = w * 0.62;

    ctx.clearRect(0, 0, w, h);

    // Pot shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, potBot + 8, potW * 0.42, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pot body
    const bodyGrad = ctx.createLinearGradient(cx - potW / 2, potTop, cx + potW / 2, potBot);
    bodyGrad.addColorStop(0, "#2a2a2a");
    bodyGrad.addColorStop(0.4, "#1a1a1a");
    bodyGrad.addColorStop(1, "#0d0d0d");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(cx - potW * 0.38, potTop + 12);
    ctx.lineTo(cx - potW * 0.45, potBot);
    ctx.quadraticCurveTo(cx, potBot + 18, cx + potW * 0.45, potBot);
    ctx.lineTo(cx + potW * 0.38, potTop + 12);
    ctx.closePath();
    ctx.fill();

    // Rim
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, potTop + 10, potW * 0.4, 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Sauce surface
    const [sr, sg, sb] = this.sauceColor;
    const sauceY = potTop + 22;
    const sauceGrad = ctx.createRadialGradient(cx, sauceY, 10, cx, sauceY, potW * 0.38);
    sauceGrad.addColorStop(0, `rgb(${Math.floor(sr * 255 + 40)},${Math.floor(sg * 255 + 20)},${Math.floor(sb * 255 + 10)})`);
    sauceGrad.addColorStop(1, `rgb(${Math.floor(sr * 200)},${Math.floor(sg * 180)},${Math.floor(sb * 160)})`);
    ctx.fillStyle = sauceGrad;
    ctx.beginPath();
    ctx.ellipse(cx, sauceY, potW * 0.36, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bubbles on sauce
    for (const b of this.bubbles) {
      const bx = b.x * w;
      const by = sauceY + (b.y - 0.55) * h * 0.15;
      const pulse = 1 + Math.sin(b.phase) * 0.15;
      ctx.fillStyle = `rgba(255,255,255,${0.08 + this.heatLevel * 0.12})`;
      ctx.beginPath();
      ctx.arc(bx, by, b.r * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heat shimmer ring
    if (this.heatLevel > 0.2) {
      const alpha = 0.15 + this.heatLevel * 0.25;
      ctx.strokeStyle = `rgba(251,146,60,${alpha + Math.sin(this.shimmerPhase) * 0.08})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, sauceY, potW * 0.38 + Math.sin(this.shimmerPhase * 2) * 3, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Scorched smoke
    if (this.scorched) {
      ctx.fillStyle = "rgba(60,60,60,0.25)";
      for (let i = 0; i < 5; i++) {
        const sx = cx + Math.sin(this.shimmerPhase + i) * 30;
        const sy = sauceY - 30 - i * 12;
        ctx.beginPath();
        ctx.arc(sx, sy, 12 + i * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Steam
    for (const s of this.steam) {
      const a = s.life / s.maxLife;
      ctx.fillStyle = `rgba(220,220,220,${a * 0.35})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6 + (1 - a) * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flames
    for (const f of this.flames) {
      const a = f.life / 400;
      ctx.fillStyle = `rgba(251,146,60,${a * 0.8})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * a, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flying ingredients
    for (const f of this.flying) {
      const p = Math.min(1, f.t / f.duration);
      const ease = 1 - (1 - p) ** 3;
      const x = f.x + (f.tx - f.x) * ease;
      const y = f.y + (f.ty - f.y) * ease - Math.sin(p * Math.PI) * 40;
      ctx.font = `${22}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(
        { lime: "🍋‍🟩", tomato: "🍅", onion: "🧅", garlic: "🧄", mango: "🥭", chili: "🌶️", scotch_bonnet: "🌶️", seven_pot_primo: "🌶️", carolina_reaper: "🌶️" }[f.id],
        x,
        y,
      );
    }

    // Splash ring
    if (performance.now() < this.splashUntil) {
      const t = 1 - (this.splashUntil - performance.now()) / 200;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, sauceY, 20 + t * 40, 8 + t * 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Handles
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx - potW * 0.48, potTop + h * 0.18, 16, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + potW * 0.48, potTop + h * 0.18, 16, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
  }
}
