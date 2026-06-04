import type { PlantPlacement } from "@/lib/garden-types";
import { darkenColor, isHotPepper } from "@/lib/garden-utils";
import { Billboard, Text } from "@react-three/drei";
import { Html } from "@react-three/drei";
import { memo, useMemo, useRef, useState } from "react";

type Props = {
  placement: PlantPlacement;
  selected?: boolean;
  scovilleLabel?: string | null;
  readOnly?: boolean;
  flowering?: boolean;
  onSelect?: () => void;
  onLongPressDelete?: () => void;
};

const PepperFruits = memo(function PepperFruits({
  position,
  scale,
  seed,
}: {
  position: [number, number, number];
  scale: number;
  seed: number;
}) {
  const pepperPositions = useMemo(() => {
    const count = 3 + (seed % 4);
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.sin(seed + i * 1.7) * 0.5 + 0.5 - 0.5) * 0.2 * scale,
      y: (Math.cos(seed + i * 2.3) * 0.5 + 0.5 - 0.5) * 0.15,
      z: (Math.sin(seed + i * 3.1) * 0.5 + 0.5 - 0.5) * 0.2 * scale,
      rotZ: Math.sin(seed + i) * 0.25,
    }));
  }, [scale, seed]);

  return (
    <group position={position}>
      {pepperPositions.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, p.y, p.z]}
          rotation={[0, 0, p.rotZ]}
          castShadow
        >
          <capsuleGeometry args={[0.012, 0.04, 4, 8]} />
          <meshStandardMaterial
            color="#dc2626"
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
});

const FlowerBuds = memo(function FlowerBuds({
  position,
  scale,
  seed,
}: {
  position: [number, number, number];
  scale: number;
  seed: number;
}) {
  const buds = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => ({
      x: Math.sin(seed + i * 2) * 0.12 * scale,
      y: Math.cos(seed + i * 1.5) * 0.08,
      z: Math.sin(seed + i * 3) * 0.12 * scale,
    }));
  }, [scale, seed]);

  return (
    <group position={position}>
      {buds.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]} castShadow>
          <sphereGeometry args={[0.025 * scale, 8, 8]} />
          <meshStandardMaterial
            color="#fef08a"
            roughness={0.5}
            emissive="#fef08a"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
    </group>
  );
});

export const EnhancedPlantMesh = memo(function EnhancedPlantMesh({
  placement,
  selected,
  scovilleLabel,
  readOnly,
  flowering = false,
  onSelect,
  onLongPressDelete,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const color = placement.color || "#22c55e";
  const height = placement.scale * 0.6;
  const rotY = (placement.rotation * Math.PI) / 180;
  const seed = placement.varietyId ?? placement.id;

  const startLongPress = () => {
    if (readOnly || !onLongPressDelete) return;
    pressTimer.current = setTimeout(() => onLongPressDelete(), 600);
  };
  const cancelLongPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
    >
      <mesh position={[0, height * 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.04, height * 0.5, 6]} />
        <meshStandardMaterial color="#5C4033" roughness={0.8} />
      </mesh>
      <mesh position={[0, height * 0.55, 0]} castShadow>
        <sphereGeometry args={[0.18 * placement.scale, 12, 12]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          emissive={selected ? "#f59e0b" : "#000000"}
          emissiveIntensity={selected ? 0.2 : 0}
        />
      </mesh>
      <mesh position={[0, height * 0.75, 0.02]} castShadow>
        <sphereGeometry args={[0.12 * placement.scale, 10, 10]} />
        <meshStandardMaterial
          color={darkenColor(color, 0.15)}
          roughness={0.6}
        />
      </mesh>
      {isHotPepper(placement) && (
        <PepperFruits
          position={[0, height * 0.5, 0]}
          scale={placement.scale}
          seed={seed}
        />
      )}
      {flowering && (
        <FlowerBuds
          position={[0, height * 0.65, 0]}
          scale={placement.scale}
          seed={seed}
        />
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry
            args={[0.2 * placement.scale, 0.25 * placement.scale, 32]}
          />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
        </mesh>
      )}
      {(hovered || selected) && (
        <Billboard position={[0, height + 0.15, 0]}>
          <Text
            fontSize={0.08}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {placement.label}
          </Text>
        </Billboard>
      )}
      {hovered && scovilleLabel && (
        <Html distanceFactor={12} position={[0, height + 0.35, 0]} center>
          <div className="rounded-md bg-card/95 border border-border px-2 py-1 text-xs whitespace-nowrap shadow-lg pointer-events-none">
            <span className="text-muted-foreground">{scovilleLabel}</span>
          </div>
        </Html>
      )}
    </group>
  );
});
