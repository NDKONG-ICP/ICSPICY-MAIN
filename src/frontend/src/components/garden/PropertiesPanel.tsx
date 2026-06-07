import type { VarietyPublic } from "@/declarations/backend.did";
import type { GardenDesignerState } from "@/hooks/useGardenDesigner";
import { metersToFeetInches, metersToInches } from "@/lib/garden-geo";
import { getPlantById } from "@/lib/garden-plant-catalog";
import { cn } from "@/lib/utils";
import { Copy, Trash2 } from "lucide-react";

type Props = {
  designer: GardenDesignerState;
  varieties: VarietyPublic[];
  mobile?: boolean;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-[color:var(--garden-text-muted)]">{label}</span>
      <span className="garden-font-mono text-[color:var(--garden-text)]">
        {children}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="garden-font-display mb-1 mt-3 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--garden-text-muted)]">
      {children}
    </p>
  );
}

export function PropertiesPanel({ designer, varieties, mobile }: Props) {
  const {
    selectedPlant,
    selectedStructure,
    selectedId,
    selectedType,
    readOnly,
    rotateItem,
    moveItem,
    deleteItem,
    duplicateItem,
  } = designer;

  const shellCls = mobile
    ? "fixed inset-x-0 bottom-0 z-30 max-h-[55vh] overflow-auto rounded-t-xl border border-[color:var(--garden-border)] bg-[color:var(--garden-surface)] p-4 sm:hidden"
    : "flex h-full w-full flex-col gap-1 overflow-auto bg-[color:var(--garden-surface)] p-4";

  if (selectedId == null || !selectedType) {
    return (
      <aside className={shellCls}>
        <p className="text-sm text-[color:var(--garden-text-muted)]">
          Select a plant or structure to edit its properties.
        </p>
      </aside>
    );
  }

  const cat =
    selectedType === "plant" && selectedPlant?.catalogId
      ? getPlantById(selectedPlant.catalogId)
      : undefined;

  const variety =
    selectedPlant?.varietyId != null
      ? varieties.find((v) => Number(v.id) === selectedPlant.varietyId)
      : undefined;

  const name =
    selectedType === "plant"
      ? (selectedPlant?.label ?? "Plant")
      : (selectedStructure?.structureType.replace(/[-_]/g, " ") ?? "Structure");

  const x = selectedType === "plant" ? selectedPlant!.x : selectedStructure!.x;
  const y = selectedType === "plant" ? selectedPlant!.y : selectedStructure!.y;
  const rotation =
    selectedType === "plant"
      ? selectedPlant!.rotation
      : selectedStructure!.rotation;

  const scoville =
    cat?.scovilleMax ??
    (selectedPlant?.scoville ?? undefined) ??
    (variety ? Number(variety.scovilleMax) : undefined);

  const companions = (cat?.companions ?? [])
    .map((id) => getPlantById(id))
    .filter(Boolean)
    .slice(0, 6);
  const antagonists = (cat?.antagonists ?? [])
    .map((id) => getPlantById(id))
    .filter(Boolean)
    .slice(0, 4);

  return (
    <aside className={shellCls}>
      <div>
        <h3 className="garden-font-display text-base font-bold capitalize text-[color:var(--garden-text)]">
          {name}
        </h3>
        {cat?.latinName && (
          <p className="text-xs italic text-[color:var(--garden-text-muted)]">
            {cat.latinName}
          </p>
        )}
        {cat?.category && (
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-[color:var(--garden-text-muted)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            {cat.subcategory || cat.category}
          </span>
        )}
      </div>

      <SectionTitle>Position</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] text-[color:var(--garden-text-muted)]">
            X · {metersToFeetInches(x)}
          </span>
          <input
            type="number"
            step={0.1}
            value={x}
            disabled={readOnly}
            onChange={(e) =>
              moveItem(selectedId, selectedType, Number(e.target.value), y)
            }
            className="garden-font-mono w-full rounded-md border border-[color:var(--garden-border)] bg-[color:var(--garden-surface-raised)] px-2 py-1 text-sm text-[color:var(--garden-text)] outline-none focus:border-[color:var(--garden-accent)]"
          />
        </label>
        <label className="block">
          <span className="text-[10px] text-[color:var(--garden-text-muted)]">
            Y · {metersToFeetInches(y)}
          </span>
          <input
            type="number"
            step={0.1}
            value={y}
            disabled={readOnly}
            onChange={(e) =>
              moveItem(selectedId, selectedType, x, Number(e.target.value))
            }
            className="garden-font-mono w-full rounded-md border border-[color:var(--garden-border)] bg-[color:var(--garden-surface-raised)] px-2 py-1 text-sm text-[color:var(--garden-text)] outline-none focus:border-[color:var(--garden-accent)]"
          />
        </label>
      </div>
      <label className="mt-2 block">
        <span className="text-[10px] text-[color:var(--garden-text-muted)]">
          Rotation
        </span>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={rotation}
            disabled={readOnly}
            onChange={(e) =>
              rotateItem(
                selectedId,
                selectedType,
                Number(e.target.value) - rotation,
              )
            }
            className="w-full accent-[color:var(--garden-accent)]"
          />
          <span className="garden-font-mono w-10 text-right text-xs text-[color:var(--garden-text)]">
            {Math.round(rotation)}°
          </span>
        </div>
      </label>

      {selectedType === "plant" && (
        <>
          <SectionTitle>Plant Data</SectionTitle>
          {scoville != null && (
            <Row label="Scoville">
              {scoville >= 1_000_000
                ? `${(scoville / 1_000_000).toFixed(1)}M+`
                : scoville.toLocaleString()}
            </Row>
          )}
          {cat && (
            <>
              <Row label="Spacing">
                {Math.round(metersToInches(cat.spacing))}" · {cat.spacing}m
              </Row>
              <Row label="Sun">
                {cat.sunRequirement === "full"
                  ? "Full Sun"
                  : cat.sunRequirement === "partial"
                    ? "Partial"
                    : "Shade"}
              </Row>
              <Row label="Water">
                {cat.waterNeed.charAt(0).toUpperCase() + cat.waterNeed.slice(1)}
              </Row>
              {cat.daysToHarvest != null && (
                <Row label="Days to Harvest">{cat.daysToHarvest}</Row>
              )}
              <Row label="Mature Size">
                {cat.matureHeight}m H · {cat.matureWidth}m W
              </Row>
            </>
          )}

          {(companions.length > 0 || antagonists.length > 0) && (
            <>
              <SectionTitle>Companions</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {companions.map((c) => (
                  <span
                    key={c!.id}
                    className="rounded-full bg-[color:var(--garden-accent)]/15 px-2 py-0.5 text-[11px] text-[color:var(--garden-accent)]"
                  >
                    ✓ {c!.name}
                  </span>
                ))}
                {antagonists.map((a) => (
                  <span
                    key={a!.id}
                    className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-400"
                  >
                    ✗ {a!.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {!readOnly && (
        <div className={cn("mt-4 flex gap-2")}>
          <button
            type="button"
            onClick={() => duplicateItem(selectedId, selectedType)}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[color:var(--garden-border)] bg-[color:var(--garden-surface-raised)] py-2 text-xs text-[color:var(--garden-text)] hover:border-[color:var(--garden-accent)]"
          >
            <Copy className="h-4 w-4" /> Duplicate
          </button>
          <button
            type="button"
            onClick={() => deleteItem(selectedId, selectedType, true)}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 py-2 text-xs text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </aside>
  );
}
