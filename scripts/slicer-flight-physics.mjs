#!/usr/bin/env node
/** Worst-case object flight time (game-ms) from engine physics constants. */
const GRAVITY = 0.00055;
const HEIGHT = 720;
const DT = 16;
const SLOW_MO = 0.55;
const SLOW_MO_MS = 1200;

function flightMs(opts) {
  const r = opts.radius ?? 30;
  const speed = opts.speed ?? 1;
  let x = opts.x;
  let y = opts.y;
  let vx = opts.vx * speed;
  let vy = opts.vy * speed;
  let elapsed = 0;
  let slowMoUntil = 0;
  const missY = HEIGHT + r * 1.5;
  while (elapsed < 60_000) {
    let dt = DT;
    if (opts.slowMo && elapsed < slowMoUntil) dt *= SLOW_MO;
    if (opts.slowMo && elapsed === 0) slowMoUntil = SLOW_MO_MS;
    vy += GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;
    elapsed += dt;
    if (y > missY) return Math.floor(elapsed);
  }
  return null;
}

const cases = [
  { name: "L1 bottom arc (min vy)", x: 360, y: HEIGHT + 22, vx: 0, vy: -0.42, speed: 1 },
  { name: "L1 bottom arc (max vy)", x: 360, y: HEIGHT + 22, vx: 0, vy: -0.56, speed: 1 },
  { name: "L1 side arc shallow", x: -22, y: HEIGHT * 0.7, vx: 0.42, vy: -0.28, speed: 1 },
  { name: "L1 side arc steep", x: -22, y: HEIGHT * 0.55, vx: 0.42, vy: -0.42, speed: 1 },
  { name: "L6 side arc (speed 1.08^5)", x: -22, y: HEIGHT * 0.55, vx: 0.42, vy: -0.28, speed: 1.08 ** 5 },
  { name: "L1 bottom + slow-mo at spawn", x: 360, y: HEIGHT + 22, vx: 0, vy: -0.42, speed: 1, slowMo: true },
];

let worst = 0;
let worstName = "";
for (const c of cases) {
  const t = flightMs(c);
  console.log(`${c.name}: ${t}ms`);
  if (t > worst) {
    worst = t;
    worstName = c.name;
  }
}
console.log(`\nWorst case: ${worst}ms (${worstName})`);
console.log(`MAX_FLIGHT_MS=10000 margin: ${10000 - worst}ms`);
