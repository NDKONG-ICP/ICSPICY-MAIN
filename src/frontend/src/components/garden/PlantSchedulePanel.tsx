import { Button } from "@/components/ui/button";
import { STRUCTURE_CATALOG, getPlantById } from "@/lib/garden-plant-catalog";
import { estimateStructureCost } from "@/lib/garden-seasonal";
import { exportPlantScheduleCsv } from "@/lib/garden-smart-data";
import type { GardenDesign } from "@/lib/garden-types";
import { Download } from "lucide-react";
import { useMemo } from "react";

type Props = {
  design: GardenDesign;
};

export function PlantSchedulePanel({ design }: Props) {
  const plantRows = useMemo(() => {
    const groups = new Map<
      string,
      {
        name: string;
        latin: string;
        qty: number;
        spacing: string;
        sun: string;
        water: string;
      }
    >();
    for (const p of design.plants) {
      const key = p.catalogId ?? p.label;
      const cat = p.catalogId ? getPlantById(p.catalogId) : null;
      const prev = groups.get(key);
      if (prev) prev.qty += 1;
      else {
        groups.set(key, {
          name: cat?.name ?? p.label,
          latin: cat?.latinName ?? "",
          qty: 1,
          spacing: cat ? `${Math.round(cat.spacing * 39.37)}"` : "—",
          sun: cat?.sunRequirement ?? "—",
          water: cat?.waterNeed ?? "—",
        });
      }
    }
    return [...groups.values()];
  }, [design.plants]);

  const structureRows = useMemo(() => {
    const groups = new Map<
      string,
      { name: string; size: string; qty: number; cost: number }
    >();
    for (const s of design.structures) {
      const cat = STRUCTURE_CATALOG.find((c) => c.id === s.structureType);
      const key = s.structureType;
      const prev = groups.get(key);
      const cost = estimateStructureCost(s.structureType) ?? 0;
      if (prev) prev.qty += 1;
      else {
        groups.set(key, {
          name: cat?.name ?? s.structureType,
          size: `${s.width.toFixed(1)}×${s.depth.toFixed(1)}m`,
          qty: 1,
          cost,
        });
      }
    }
    return [...groups.values()];
  }, [design.structures]);

  const downloadCsv = () => {
    const csv = exportPlantScheduleCsv(design);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${design.name.replace(/\s+/g, "-")}-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-card/80 p-3 text-xs space-y-3 max-h-64 overflow-auto">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Plant Schedule</p>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={downloadCsv}
        >
          <Download className="h-3 w-3 mr-1" /> CSV
        </Button>
      </div>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-muted-foreground border-b border-white/10">
            <th className="text-left py-1">Name</th>
            <th>Qty</th>
            <th>Spacing</th>
            <th>Sun</th>
          </tr>
        </thead>
        <tbody>
          {plantRows.map((r) => (
            <tr key={r.name} className="border-b border-white/5">
              <td className="py-1">{r.name}</td>
              <td className="text-center">{r.qty}</td>
              <td className="text-center">{r.spacing}</td>
              <td className="text-center capitalize">{r.sun}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {structureRows.length > 0 && (
        <>
          <p className="font-semibold pt-1">Structure Schedule</p>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-muted-foreground border-b border-white/10">
                <th className="text-left py-1">Name</th>
                <th>Qty</th>
                <th>Est.</th>
              </tr>
            </thead>
            <tbody>
              {structureRows.map((r) => (
                <tr key={r.name} className="border-b border-white/5">
                  <td className="py-1">{r.name}</td>
                  <td className="text-center">{r.qty}</td>
                  <td className="text-center">
                    ${(r.cost * r.qty).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
