import { cn } from "@/lib/utils";
import type { CellStatus } from "../../declarations/backend.did";

export type TrayCellProps = {
  status: CellStatus;
  position: bigint;
  varietyName?: string;
  daysSincePlanted?: bigint;
  nftTokenId?: bigint;
  containerLabel?: string;
  onClick?: () => void;
};

function cellTone(status: CellStatus): string {
  if ("Empty" in status) return "bg-zinc-800 border-zinc-700";
  if ("Planted" in status) return "bg-amber-600 border-amber-500";
  if ("Germinated" in status) return "bg-emerald-600 border-emerald-500";
  if ("Dead" in status) return "bg-red-700 border-red-600";
  if ("Transplanted" in status) return "bg-blue-600 border-blue-500";
  return "bg-zinc-800 border-zinc-700";
}

/** Human-readable variant tag */
export function cellStatusLabel(status: CellStatus): string {
  if ("Empty" in status) return "Empty";
  if ("Planted" in status) return "Planted";
  if ("Germinated" in status) return "Germinated";
  if ("Dead" in status) return "Dead";
  if ("Transplanted" in status) return "Transplanted";
  return "Unknown";
}

export function TrayCell({
  status,
  position,
  varietyName,
  daysSincePlanted,
  nftTokenId,
  containerLabel,
  onClick,
}: TrayCellProps) {
  const isTransplanted = "Transplanted" in status;
  const label = varietyName ?? cellStatusLabel(status);
  const subtitle =
    typeof daysSincePlanted === "bigint"
      ? `d ${daysSincePlanted.toString()}`
      : undefined;
  const pid = nftTokenId?.toString();
  const movedText =
    isTransplanted && containerLabel ? `Moved · ${containerLabel}` : undefined;

  return (
    <button
      type="button"
      data-ocid={`nims-tray-cell-${position.toString()}`}
      aria-label={`Cell ${position.toString()}, ${cellStatusLabel(status)}`}
      onClick={onClick}
      className={cn(
        "relative flex aspect-square w-full flex-col justify-end rounded-md border p-1 text-left text-[10px] font-semibold leading-tight shadow-sm transition hover:brightness-110 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        cellTone(status),
        "Empty" in status && "opacity-70",
      )}
    >
      <span className="absolute left-1 top-1 text-[9px] font-normal opacity-70">
        {position.toString()}
      </span>
      <span className="truncate text-white">{label}</span>
      {movedText ? (
        <span className="truncate text-[9px] font-normal text-white/80">
          {movedText}
        </span>
      ) : subtitle !== undefined ? (
        <span className="truncate text-[9px] font-normal text-white/80">
          {subtitle}
          {pid !== undefined ? ` · #${pid}` : ""}
        </span>
      ) : pid !== undefined ? (
        <span className="truncate text-[9px] font-normal text-white/80">
          #{pid}
          {isTransplanted ? " · historical" : ""}
        </span>
      ) : null}
    </button>
  );
}
