import type { TrayCellPublic } from "../../declarations/backend.did";
import { TrayCell } from "./TrayCell";

const GRID_SLOTS = 6 * 12;

function unwrap<T>(opt: [] | [T]): T | undefined {
  return opt.length > 0 ? opt[0] : undefined;
}

function emptyTrayCell(position: bigint): TrayCellPublic {
  return {
    status: { Empty: null },
    plantedAt: [],
    varietyName: [],
    nftTokenId: [],
    plantId: [],
    position,
    daysSincePlanted: [],
    germinatedAt: [],
  };
}

export type TrayGridProps = {
  cells: TrayCellPublic[];
  onCellClick: (position: bigint) => void;
};

/**
 * Builds a dense 72-cell view (positions 0..71).
 * Incoming cells override by `position`; missing slots render empty.
 */
export function TrayGrid({ cells, onCellClick }: TrayGridProps) {
  const byPosition = new Map<bigint, TrayCellPublic>();
  for (const c of cells) {
    byPosition.set(c.position, c);
  }

  return (
    <div data-ocid="nims-tray-grid" className="w-full">
      <div
        className="grid w-full gap-1.5"
        style={{
          gridTemplateColumns: `repeat(6, minmax(0, 1fr))`,
          gridAutoRows: "minmax(0, auto)",
        }}
      >
        {Array.from({ length: GRID_SLOTS }, (_, idx) => {
          const position = BigInt(idx + 1);
          const cell = byPosition.get(position) ?? emptyTrayCell(position);
          const varietyName = unwrap(cell.varietyName);
          const nftTokenId = unwrap(cell.nftTokenId);
          const daysSincePlanted = unwrap(cell.daysSincePlanted);
          return (
            <TrayCell
              key={idx}
              status={cell.status}
              position={cell.position}
              varietyName={varietyName}
              daysSincePlanted={daysSincePlanted}
              nftTokenId={nftTokenId}
              onClick={() => onCellClick(cell.position)}
            />
          );
        })}
      </div>
    </div>
  );
}
