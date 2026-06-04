import type { StructurePlacement } from "@/lib/garden-types";
import {
  createGravelTexture,
  createMulchTexture,
  createSoilTexture,
} from "@/lib/ground-textures";
import { Edges } from "@react-three/drei";
import { memo, useMemo } from "react";
import * as THREE from "three";

type S = {
  placement: StructurePlacement;
  selected?: boolean;
  onSelect?: () => void;
};

function rot(placement: StructurePlacement) {
  return (placement.rotation * Math.PI) / 180;
}

export const RaisedBedMesh = memo(function RaisedBedMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const { width, depth } = placement;
  const height = 0.3;
  const r = rot(placement);
  const soilTex = useMemo(() => createSoilTexture(), []);
  const mulchTex = useMemo(() => createMulchTexture(), []);

  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, r, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height * 0.85, depth]} />
        <meshStandardMaterial map={soilTex} roughness={0.95} />
      </mesh>
      <mesh position={[0, height * 0.92, 0]} receiveShadow>
        <boxGeometry args={[width * 0.95, 0.02, depth * 0.95]} />
        <meshStandardMaterial map={mulchTex} roughness={0.9} />
      </mesh>
      {(
        [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ] as const
      ).map(([dx, dz], i) => {
        const isX = dx !== 0;
        return (
          <mesh
            key={i}
            position={[dx * (width / 2), height / 2, dz * (depth / 2)]}
            castShadow
          >
            <boxGeometry
              args={[
                isX ? 0.05 : width + 0.1,
                height,
                isX ? depth + 0.1 : 0.05,
              ]}
            />
            <meshStandardMaterial
              color="#8B6914"
              roughness={0.8}
              emissive={selected ? "#f59e0b" : "#000"}
              emissiveIntensity={selected ? 0.12 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
});

export const GreenhouseMesh = memo(function GreenhouseMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const r = rot(placement);
  const h = Math.max(1.2, placement.depth * 0.55);
  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, r, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[placement.width, h, placement.depth]} />
        <meshStandardMaterial
          color="#e0f0ff"
          transparent
          opacity={0.28}
          roughness={0.1}
          metalness={0.15}
          emissive={selected ? "#f59e0b" : "#000"}
          emissiveIntensity={selected ? 0.08 : 0}
        />
        <Edges threshold={15} color="#888" />
      </mesh>
      <mesh position={[0, h + 0.05, 0]} rotation={[0, 0, 0]}>
        <boxGeometry
          args={[placement.width + 0.1, 0.05, placement.depth + 0.1]}
        />
        <meshStandardMaterial color="#666" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
});

export const HoopHouseMesh = memo(function HoopHouseMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const r = rot(placement);
  const hoops = Math.max(3, Math.floor(placement.width / 1.5));
  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, r, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {Array.from({ length: hoops }, (_, i) => {
        const x = -placement.width / 2 + (i / (hoops - 1)) * placement.width;
        return (
          <mesh
            key={i}
            position={[x, placement.depth * 0.35, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <torusGeometry
              args={[placement.depth * 0.35, 0.015, 8, 24, Math.PI]}
            />
            <meshStandardMaterial
              color="#888"
              metalness={0.6}
              roughness={0.3}
              emissive={selected ? "#f59e0b" : "#000"}
              emissiveIntensity={selected ? 0.05 : 0}
            />
          </mesh>
        );
      })}
      <mesh position={[0, placement.depth * 0.35, 0]}>
        <boxGeometry
          args={[placement.width, placement.depth * 0.7, placement.depth]}
        />
        <meshStandardMaterial
          color="#e8f4ff"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});

export const PathMesh = memo(function PathMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const gravel = useMemo(() => createGravelTexture(), []);
  const mulch = useMemo(() => createMulchTexture(), []);
  const isGravel =
    placement.structureType.includes("gravel") ||
    placement.structureType.includes("paver");
  return (
    <mesh
      position={[placement.x, 0.015, placement.y]}
      rotation={[-Math.PI / 2, 0, rot(placement)]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <planeGeometry args={[placement.width, placement.depth]} />
      <meshStandardMaterial
        map={isGravel ? gravel : mulch}
        roughness={0.95}
        emissive={selected ? "#f59e0b" : "#000"}
        emissiveIntensity={selected ? 0.08 : 0}
      />
    </mesh>
  );
});

export const RainBarrelMesh = memo(function RainBarrelMesh({
  placement,
  selected,
  onSelect,
}: S) {
  return (
    <group
      position={[placement.x, 0, placement.y]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.28, 0.7, 16]} />
        <meshStandardMaterial
          color="#4a6fa5"
          roughness={0.3}
          metalness={0.4}
          emissive={selected ? "#f59e0b" : "#000"}
          emissiveIntensity={selected ? 0.1 : 0}
        />
      </mesh>
      {[0.1, 0.35, 0.6].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.008, 8, 32]} />
          <meshStandardMaterial color="#666" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
});

export const CompostBinMesh = memo(function CompostBinMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const r = rot(placement);
  const bins = placement.structureType.includes("3-bin") ? 3 : 1;
  const binW = placement.width / bins;
  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, r, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {Array.from({ length: bins }, (_, i) => (
        <group key={i} position={[(i - (bins - 1) / 2) * binW, 0, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[binW * 0.9, 0.8, placement.depth * 0.9]} />
            <meshStandardMaterial color="#3d2817" roughness={0.95} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * binW * 0.45, 0.4, 0]} castShadow>
              <boxGeometry args={[0.04, 0.8, placement.depth]} />
              <meshStandardMaterial
                color="#8B6914"
                roughness={0.85}
                emissive={selected ? "#f59e0b" : "#000"}
                emissiveIntensity={selected ? 0.08 : 0}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
});

export const JohnsonSuMesh = memo(function JohnsonSuMesh({
  placement,
  selected,
  onSelect,
}: S) {
  return (
    <group
      position={[placement.x, 0, placement.y]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 1.2, 16, 1, true]} />
        <meshStandardMaterial
          color="#888"
          wireframe
          emissive={selected ? "#f59e0b" : "#000"}
          emissiveIntensity={selected ? 0.15 : 0}
        />
      </mesh>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.1, 16]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>
    </group>
  );
});

