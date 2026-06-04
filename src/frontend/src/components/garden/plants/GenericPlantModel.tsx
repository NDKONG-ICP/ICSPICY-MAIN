import type { ModelType } from "@/lib/garden-plant-catalog";
import { memo, useMemo } from "react";
import * as THREE from "three";
import { seededRandom } from "./plant-structure";

type Props = {
  modelType: ModelType;
  scale: number;
  maturity: number;
  color: string;
  fruitColor: string | null;
  seed: number;
  isSelected?: boolean;
};

const VinePlant = memo(function VinePlant({
  scale,
  maturity,
  color,
}: {
  scale: number;
  maturity: number;
  color: string;
}) {
  const tube = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 5; i += 1) {
      pts.push(
        new THREE.Vector3(
          Math.sin(i * 0.8) * 0.15 * scale,
          i * 0.12 * scale,
          i * 0.05,
        ),
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 8, 0.008 * scale, 5, false);
  }, [scale]);

  return (
    <group>
      <mesh geometry={tube} castShadow>
        <meshStandardMaterial color="#4a3728" roughness={0.85} />
      </mesh>
      {Array.from({ length: 4 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i) * 0.1 * scale,
            0.15 + i * 0.12,
            Math.cos(i) * 0.08,
          ]}
          scale={[1.5, 0.3, 1]}
          castShadow
        >
          <sphereGeometry args={[0.05 * scale * maturity, 6, 4]} />
          <meshStandardMaterial
            color={color}
            roughness={0.65}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
});

export const GenericPlantModel = memo(function GenericPlantModel({
  modelType,
  scale,
  maturity,
  color,
  fruitColor,
  seed,
  isSelected,
}: Props) {
  const rand = useMemo(() => seededRandom(seed), [seed]);
  const h =
    scale *
    (modelType === "large_tree"
      ? 2.5
      : modelType === "small_tree"
        ? 1.4
        : 0.6) *
    (0.5 + maturity * 0.5);

  if (modelType === "large_tree" || modelType === "small_tree") {
    const canopyR =
      scale *
      (modelType === "large_tree" ? 0.9 : 0.55) *
      (0.6 + maturity * 0.4);
    return (
      <group>
        <mesh position={[0, h * 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.06 * scale, 0.1 * scale, h * 0.9, 8]} />
          <meshStandardMaterial color="#5c4033" roughness={0.9} />
        </mesh>
        <mesh position={[0, h * 0.85, 0]} castShadow>
          <sphereGeometry args={[canopyR, 14, 12]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
        {fruitColor && maturity > 0.6 && (
          <mesh position={[canopyR * 0.4, h * 0.7, 0]} castShadow>
            <sphereGeometry args={[0.05 * scale, 8, 8]} />
            <meshStandardMaterial color={fruitColor} roughness={0.4} />
          </mesh>
        )}
        {isSelected && <SelectionRing scale={scale} />}
      </group>
    );
  }

  if (modelType === "palm") {
    return (
      <group>
        <mesh position={[0, h * 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.05 * scale, 0.07 * scale, h, 8]} />
          <meshStandardMaterial color="#8B7355" roughness={0.85} />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(a) * 0.15 * scale,
                h * 0.95,
                Math.sin(a) * 0.15 * scale,
              ]}
              rotation={[0.6, a, 0]}
              castShadow
            >
              <boxGeometry
                args={[0.04 * scale, 0.5 * scale * maturity, 0.02 * scale]}
              />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
          );
        })}
        {isSelected && <SelectionRing scale={scale} />}
      </group>
    );
  }

  if (modelType === "vine") {
    return (
      <group>
        <VinePlant scale={scale} maturity={maturity} color={color} />
        {isSelected && <SelectionRing scale={scale} />}
      </group>
    );
  }

  if (modelType === "groundcover" || modelType === "grass") {
    const patches = Math.floor(4 + maturity * 6);
    return (
      <group>
        {Array.from({ length: patches }, (_, i) => (
          <mesh
            key={i}
            position={[
              (rand() - 0.5) * 0.25 * scale,
              0.03,
              (rand() - 0.5) * 0.25 * scale,
            ]}
            scale={[1.2, 0.15, 1]}
            castShadow
          >
            <sphereGeometry args={[0.08 * scale, 6, 4]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        ))}
        {isSelected && <SelectionRing scale={scale} />}
      </group>
    );
  }

  // herb, shrub, succulent default
  const stems = modelType === "shrub" ? 5 : 3;
  return (
    <group>
      {Array.from({ length: stems }, (_, i) => {
        const a = (i / stems) * Math.PI * 2;
        const sh = h * (0.7 + rand() * 0.3);
        return (
          <group key={i}>
            <mesh
              position={[
                Math.cos(a) * 0.05 * scale,
                sh * 0.35,
                Math.sin(a) * 0.05 * scale,
              ]}
              castShadow
            >
              <cylinderGeometry
                args={[0.008 * scale, 0.012 * scale, sh * 0.7, 5]}
              />
              <meshStandardMaterial color="#5a4738" roughness={0.85} />
            </mesh>
            <mesh
              position={[
                Math.cos(a) * 0.08 * scale,
                sh * 0.75,
                Math.sin(a) * 0.08 * scale,
              ]}
              scale={[1.4, 0.35, 1]}
              castShadow
            >
              <sphereGeometry args={[0.06 * scale * maturity, 8, 6]} />
              <meshStandardMaterial
                color={color}
                roughness={0.65}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
      {isSelected && <SelectionRing scale={scale} />}
    </group>
  );
});

function SelectionRing({ scale }: { scale: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <ringGeometry args={[0.2 * scale, 0.24 * scale, 32]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
    </mesh>
  );
}
