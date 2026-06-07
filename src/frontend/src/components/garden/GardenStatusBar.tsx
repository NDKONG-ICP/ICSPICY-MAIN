import { formatLat, formatLng, metersToFeetInches } from "@/lib/garden-geo";

export type GardenCursorReadout = {
  /** Metres east of the SW corner. */
  east: number;
  /** Metres north of the SW corner. */
  north: number;
  lat: number;
  lng: number;
};

type Props = {
  plantCount: number;
  structureCount: number;
  widthMeters: number;
  depthMeters: number;
  center?: { lat: number; lng: number } | null;
  cursor?: GardenCursorReadout | null;
  zoom?: number | null;
  gridMeters?: number | null;
};

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap px-3 border-r border-[color:var(--garden-border)] last:border-r-0">
      {children}
    </span>
  );
}

/**
 * 36px bottom status bar — coordinates, scale, plant count, zoom.
 * All readouts in DM Mono, live cursor coordinates update on canvas mousemove.
 */
export function GardenStatusBar({
  plantCount,
  structureCount,
  widthMeters,
  depthMeters,
  center,
  cursor,
  zoom,
  gridMeters,
}: Props) {
  return (
    <div
      className="garden-font-mono flex h-9 shrink-0 items-center overflow-x-auto border-t border-[color:var(--garden-border)] bg-[color:var(--garden-surface)] px-2 text-[11px] text-[color:var(--garden-text-muted)]"
      style={{ scrollbarWidth: "none" }}
    >
      <Cell>
        <span className="text-[color:var(--garden-accent)]">⊕</span>
        <span className="text-[color:var(--garden-text)]">{plantCount}</span>
        plants
        {structureCount > 0 && (
          <span className="text-[color:var(--garden-text-muted)]">
            · {structureCount} struct
          </span>
        )}
      </Cell>
      <Cell>
        <span className="text-[color:var(--garden-gold)]">↔</span>
        <span className="text-[color:var(--garden-text)]">
          {widthMeters.toFixed(1)}m × {depthMeters.toFixed(1)}m
        </span>
      </Cell>
      {center && (
        <Cell>
          <span className="text-[color:var(--garden-gold)]">📍</span>
          {formatLat(center.lat)}, {formatLng(center.lng)}
        </Cell>
      )}
      {cursor && (
        <Cell>
          <span className="text-[color:var(--garden-gold)]">cursor:</span>
          <span className="text-[color:var(--garden-text)]">
            {cursor.east.toFixed(1)}m E, {cursor.north.toFixed(1)}m N
          </span>
          <span className="text-[color:var(--garden-text-muted)]">
            | {metersToFeetInches(cursor.east)} E,{" "}
            {metersToFeetInches(cursor.north)} N
          </span>
        </Cell>
      )}
      {zoom != null && (
        <Cell>
          <span>zoom:</span>
          <span className="text-[color:var(--garden-text)]">{zoom}</span>
        </Cell>
      )}
      {gridMeters != null && (
        <Cell>
          <span className="text-[color:var(--garden-text)]">
            {gridMeters < 1 ? `${gridMeters}m` : `${gridMeters}m`}
          </span>
          grid
        </Cell>
      )}
    </div>
  );
}
