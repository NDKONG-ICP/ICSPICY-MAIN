import type { StructurePlacement } from "@/lib/garden-types";

type Props = {
  placement: StructurePlacement;
  selected?: boolean;
  onSelect?: () => void;
};

export function StructureMesh({ placement, selected, onSelect }: Props) {
  const rotY = (placement.rotation * Math.PI) / 180;
  const h =
    placement.structureType === "fence"
      ? 0.8
      : placement.structureType === "trellis"
        ? 1.6
        : placement.structureType === "greenhouse"
          ? 1.2
          : placement.structureType === "shade_sail"
            ? 0.05
            : 0.25;
  const opacity =
    placement.structureType === "greenhouse"
      ? 0.35
      : placement.structureType === "shade_sail"
        ? 0.45
        : 0.85;

  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[placement.width, h, placement.depth]} />
        <meshStandardMaterial
          color={placement.color}
          transparent={opacity < 1}
          opacity={opacity}
          emissive={selected ? "#f97316" : "#000000"}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[placement.width + 0.2, placement.depth + 0.2]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.35} wireframe />
        </mesh>
      )}
    </group>
  );
}