export const ChickenCoopMesh = memo(function ChickenCoopMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const r = rot(placement);
  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, r, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[placement.width * 0.6, 1, placement.depth * 0.6]} />
        <meshStandardMaterial
          color="#a16207"
          roughness={0.85}
          emissive={selected ? "#f59e0b" : "#000"}
          emissiveIntensity={selected ? 0.1 : 0}
        />
      </mesh>
      <mesh position={[0, 1.05, 0]} rotation={[0, 0, 0]}>
        <boxGeometry
          args={[placement.width * 0.65, 0.1, placement.depth * 0.65]}
        />
        <meshStandardMaterial color="#444" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.02, placement.depth * 0.35]} receiveShadow>
        <boxGeometry args={[placement.width, 0.04, placement.depth * 0.3]} />
        <meshStandardMaterial color="#666" roughness={0.9} />
      </mesh>
    </group>
  );
});

export const TrellisMesh = memo(function TrellisMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const r = rot(placement);
  const h = 1.6;
  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, r, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[placement.width, h, 0.04]} />
        <meshStandardMaterial
          color="#78716c"
          wireframe
          emissive={selected ? "#f59e0b" : "#000"}
          emissiveIntensity={selected ? 0.12 : 0}
        />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * placement.width * 0.48, h / 2, 0]}
          castShadow
        >
          <boxGeometry args={[0.04, h, 0.04]} />
          <meshStandardMaterial color="#57534e" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
});

export const PondMesh = memo(function PondMesh({
  placement,
  selected,
  onSelect,
}: S) {
  return (
    <group
      position={[placement.x, 0, placement.y]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        receiveShadow
      >
        <circleGeometry
          args={[Math.min(placement.width, placement.depth) / 2, 32]}
        />
        <meshStandardMaterial
          color="#3b82f6"
          roughness={0.1}
          metalness={0.6}
          transparent
          opacity={0.75}
          emissive={selected ? "#f59e0b" : "#1e40af"}
          emissiveIntensity={selected ? 0.1 : 0.05}
        />
      </mesh>
    </group>
  );
});

export const BeeHiveMesh = memo(function BeeHiveMesh({
  placement,
  selected,
  onSelect,
}: S) {
  return (
    <group
      position={[placement.x, 0, placement.y]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.15 + i * 0.18, 0]} castShadow>
          <boxGeometry args={[0.35, 0.16, 0.35]} />
          <meshStandardMaterial
            color="#fbbf24"
            roughness={0.7}
            emissive={selected ? "#f59e0b" : "#000"}
            emissiveIntensity={selected ? 0.08 : 0}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0.2]}>
        <boxGeometry args={[0.25, 0.02, 0.08]} />
        <meshStandardMaterial color="#78716c" />
      </mesh>
    </group>
  );
});

