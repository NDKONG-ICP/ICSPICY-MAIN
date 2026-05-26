import { Html } from "@react-three/drei";
import { useRef, useState } from "react";
import type { PlantPlacement } from "@/lib/garden-types";

type Props = {
  placement: PlantPlacement;
  selected?: boolean;
  scovilleLabel?: string | null;
  readOnly?: boolean;
  onSelect?: () => void;
  onLongPressDelete?: () => void;
};

export function PlantMesh({
  placement,
  selected,
  scovilleLabel,
  readOnly,
  onSelect,
  onLongPressDelete,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const color = placement.color || "#22c55e";
  const height = placement.scale * 0.5;
  const rotY = (placement.rotation * Math.PI) / 180;

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
      <mesh position={[0, height * 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.03, height * 0.6, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0, height * 0.7, 0]}>
        <coneGeometry args={[0.15 * placement.scale, height * 0.5, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#f97316" : "#000000"}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
      {placement.icon === "🌶️" && (
        <>
          <mesh position={[0.08, height * 0.5, 0.05]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh position={[-0.06, height * 0.45, -0.04]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        </>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.2 * placement.scale, 0.24 * placement.scale, 32]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.85} />
        </mesh>
      )}
      {hovered && (
        <Html distanceFactor={12} position={[0, height + 0.2, 0]} center>
          <div className="rounded-md bg-card/95 border border-border px-2 py-1 text-xs whitespace-nowrap shadow-lg pointer-events-none">
            <span className="font-medium">{placement.label}</span>
            {scovilleLabel && (
              <span className="text-muted-foreground ml-1">· {scovilleLabel}</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
