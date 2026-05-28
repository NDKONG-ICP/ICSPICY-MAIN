import { Button } from "@/components/ui/button";
import { calculateGardenCost, formatUsd } from "@/lib/garden-cost";
import type { GardenDesign } from "@/lib/garden-types";
import { ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

type Props = {
  design: GardenDesign;
  yieldLbsMax: number;
  onAddPeppersToCart?: () => void;
};

export function CostCalculatorPanel({ design, yieldLbsMax, onAddPeppersToCart }: Props) {
  const cost = useMemo(() => calculateGardenCost(design, yieldLbsMax), [design, yieldLbsMax]);
  const pepperLines = cost.plants.filter((p) => p.isIcSpicyPepper);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 text-xs">
      <h3 className="font-semibold text-sm">Cost breakdown (est.)</h3>
      <div className="max-h-32 overflow-auto space-y-1">
        {cost.plants.slice(0, 8).map((p) => (
          <div key={p.label} className="flex justify-between gap-2">
            <span className="truncate">{p.qty}× {p.label}</span>
            <span>{formatUsd(p.qty * p.unitCents)}</span>
          </div>
        ))}
        {cost.structures.map((s) => (
          <div key={s.label} className="flex justify-between gap-2 text-muted-foreground">
            <span>{s.qty}× {s.label}</span>
            <span>{formatUsd(s.qty * s.unitCents)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 pt-2 space-y-1">
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatUsd(cost.totalCents)}</span>
        </div>
        {cost.costPerLbYear1 != null && (
          <p className="text-muted-foreground">
            ~${cost.costPerLbYear1.toFixed(2)}/lb (yr 1) → ~${cost.costPerLbYear3?.toFixed(2)}/lb (yr 3+)
          </p>
        )}
      </div>
      {pepperLines.length > 0 && onAddPeppersToCart && (
        <Button size="sm" className="w-full" onClick={() => {
          onAddPeppersToCart();
          toast.success("IC SPICY peppers added to cart (where available)");
        }}>
          <ShoppingCart className="h-4 w-4 mr-1" /> Add IC SPICY plants to cart
        </Button>
      )}
    </div>
  );
}
