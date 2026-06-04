import type { PlantPlacement } from "@/lib/garden-types";
import { Tree } from "@dgreenheck/ez-tree";
import { Html } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const BUSH_PRESETS = ["Bush 1", "Bush 2", "Bush 3"] as const;

type Props = {
  placement: PlantPlacement;
  growthStage: number;
  selected?: boolean;
  scovilleLabel?: string | null;
  readOnly?: boolean;
  onSelect?: () => void;
  onLongPressDelete?: () => void;
};

function disposeTree(tree: Tree) {
  tree.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
}

export function EzTreePlant({
  placement,
  growthStage,
  selected,
  scovilleLabel,
  readOnly,
  onSelect,
  onLongPressDelete,
}: Props) {
  const hostRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seed = placement.varietyId ?? placement.id;
  const preset = BUSH_PRESETS[seed % BUSH_PRESETS.length];
  const rotY = (placement.rotation * Math.PI) / 180;
  const stageScale = 0.35 + growthStage * 0.65;
  const size = placement.scale * stageScale * 0.35;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const tree = new Tree();
    tree.loadPreset(preset);
    tree.options.seed = seed;
    tree.options.branch.length[0] = 0.08 + growthStage * 0.2;
    tree.options.branch.levels = growthStage > 0.5 ? 3 : 2;
    tree.generate();
    tree.scale.setScalar(size);
    host.add(tree);

    return () => {
      host.remove(tree);
      disposeTree(tree);
    };
  }, [growthStage, preset, seed, size]);

  const startLongPress = () => {
    if (readOnly || !onLongPressDelete) return;
    pressTimer.current = setTimeout(() => onLongPressDelete(), 600);
  };
  const cancelLongPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <group
      ref={hostRef}
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
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry
            args={[0.22 * placement.scale, 0.26 * placement.scale, 32]}
          />
          <meshBasicMaterial color="#f97316" transparent opacity={0.85} />
        </mesh>
      )}
      <Html distanceFactor={14} position={[0, 0.5 * size + 0.2, 0]} center>
        <div
          className={`rounded-md bg-card/95 border border-border px-2 py-1 text-xs whitespace-nowrap shadow-lg pointer-events-none transition-opacity ${hovered || selected ? "opacity-100" : "opacity-0"}`}
        >
          <span className="font-medium">{placement.label}</span>
          {scovilleLabel && (
            <span className="text-muted-foreground ml-1">
              · {scovilleLabel}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}