export const IrrigationMesh = memo(function IrrigationMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const r = rot(placement);
  return (
    <group
      position={[placement.x, 0.05, placement.y]}
      rotation={[0, r, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh castShadow>
        <boxGeometry args={[placement.width, 0.02, 0.02]} />
        <meshStandardMaterial
          color="#1f2937"
          roughness={0.5}
          metalness={0.3}
          emissive={selected ? "#f59e0b" : "#000"}
          emissiveIntensity={selected ? 0.1 : 0}
        />
      </mesh>
      {Array.from(
        { length: Math.max(2, Math.floor(placement.width / 0.5)) },
        (_, i) => (
          <mesh key={i} position={[-placement.width / 2 + i * 0.5, -0.02, 0]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#374151" metalness={0.5} />
          </mesh>
        ),
      )}
    </group>
  );
});

export const FenceMesh = memo(function FenceMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const r = rot(placement);
  const posts = Math.max(2, Math.floor(placement.width / 0.8));
  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, r, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {Array.from({ length: posts }, (_, i) => (
        <mesh
          key={i}
          position={[
            -placement.width / 2 + (i / (posts - 1)) * placement.width,
            0.4,
            0,
          ]}
          castShadow
        >
          <boxGeometry args={[0.06, 0.8, 0.06]} />
          <meshStandardMaterial
            color="#a16207"
            roughness={0.85}
            emissive={selected ? "#f59e0b" : "#000"}
            emissiveIntensity={selected ? 0.08 : 0}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[placement.width, 0.04, 0.04]} />
        <meshStandardMaterial color="#92400e" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[placement.width, 0.04, 0.04]} />
        <meshStandardMaterial color="#92400e" />
      </mesh>
    </group>
  );
});

export const ShadeClothMesh = memo(function ShadeClothMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const r = rot(placement);
  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, r, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([dx, dz], i) => (
        <mesh
          key={i}
          position={[
            dx * placement.width * 0.45,
            0.9,
            dz * placement.depth * 0.45,
          ]}
          castShadow
        >
          <cylinderGeometry args={[0.025, 0.025, 1.8, 8]} />
          <meshStandardMaterial color="#666" metalness={0.5} />
        </mesh>
      ))}
      <mesh
        position={[0, 1.75, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[placement.width, placement.depth]} />
        <meshStandardMaterial
          color="#94a3b8"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          emissive={selected ? "#f59e0b" : "#000"}
          emissiveIntensity={selected ? 0.06 : 0}
        />
      </mesh>
    </group>
  );
});

export const DefaultStructureMesh = memo(function DefaultStructureMesh({
  placement,
  selected,
  onSelect,
}: S) {
  const r = rot(placement);
  const h = 0.35;
  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, r, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[placement.width, h, placement.depth]} />
        <meshStandardMaterial
          color={placement.color}
          roughness={0.85}
          emissive={selected ? "#f59e0b" : "#000"}
          emissiveIntensity={selected ? 0.15 : 0}
        />
      </mesh>
    </group>
  );
});

export function resolveStructureMesh(structureType: string) {
  const t = structureType.toLowerCase();
  if (t.includes("raised") || (t.includes("bed") && !t.includes("keyhole")))
    return RaisedBedMesh;
  if (t.includes("greenhouse")) return GreenhouseMesh;
  if (t.includes("hoop")) return HoopHouseMesh;
  if (
    t.includes("path") ||
    t.includes("gravel") ||
    t.includes("mulch") ||
    t.includes("paver")
  )
    return PathMesh;
  if (t.includes("rain-barrel") || t.includes("barrel") || t.includes("ibc"))
    return RainBarrelMesh;
  if (t.includes("compost") && !t.includes("johnson")) return CompostBinMesh;
  if (t.includes("johnson")) return JohnsonSuMesh;
  if (t.includes("chicken") || t.includes("coop")) return ChickenCoopMesh;
  if (
    t.includes("trellis") ||
    t.includes("arbor") ||
    t.includes("pergola") ||
    t.includes("cattle")
  )
    return TrellisMesh;
  if (t.includes("pond") || t.includes("rain-garden") || t.includes("bioswale"))
    return PondMesh;
  if (t.includes("bee") || t.includes("hive")) return BeeHiveMesh;
  if (t.includes("drip") || t.includes("irrigation") || t.includes("soaker"))
    return IrrigationMesh;
  if (t.includes("fence")) return FenceMesh;
  if (t.includes("shade")) return ShadeClothMesh;
  return DefaultStructureMesh;
}
