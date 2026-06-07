import { Float, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Component,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";

export type PlantCategory = "pepper" | "tree" | "herb" | "shrub";

type Vec3 = [number, number, number];

const ASSET_BASE = "https://gawk3-2qaaa-aaaao-ba4sa-cai.icp0.io/plants";

export const FRUIT_HEX: Record<string, string> = {
  red: "#d62828",
  orange: "#e8590c",
  yellow: "#f2c037",
  green: "#5fa83a",
  chocolate: "#5a3825",
  purple: "#7b3f9e",
  white: "#f0ead6",
  peach: "#ffb07c",
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const LEAF_CLUSTER_COUNT = 5;

/** Shared lanceolate leaf — one geometry for all instances. */
const LEAF_GEOMETRY = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.5, 0.15, 0.5, 0.6, 0, 1);
  shape.bezierCurveTo(-0.5, 0.6, -0.5, 0.15, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 8);
  geo.translate(0, -0.5, 0);
  return geo;
})();

/** Shared fruit base shapes — scaled per fruit mesh. */
const FRUIT_BASE = {
  gnarled: new THREE.IcosahedronGeometry(1, 0),
  lantern: new THREE.SphereGeometry(1, 8, 6),
  slender: new THREE.CapsuleGeometry(0.35, 1, 4, 8),
} as const;

type FruitShape = keyof typeof FRUIT_BASE;

/** Deterministic Lehmer/Park-Miller PRNG seeded per plant. */
function makeRng(seed: number) {
  let s = Math.floor(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) % 1000000007;
  }
  return h;
}

function fruitColorToHex(name?: string): string {
  if (!name) return FRUIT_HEX.red;
  const key = name.toLowerCase();
  return FRUIT_HEX[key] ?? FRUIT_HEX.red;
}

function varyLeafColor(baseHex: string, heightT: number, rng: number): string {
  const base = new THREE.Color(baseHex);
  const target =
    heightT > 0.55
      ? base.clone().lerp(new THREE.Color("#e8f5e9"), 0.1 + heightT * 0.06)
      : base.clone().lerp(new THREE.Color("#1b3d1b"), 0.06 + rng * 0.06);
  return `#${target.getHexString()}`;
}

function fruitShapeFromSubcategory(subcategory?: string): FruitShape {
  if (subcategory === "superhot") return "gnarled";
  if (subcategory === "mild" || subcategory === "sweet") return "slender";
  return "lantern";
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function tubeFromPoints(
  points: Vec3[],
  radius: number,
  segments = 6,
): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
  );
  return new THREE.TubeGeometry(curve, 8, radius, segments, false);
}

type LeafData = {
  pos: Vec3;
  rot: Vec3;
  size: number;
  color: string;
  phase: number;
  cluster: number;
};

type BranchData = {
  geometry: THREE.TubeGeometry;
  attachY: number;
};

type FruitData = {
  pos: Vec3;
  rot: Vec3;
  scale: Vec3;
  shape: FruitShape;
  peduncleLen: number;
};

type FlowerData = {
  pos: Vec3;
  angle: number;
};

type PlantModel = {
  height: number;
  stemColor: string;
  stemGeometry: THREE.TubeGeometry;
  soilRadius: number;
  branches: BranchData[];
  leaves: LeafData[];
  leafClusters: LeafData[][];
  canopy: { pos: Vec3; radius: number }[];
  fruits: FruitData[];
  flowers: FlowerData[];
  isTree: boolean;
  fruitHex: string;
};

// ---------------------------------------------------------------------------
// Procedural fallback — variety-aware parametric plant.
// ---------------------------------------------------------------------------

export type ProceduralPlantProps = {
  category: PlantCategory;
  scale?: number;
  growthStage?: number;
  selected?: boolean;
  seed: number;
  ghost?: boolean;
  fruitColor?: string;
  plantColor?: string;
  scovilleMax?: number;
  subcategory?: string;
};

function FlutterLeafCluster({
  leaves,
  ghost,
  phase,
}: {
  leaves: LeafData[];
  ghost: boolean;
  phase: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const leafOpacity = ghost ? 0.4 : 1;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = Math.sin(t * 2.5 + phase) * 0.08;
    ref.current.rotation.x = Math.sin(t * 2.0 + phase * 1.3) * 0.04;
  });

  return (
    <group ref={ref}>
      {leaves.map((l, i) => (
        <mesh
          key={`leaf-${i}`}
          position={l.pos}
          rotation={l.rot}
          scale={[l.size, l.size, l.size]}
          geometry={LEAF_GEOMETRY}
          castShadow
        >
          <meshStandardMaterial
            color={l.color}
            roughness={0.55}
            emissive={l.color}
            emissiveIntensity={0.04}
            side={THREE.DoubleSide}
            transparent={ghost}
            opacity={leafOpacity}
            depthWrite={!ghost}
          />
        </mesh>
      ))}
    </group>
  );
}

