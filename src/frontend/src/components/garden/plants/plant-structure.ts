/** Deterministic pseudo-random from integer seed */
export function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export type BranchData = {
  points: [number, number, number][];
  tipPosition: [number, number, number];
  leafCount: number;
  hasFruit: boolean;
  fruitPosition: [number, number, number];
  fruitRotation: [number, number, number];
};

export type PlantStructure = {
  height: number;
  stemPoints: [number, number, number][];
  branches: BranchData[];
};

export type GenerateOpts = {
  seed: number;
  height: number;
  branchCount: number;
  leafDensity: number;
  pepperCount: number;
  droopFactor: number;
  profile?: "upright" | "bushy" | "superhot" | "sweet";
};

export function generatePlantStructure(opts: GenerateOpts): PlantStructure {
  const rand = seededRandom(opts.seed);
  const { height, branchCount, leafDensity, pepperCount, droopFactor, profile } = opts;

  const stemPoints: [number, number, number][] = [];
  const segments = 6;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const curve =
      profile === "upright"
        ? Math.sin(t * Math.PI) * 0.02
        : profile === "bushy"
          ? Math.sin(t * Math.PI * 2) * 0.04
          : Math.sin(t * Math.PI * 1.5) * 0.06;
    stemPoints.push([curve, t * height, curve * 0.5]);
  }

  const branches: BranchData[] = [];
  let fruitsPlaced = 0;

  for (let i = 0; i < branchCount; i += 1) {
    const attachT = 0.25 + rand() * 0.65;
    const attachY = attachT * height;
    const angle = (i / branchCount) * Math.PI * 2 + rand() * 0.4;
    const length =
      profile === "bushy"
        ? 0.12 + rand() * 0.14
        : profile === "superhot"
          ? 0.1 + rand() * 0.12
          : 0.08 + rand() * 0.16;
    const droop = droopFactor * (profile === "superhot" ? 1.4 : 1);
    const spread = profile === "bushy" ? 1.2 : profile === "upright" ? 0.7 : 1;

    const bx = Math.cos(angle) * length * spread;
    const bz = Math.sin(angle) * length * spread;
    const by = attachY + length * 0.3 - droop * length;

    const points: [number, number, number][] = [
      [0, attachY, 0],
      [bx * 0.4, attachY + length * 0.15, bz * 0.4],
      [bx, by, bz],
    ];

    const hasFruit = fruitsPlaced < pepperCount && rand() > 0.35;
    if (hasFruit) fruitsPlaced += 1;

    branches.push({
      points,
      tipPosition: [bx, by, bz],
      leafCount: Math.max(2, Math.floor(3 + leafDensity * 5 + rand() * 3)),
      hasFruit,
      fruitPosition: [bx * 0.85, by - 0.02, bz * 0.85],
      fruitRotation: [0.3 + rand() * 0.4, angle, rand() * 0.3 - 0.15],
    });
  }

  return { height, stemPoints, branches };
}

export function pepperColor(scoville: number, maturity: number): string {
  if (maturity < 0.6) return "#228B22";
  if (scoville > 500_000) return "#8B0000";
  if (scoville > 100_000) return "#DC143C";
  if (scoville > 30_000) return "#FF4500";
  if (scoville > 5_000) return "#FF8C00";
  return "#FFD700";
}

export function leafColor(scoville: number): string {
  return scoville > 100_000 ? "#1a5c1a" : "#2d7d2d";
}
