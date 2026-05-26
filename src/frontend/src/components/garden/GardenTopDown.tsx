import { useMemo, useRef, useState, type ReactElement } from "react";
import { motion } from "motion/react";
import type { GardenDesign } from "@/lib/garden-types";
import { snapToGrid } from "@/lib/garden-utils";
import { GhostPreview2D } from "./GhostPreview";

const PX_PER_M = 50;

type Props = {
  design: GardenDesign;
  selectedId: number | null;
  selectedType: "plant" | "structure" | null;
  ghost: { x: number; y: number } | null;
  gridSnap: boolean;
  readOnly?: boolean;
  onSelectPlant: (id: number) => void;
  onSelectStructure: (id: number) => void;
  onMove: (id: number, type: "plant" | "structure", x: number, y: number) => void;
  onPointerMove: (x: number, y: number) => void;
  onPlace: () => void;
  onClearSelection: () => void;
  hasPending: boolean;
  onDeleteItem?: (id: number, type: "plant" | "structure") => void;
};

export function GardenTopDown({
  design,
  selectedId,
  selectedType,
  ghost,
  gridSnap,
  readOnly,
  onSelectPlant,
  onSelectStructure,
  onMove,
  onPointerMove,
  onPlace,
  onClearSelection,
  hasPending,
  onDeleteItem,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drag, setDrag] = useState<{
    id: number;
    type: "plant" | "structure";
  } | null>(null);

  const w = design.widthMeters * PX_PER_M;
  const h = design.depthMeters * PX_PER_M;

  const gridLines = useMemo(() => {
    const lines: ReactElement[] = [];
    for (let x = 0; x <= design.widthMeters; x += design.gridSizeMeters) {
      lines.push(
        <line
          key={`vx-${x}`}
          x1={x * PX_PER_M}
          y1={0}
          x2={x * PX_PER_M}
          y2={h}
          stroke="#334155"
          strokeWidth={1}
        />,
      );
    }
    for (let y = 0; y <= design.depthMeters; y += design.gridSizeMeters) {
      lines.push(
        <line
          key={`hy-${y}`}
          x1={0}
          y1={y * PX_PER_M}
          x2={w}
          y2={y * PX_PER_M}
          stroke="#334155"
          strokeWidth={1}
        />,
      );
    }
    return lines;
  }, [design.depthMeters, design.gridSizeMeters, design.widthMeters, h, w]);

  const toMeters = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (clientX - rect.left) / PX_PER_M;
    const y = (clientY - rect.top) / PX_PER_M;
    return {
      x: Math.max(0, Math.min(design.widthMeters, x)),
      y: Math.max(0, Math.min(design.depthMeters, y)),
    };
  };

  const bindLongPress = (
    id: number,
    type: "plant" | "structure",
  ) => ({
    onTouchStart: () => {
      if (readOnly || !onDeleteItem) return;
      longPressRef.current = setTimeout(() => onDeleteItem(id, type), 600);
    },
    onTouchEnd: () => {
      if (longPressRef.current) clearTimeout(longPressRef.current);
    },
  });

  return (
    <div className="h-full w-full overflow-auto rounded-lg border border-border bg-[#0f172a] p-2">
      <svg
        ref={svgRef}
        width={w}
        height={h}
        className="mx-auto touch-none"
        onMouseMove={(e) => {
          const m = toMeters(e.clientX, e.clientY);
          onPointerMove(m.x, m.y);
          if (drag && !readOnly) {
            const gx = snapToGrid(m.x, design.gridSizeMeters, gridSnap);
            const gy = snapToGrid(m.y, design.gridSizeMeters, gridSnap);
            onMove(drag.id, drag.type, gx, gy);
          }
        }}
        onMouseUp={() => setDrag(null)}
        onMouseLeave={() => setDrag(null)}
        onClick={(e) => {
          if (hasPending && !readOnly) {
            onPlace();
            return;
          }
          if (e.target === svgRef.current) onClearSelection();
        }}
      >
        <rect width={w} height={h} fill="#14532d" opacity={0.35} />
        {gridLines}
        {design.structures.map((s) => {
          const sel = selectedType === "structure" && selectedId === s.id;
          return (
            <g
              key={`s-${s.id}`}
              transform={`translate(${s.x * PX_PER_M}, ${s.y * PX_PER_M}) rotate(${s.rotation}, ${(s.width * PX_PER_M) / 2}, ${(s.depth * PX_PER_M) / 2})`}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (readOnly) return;
                onSelectStructure(s.id);
                setDrag({ id: s.id, type: "structure" });
              }}
            >
              <rect
                width={s.width * PX_PER_M}
                height={s.depth * PX_PER_M}
                fill={s.color}
                opacity={0.65}
                stroke={sel ? "#f97316" : "#fff"}
                strokeWidth={sel ? 2 : 1}
                rx={2}
              />
            </g>
          );
        })}
        {design.plants.map((p) => {
          const sel = selectedType === "plant" && selectedId === p.id;
          const r = 12 * p.scale;
          return (
            <motion.g
              key={`p-${p.id}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transform={`translate(${p.x * PX_PER_M}, ${p.y * PX_PER_M})`}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (readOnly) return;
                onSelectPlant(p.id);
                setDrag({ id: p.id, type: "plant" });
              }}
              {...bindLongPress(p.id, "plant")}
            >
              <circle
                r={r}
                fill={p.color}
                stroke={sel ? "#f97316" : "#fff"}
                strokeWidth={sel ? 2 : 1}
              />
              <text textAnchor="middle" dy={4} fill="#fff" fontSize={10} pointerEvents="none">
                {p.label[0]?.toUpperCase() ?? "?"}
              </text>
            </motion.g>
          );
        })}
        {ghost && hasPending && (
          <GhostPreview2D x={ghost.x} y={ghost.y} scalePx={PX_PER_M} />
        )}
      </svg>
    </div>
  );
}
