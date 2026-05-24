import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { PlantStage } from "../../backend";
import { plantStageEmoji, variantToString } from "@/lib/candid-display";

const stageBadgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold font-display uppercase tracking-wide border",
  {
    variants: {
      stage: {
        [PlantStage.Seed]: "bg-amber-950/40 text-amber-400 border-amber-700/50",
        [PlantStage.Seedling]:
          "bg-emerald-950/40 text-emerald-400 border-emerald-700/50",
        [PlantStage.Mature]: "bg-red-950/40 text-red-400 border-red-700/50",
      },
    },
    defaultVariants: {
      stage: PlantStage.Seed,
    },
  },
);

function normalizePlantStage(stage: unknown): PlantStage {
  const key = variantToString(stage);
  if (key === PlantStage.Seedling || key === "Seedling") return PlantStage.Seedling;
  if (key === PlantStage.Mature || key === "Mature") return PlantStage.Mature;
  return PlantStage.Seed;
}

interface StageBadgeProps extends Omit<
  VariantProps<typeof stageBadgeVariants>,
  "stage"
> {
  stage: unknown;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const label = variantToString(stage);
  const normalized = normalizePlantStage(stage);
  return (
    <span className={cn(stageBadgeVariants({ stage: normalized }), className)}>
      <span>{plantStageEmoji(stage)}</span>
      {label}
    </span>
  );
}
