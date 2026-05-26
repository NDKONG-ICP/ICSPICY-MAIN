import type { PendingPlacement } from "@/lib/garden-types";

type Props = {
  x: number;
  y: number;
  pending: PendingPlacement;
  viewMode: "3d" | "2d";
  scalePx?: number;
};

/** Shared ghost marker for placement preview (2D SVG overlay or 3D mesh). */
export function GhostPreview3D({ x, y }: Pick<Props, "x" | "y">) {
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
}: Pick<Props, "x" | "y" | "scalePx">) {
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
  return pending.kind === "plant" ? pending.label : pending.structureType.replace(/_/g, " ");
}