function ProceduralPlant({
  category,
  scale = 1,
  growthStage = 1,
  selected = false,
  seed,
  ghost = false,
  fruitColor,
  plantColor,
  scovilleMax = 0,
  subcategory,
}: ProceduralPlantProps) {
  const groupRef = useRef<THREE.Group>(null);
  const swayPhase = useMemo(() => ((seed % 100) / 100) * Math.PI * 2, [seed]);

  const model = useMemo((): PlantModel => {
    const r = makeRng(seed || 1);
    const isTree = category === "tree";
    const isHerb = category === "herb";
    const isShrub = category === "shrub";
    const baseHeight = isTree ? 1.9 : isHerb ? 0.42 : isShrub ? 0.72 : 0.62;
    const height = baseHeight * Math.max(0.3, growthStage);
    const gs = clamp01(growthStage);

    const stemColor = isTree ? "#6b4a2b" : "#4a3b28";
    const leafColor =
      plantColor && !isTree
        ? new THREE.Color(plantColor).lerp(new THREE.Color("#2f7d32"), 0.55).getStyle()
        : isTree
          ? "#2e6b2e"
          : isHerb
            ? "#5cba49"
            : isShrub
              ? "#357a32"
              : "#2f7d32";

    const fruitHex = fruitColorToHex(fruitColor);

    // Curved main stem with gentle lean.
    const stemSegs = 7;
    const stemPts: Vec3[] = [];
    for (let i = 0; i <= stemSegs; i += 1) {
      const t = i / stemSegs;
      const lean = Math.sin(t * Math.PI) * 0.025 * scale * (1 + r() * 0.2);
      stemPts.push([lean, t * height, lean * 0.45]);
    }
    const stemGeometry = tubeFromPoints(
      stemPts,
      (0.014 + 0.008 * gs) * scale,
      6,
    );

    // Drooping curved branches (3–5 by growth stage).
    const branchCount = Math.max(2, Math.min(5, Math.round(2 + gs * 3)));
    const branches: BranchData[] = [];
    for (let i = 0; i < branchCount; i += 1) {
      const attachT = 0.35 + (i / branchCount) * 0.45 + r() * 0.08;
      const attachY = attachT * height;
      const angle = (i / branchCount) * Math.PI * 2 + r() * 0.5;
      const length = height * (0.22 + r() * 0.14) * scale;
      const spread = length * (0.85 + r() * 0.2);
      const droop = length * (0.35 + r() * 0.2);
      const bx = Math.cos(angle) * spread;
      const bz = Math.sin(angle) * spread;
      const pts: Vec3[] = [
        [0, attachY, 0],
        [bx * 0.25, attachY + length * 0.08, bz * 0.25],
        [bx * 0.65, attachY - droop * 0.35, bz * 0.65],
        [bx, attachY - droop, bz],
      ];
      branches.push({
        geometry: tubeFromPoints(pts, 0.006 * scale, 5),
        attachY,
      });
    }

    // Golden-angle phyllotaxis leaves.
    const maxLeaves = 18;
    const leafCount = Math.max(
      gs < 0.35 ? 2 : 3,
      Math.round(maxLeaves * Math.max(0.25, gs)),
    );
    const leaves: LeafData[] = [];
    for (let i = 0; i < leafCount; i += 1) {
      const t = i / Math.max(1, leafCount - 1);
      const angle = i * GOLDEN_ANGLE + r() * 0.15;
      const heightFrac = 0.25 + t * 0.7;
      const radius =
        (isTree ? 0.05 : 0.11) * scale * (0.65 + 0.55 * t) * (0.85 + r() * 0.2);
      const droop = 0.35 + (1 - t) * 0.55;
      const fold = (i % 2 === 0 ? 1 : -1) * 0.18;
      leaves.push({
        pos: [
          Math.cos(angle) * radius,
          height * heightFrac,
          Math.sin(angle) * radius,
        ],
        rot: [droop + r() * 0.12, angle + fold, fold * 0.4 + r() * 0.1],
        size: (0.08 + r() * 0.05 + t * 0.03) * scale,
        color: varyLeafColor(leafColor, t, r()),
        phase: r() * Math.PI * 2,
        cluster: Math.min(
          LEAF_CLUSTER_COUNT - 1,
          Math.floor(t * LEAF_CLUSTER_COUNT),
        ),
      });
    }

    const leafClusters: LeafData[][] = Array.from(
      { length: LEAF_CLUSTER_COUNT },
      () => [],
    );
    for (const leaf of leaves) {
      leafClusters[leaf.cluster].push(leaf);
    }

    // Tree canopy layers.
    const canopy: { pos: Vec3; radius: number }[] = [];
    if (isTree) {
      const top = height * 0.92;
      for (let i = 0; i < 4; i += 1) {
        canopy.push({
          pos: [
            (r() - 0.5) * 0.35 * scale,
            top - i * 0.18 * scale,
            (r() - 0.5) * 0.35 * scale,
          ],
          radius: (0.45 - i * 0.05) * scale * (0.6 + gs * 0.4),
        });
      }
    }

    const fruits: FruitData[] = [];
    const flowers: FlowerData[] = [];
    const fShape = fruitShapeFromSubcategory(subcategory);

    if (category === "pepper") {
      if (gs > 0.45 && gs < 0.7) {
        const bloomCount = Math.max(2, Math.round(3 + gs * 4));
        for (let i = 0; i < bloomCount; i += 1) {
          const angle = i * GOLDEN_ANGLE + r() * 0.4;
          const radius = 0.09 * scale * (0.5 + r() * 0.5);
          flowers.push({
            pos: [
              Math.cos(angle) * radius,
              height * (0.45 + r() * 0.35),
              Math.sin(angle) * radius,
            ],
            angle,
          });
        }
      } else if (gs >= 0.7) {
        const countBase = 4 + (12 - 4) * clamp01((scovilleMax || 50000) / 2_000_000);
        const fruitCount = Math.max(1, Math.round(countBase * gs));
        for (let i = 0; i < fruitCount; i += 1) {
          const angle = i * GOLDEN_ANGLE + r() * 0.5;
          const radius = 0.1 * scale * (0.45 + r() * 0.55);
          const fy = height * (0.38 + r() * 0.42);
          const gnarl = fShape === "gnarled" ? 0.85 + r() * 0.35 : 1;
          fruits.push({
            pos: [
              Math.cos(angle) * radius,
              fy,
              Math.sin(angle) * radius,
            ],
            rot: [Math.PI * 0.55 + r() * 0.25, angle, r() * 0.35],
            scale: [
              0.014 * scale * gnarl * (0.9 + r() * 0.2),
              fShape === "slender" ? 0.028 * scale : 0.018 * scale * gnarl,
              0.014 * scale * gnarl * (0.85 + r() * 0.25),
            ],
            shape: fShape,
            peduncleLen: 0.012 * scale,
          });
        }
      }
    }

    return {
      height,
      stemColor,
      stemGeometry,
      soilRadius: (0.08 + gs * 0.05 + r() * 0.02) * scale,
      branches,
      leaves,
      leafClusters,
      canopy,
      fruits,
      flowers,
      isTree,
      fruitHex,
    };
  }, [
    category,
    scale,
    growthStage,
    seed,
    fruitColor,
    plantColor,
    scovilleMax,
    subcategory,
  ]);

  // Dispose tube geometries when the model is rebuilt.
  useEffect(() => {
    return () => {
      model.stemGeometry.dispose();
      for (const b of model.branches) b.geometry.dispose();
    };
  }, [model]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 0.8 + swayPhase) * 0.018;
  });

  const leafOpacity = ghost ? 0.4 : 1;
  const matProps = {
    transparent: ghost,
    opacity: leafOpacity,
    depthWrite: !ghost,
  } as const;

  return (
    <group ref={groupRef}>
      {/* Irregular soil mound */}
      <mesh
        position={[0, 0.008, 0]}
        scale={[1.08, 0.85 + growthStage * 0.15, 1.05]}
        receiveShadow
      >
        <sphereGeometry
          args={[model.soilRadius, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial color="#3d2817" roughness={1} {...matProps} />
      </mesh>

      {/* Curved main stem */}
      <mesh geometry={model.stemGeometry} castShadow>
        <meshStandardMaterial color={model.stemColor} roughness={0.85} {...matProps} />
      </mesh>

      {/* Drooping branch tubes */}
      {model.branches.map((b, i) => (
        <mesh key={`branch-${i}`} geometry={b.geometry} castShadow>
          <meshStandardMaterial color={model.stemColor} roughness={0.85} {...matProps} />
        </mesh>
      ))}

      {/* Tree canopy or phyllotaxis leaf clusters with flutter */}
      {model.isTree
        ? model.canopy.map((c, i) => (
            <mesh key={`canopy-${i}`} position={c.pos} castShadow>
              <sphereGeometry args={[c.radius, 10, 8]} />
              <meshStandardMaterial
                color={model.leafClusters[0]?.[0]?.color ?? "#2e6b2e"}
                roughness={0.75}
                emissive="#2e6b2e"
                emissiveIntensity={0.04}
                {...matProps}
              />
            </mesh>
          ))
        : model.leafClusters.map(
            (cluster, i) =>
              cluster.length > 0 && (
                <FlutterLeafCluster
                  key={`cluster-${i}`}
                  leaves={cluster}
                  ghost={ghost}
                  phase={cluster[0]?.phase ?? i}
                />
              ),
          )}

      {/* Flowering stage */}
      {model.flowers.map((f, i) => (
        <group key={`flower-${i}`} position={f.pos}>
          {Array.from({ length: 5 }, (_, p) => {
            const a = f.angle + (p / 5) * Math.PI * 2;
            return (
              <mesh
                key={p}
                position={[Math.cos(a) * 0.014 * scale, 0, Math.sin(a) * 0.014 * scale]}
                scale={[1, 0.35, 1]}
                castShadow
              >
                <sphereGeometry args={[0.008 * scale, 6, 4]} />
                <meshStandardMaterial
                  color="#fafafa"
                  emissive="#fff8e7"
                  emissiveIntensity={0.15}
                  roughness={0.4}
                  {...matProps}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Variety-driven fruit with peduncle */}
      {model.fruits.map((f, i) => (
        <group key={`fruit-${i}`} position={f.pos} rotation={f.rot}>
          <mesh position={[0, f.peduncleLen * 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.002 * scale, 0.003 * scale, f.peduncleLen, 4]} />
            <meshStandardMaterial color="#3d5c2a" roughness={0.9} {...matProps} />
          </mesh>
          <mesh
            position={[0, f.peduncleLen, 0]}
            scale={f.scale}
            geometry={FRUIT_BASE[f.shape]}
            castShadow
          >
            <meshStandardMaterial
              color={model.fruitHex}
              roughness={0.3}
              metalness={0.05}
              {...matProps}
            />
          </mesh>
        </group>
      ))}

      {/* Selection ring */}
      {selected && !ghost && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.24 * scale, 0.3 * scale, 40]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// GLTF loader with a real error boundary (hooks can't be guarded by try/catch).
// ---------------------------------------------------------------------------

class GltfErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    // Swallow — the asset 404s in Phase 1; fallback renders instead.
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function GltfInner({ url, scale }: { url: string; scale: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.02}>
      <primitive object={cloned} scale={scale} />
    </Float>
  );
}

export type GltfPlantModelProps = {
  category: PlantCategory;
  position: Vec3;
  scale?: number;
  growthStage?: number;
  selected?: boolean;
  varietyName?: string;
  fruitColor?: string;
  plantColor?: string;
  scovilleMax?: number;
  subcategory?: string;
  onClick?: () => void;
};

export function GltfPlantModel({
  category,
  position,
  scale = 1,
  growthStage = 1,
  selected = false,
  varietyName,
  fruitColor,
  plantColor,
  scovilleMax,
  subcategory,
  onClick,
}: GltfPlantModelProps) {
  const url = `${ASSET_BASE}/${category}.glb`;
  const seed = useMemo(
    () =>
      hashString(varietyName ?? category) +
      Math.round(position[0] * 7.13 + position[2] * 13.7),
    [varietyName, category, position],
  );

  const fallback = (
    <ProceduralPlant
      category={category}
      scale={scale}
      growthStage={growthStage}
      selected={selected}
      seed={seed}
      fruitColor={fruitColor}
      plantColor={plantColor}
      scovilleMax={scovilleMax}
      subcategory={subcategory}
    />
  );

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <GltfErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <GltfInner url={url} scale={scale} />
        </Suspense>
      </GltfErrorBoundary>
    </group>
  );
}

/** Exported so the build-mode reticle can render a translucent placement ghost. */
export function ProceduralPlantGhost(props: ProceduralPlantProps) {
  return <ProceduralPlant {...props} ghost />;
}
