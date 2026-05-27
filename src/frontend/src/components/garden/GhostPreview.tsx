import type { PendingPlacement } from "@/lib/garden-types";
import { PepperPlantModel } from "./plants/PepperPlantModel";
import { StructureMesh } from "./StructureMesh";

type Props = {
  x: number;
  y: number;
  pending?: PendingPlacement;
  maturity?: number;
};

export function GhostPreview3D({ x, y, pending, maturity = 0.7 }: Pick<Props, "x" | "y" | "pending" | "maturity">) {
  if (pending?.kind === "plant") {
    return (
      <group position={[x, 0, y]}>
        <PepperPlantModel
          scale={1}
          maturity={maturity}
          scoville={pending.scoville ?? 100_000}
          seed={-1}
          profile="bushy"
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.2, 0.24, 32]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.45} />
        </mesh>
      </group>
    );
  }

  if (pending?.kind === "structure") {
    const placement = {
      id: -1,
      structureType: pending.structureType,
      x: 0,
      y: 0,
      width: pending.width,
      depth: pending.depth,
      rotation: 0,
      color: pending.color,
    };
    return (
      <group position={[x, 0, y]}>
        <StructureMesh placement={placement} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.28, 0.32, 32]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.4} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={[x, 0.15, y]}>
      <sphereGeometry args={[0.12, 12, 12]} />
      <meshStandardMaterial color="#f97316" transparent opacity={0.55} />
    </mesh>
  );
}

export function GhostPreview2D({
  x,
  y,
  scalePx = 50,
}: Pick<Props, "x" | "y"> & { scalePx?: number }) {
  return (
    <circle
      cx={x * scalePx}
      cy={y * scalePx}
      r={14}
      fill="#f97316"
      opacity={0.45}
      stroke="#fff"
      strokeDasharray="4 2"
    />
  );
}

export function ghostLabel(pending: PendingPlacement): string {
  if (pending.kind === "plant") return pending.label;
  return pending.label ?? pending.structureType.replace(/-/g, " ");
}
