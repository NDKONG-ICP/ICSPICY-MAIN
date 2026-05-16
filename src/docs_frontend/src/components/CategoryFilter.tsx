import type { CategoryWithCount } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface CategoryFilterProps {
  categories: CategoryWithCount[];
  active: string | null;
  total: number;
  onChange: (id: string | null) => void;
}

export function CategoryFilter({
  categories,
  active,
  total,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterChip
        label="All"
        count={total}
        isActive={active === null}
        onClick={() => onChange(null)}
      />
      {categories.map((cat) => (
        <FilterChip
          key={cat.id}
          label={cat.name}
          count={cat.count}
          isActive={active === cat.id}
          onClick={() => onChange(cat.id)}
        />
      ))}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, isActive, onClick }: FilterChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={cn("chip", isActive && "chip-active")}
    >
      <span>{label}</span>
      <span className="ml-1 font-mono text-[10px] opacity-70">({count})</span>
    </motion.button>
  );
}
