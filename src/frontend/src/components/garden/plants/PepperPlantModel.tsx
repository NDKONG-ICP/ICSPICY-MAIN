import type { PepperProfile } from "@/lib/garden-plant-catalog";
import { memo, useMemo } from "react";
import * as THREE from "three";
import {
  generatePlantStructure,
  leafColor,
  pepperColor,
} from "./plant-structure";

type Vec3 = [number, number, number];

const StemMesh = memo(function StemMesh({
  points,
  radius,
  color,
}: {
  points: Vec3[];
  radius: number;
  color: string;
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    return new THREE.TubeGeometry(curve, 8, radius, 6, false);
  }, [points, radius]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
});

const LeafCluster = memo(function LeafCluster({
  position,
  count,
  size,
  color,
  seed,
}: {
  position: Vec3;
  count: number;
  size: number;
  color: string;
  seed: number;
}) {
  const leaves = useMemo(() => {
    const out: { pos: Vec3; rot: Vec3; s: number }[] = [];
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + seed * 0.1;
      out.push({
        pos: [
          Math.cos(a) * size * 0.8,
          Math.sin(a * 0.5) * size * 0.3,
          Math.sin(a) * size * 0.8,
        ],
        rot: [0.4 + i * 0.2, a, 0.2],
        s: size * (0.8 + (i % 3) * 0.1),
      });
    }
    return out;
  }, [count, size, seed]);

  return (
    <group position={position}>
      {leaves.map((l, i) => (
        <mesh
          key={i}
          position={l.pos}
          rotation={l.rot}
          scale={[1.8, 0.35, 0.9]}
          castShadow
        >
          <sphereGeometry args={[l.s, 8, 4]} />
          <meshStandardMaterial
            color={color}
            roughness={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
});

const PepperFruit = memo(function PepperFruit({
  position,
  color,
  size,
  rotation,
}: {
  position: Vec3;
  color: string;
  size: number;
  rotation: Vec3;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <capsuleGeometry args={[size * 0.4, size, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.05} />
    </mesh>
  );
});

const FlowerCluster = memo(function FlowerCluster({
  position,
  count,
  scale,
}: {
  position: Vec3;
  count: number;
  scale: number;
}) {
  const flowers = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: Math.cos(i * 1.4) * 0.06 * scale,
      y: Math.sin(i * 0.9) * 0.04 * scale,
      z: Math.sin(i * 1.4) * 0.06 * scale,
    }));
  }, [count, scale]);

  return (
    <group position={position}>
      {flowers.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]}>
          <sphereGeometry args={[0.018 * scale, 6, 6]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive="#fef08a"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
});

export type PepperPlantModelProps = {
  scale: number;
  maturity: number;
  scoville: number;
  seed: number;
  profile?: PepperProfile;
  isSelected?: boolean;
};

export const PepperPlantModel = memo(function PepperPlantModel({
  scale,
  maturity,
  scoville,
  seed,
  profile = "bushy",
  isSelected,
}: PepperPlantModelProps) {
  const structure = useMemo(
    () =>
      generatePlantStructure({
        seed,
        height: 0.3 + scale * 0.5,
        branchCount: 6 + Math.floor(scale * 10),
        leafDensity: maturity,
        pepperCount: maturity > 0.5 ? Math.floor(maturity * 8) : 0,
        droopFactor: profile === "superhot" ? 0.22 : 0.15,
        profile,
      }),
    [scale, maturity, seed, profile],
  );

  const lColor = leafColor(scoville);
  const pColor = pepperColor(scoville, maturity);

  return (
    <group>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <sphereGeometry
          args={[0.08 * scale, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial color="#3d2817" roughness={1} />
      </mesh>
      <StemMesh
        points={structure.stemPoints}
        radius={0.012 * scale}
        color="#4a3728"
      />
      {structure.branches.map((branch, i) => (
        <group key={i}>
          <StemMesh
            points={branch.points}
            radius={0.006 * scale}
            color="#5a4738"
          />
          <LeafCluster
            position={branch.tipPosition}
            count={branch.leafCount}
            size={0.04 * scale}
            color={lColor}
            seed={seed + i}
          />
          {branch.hasFruit && (
            <PepperFruit
              position={branch.fruitPosition}
              color={pColor}
              size={0.015 + ((seed + i) % 5) * 0.002}
              rotation={branch.fruitRotation}
            />
          )}
        </group>
      ))}
      {maturity > 0.3 && maturity < 0.7 && (
        <FlowerCluster
          position={[0, structure.height * 0.6, 0]}
          count={5}
          scale={scale}
        />
      )}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.22 * scale, 0.26 * scale, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
});
