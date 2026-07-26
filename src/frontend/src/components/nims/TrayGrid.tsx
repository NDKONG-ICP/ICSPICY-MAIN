import { cn } from "@/lib/utils";
import type { TrayCellPublic } from "../../declarations/backend.did";
import { TrayCell } from "./TrayCell";

const GRID_COLS = 12;
const GRID_SLOTS = GRID_COLS * 6;

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
    inventoryPlantId: [],
    containerLabel: [],
  };
}

export type TrayGridProps = {
  cells: TrayCellPublic[];
  onCellClick: (position: bigint) => void;
  /** When true, clicks toggle selection instead of opening cell actions. */
  selectionMode?: boolean;
  selectedCells?: ReadonlySet<string>;
};

/**
 * 72-cell nursery tray — landscape layout: 12 columns × 6 rows (positions 1..72).
 */
export function TrayGrid({
  cells,
  onCellClick,
  selectionMode = false,
  selectedCells,
}: TrayGridProps) {
  const byPosition = new Map<bigint, TrayCellPublic>();
  for (const c of cells) {
    byPosition.set(c.position, c);
  }

  return (
    <div data-ocid="nims-tray-grid" className="w-full overflow-x-auto">
      <div
        className="grid min-w-[min(100%,36rem)] w-full grid-cols-12 gap-0.5 sm:min-w-0"
        style={{ gridAutoRows: "minmax(0, auto)" }}
      >
        {Array.from({ length: GRID_SLOTS }, (_, idx) => {
          const position = BigInt(idx + 1);
          const cell = byPosition.get(position) ?? emptyTrayCell(position);
          const varietyName = unwrap(cell.varietyName);
          const nftTokenId = unwrap(cell.nftTokenId);
          const daysSincePlanted = unwrap(cell.daysSincePlanted);
          const containerLabel = unwrap(cell.containerLabel);
          const isSelected = selectedCells?.has(position.toString()) ?? false;
          return (
            <div
              key={idx}
              className={cn(
                selectionMode &&
                  isSelected &&
                  "ring-2 ring-primary ring-offset-1 ring-offset-background rounded-md",
              )}
            >
              <TrayCell
                status={cell.status}
                position={cell.position}
                varietyName={varietyName}
                daysSincePlanted={daysSincePlanted}
                nftTokenId={nftTokenId}
                containerLabel={containerLabel}
                onClick={() => onCellClick(cell.position)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
