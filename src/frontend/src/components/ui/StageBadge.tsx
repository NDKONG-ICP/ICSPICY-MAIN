import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { PlantStage } from "../../backend";

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

const STAGE_EMOJIS: Record<PlantStage, string> = {
  [PlantStage.Seed]: "🌱",
  [PlantStage.Seedling]: "🌿",
  [PlantStage.Mature]: "🌶️",
};

interface StageBadgeProps extends VariantProps<typeof stageBadgeVariants> {
  stage: PlantStage;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  return (
    <span className={cn(stageBadgeVariants({ stage }), className)}>
      <span>{STAGE_EMOJIS[stage]}</span>
      {stage}
    </span>
  );
}
