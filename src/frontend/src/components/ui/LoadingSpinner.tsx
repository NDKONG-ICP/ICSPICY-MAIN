import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-[3px]",
};

export function LoadingSpinner({
  size = "md",
  className,
  label = "Loading…",
}: LoadingSpinnerProps) {
  return (
    <span
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <span
        role="img"
        aria-hidden="true"
        className={cn(
          "rounded-full border-primary/20 border-t-primary animate-spin block",
          sizeClasses[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground text-sm animate-pulse">Loading…</p>
      </div>
    </div>
  );
}
