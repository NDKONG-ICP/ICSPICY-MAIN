import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/garden-types";
import {
  ArrowLeft,
  Download,
  Grid3x3,
  MapPin,
  Menu,
  Ruler,
  Save,
  Sliders,
  Sparkles,
  Lock,
} from "lucide-react";

type Props = {
  title: string;
  onBack: () => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  gridOn: boolean;
  onToggleGrid: () => void;
  measureActive?: boolean;
  onToggleMeasure?: () => void;
  onLocation: () => void;
  onSave: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  canSave?: boolean;
  onExport: () => void;
  onAi: () => void;
  hasAiGeneration: boolean;
  onOpenProTools: () => void;
};

function TopButton({
  active,
  onClick,
  title,
  children,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
        "text-[color:var(--garden-text-muted)] hover:text-[color:var(--garden-text)] hover:bg-white/5",
        active &&
          "bg-[color:var(--garden-accent)]/15 text-[color:var(--garden-accent)] hover:bg-[color:var(--garden-accent)]/20 hover:text-[color:var(--garden-accent)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * 48px top bar — logo mark + title, view toggle, tool toggles, save/export/AI.
 */
export function GardenTopBar({
  title,
  onBack,
  viewMode,
  onViewModeChange,
  gridOn,
  onToggleGrid,
  measureActive,
  onToggleMeasure,
  onLocation,
  onSave,
  isSaving,
  isDirty,
  canSave = true,
  onExport,
  onAi,
  hasAiGeneration,
  onOpenProTools,
}: Props) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[color:var(--garden-border)] bg-[#0d0d10] px-3">
      {/* Mobile: ☰ menu opens the tools drawer */}
      <button
        type="button"
        title="Menu"
        aria-label="Open menu"
        onClick={onOpenProTools}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[color:var(--garden-text-muted)] hover:bg-white/5 hover:text-[color:var(--garden-text)] sm:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo + title */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg leading-none">🌶</span>
        <span className="garden-font-display hidden truncate text-sm font-bold text-white sm:block">
          IC SPICY Garden
        </span>
      </div>

      <TopButton title="Back" onClick={onBack} className="hidden sm:flex">
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden md:inline">Back</span>
      </TopButton>

      <span
        className="truncate text-xs text-[color:var(--garden-text-muted)] garden-font-mono max-w-[160px]"
        title={title}
      >
        {title}
      </span>

      <div className="mx-1 hidden h-5 w-px bg-[color:var(--garden-border)] sm:block" />

      {/* 2D / 3D pill toggle */}
      <div className="flex overflow-hidden rounded-md border border-[color:var(--garden-border)]">
        {(["2d", "3d"] as ViewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onViewModeChange(m)}
            className={cn(
              "h-8 px-3 text-xs font-semibold uppercase transition-colors",
              viewMode === m
                ? "bg-[color:var(--garden-accent)] text-black"
                : "text-[color:var(--garden-text-muted)] hover:bg-white/5",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mx-1 hidden h-5 w-px bg-[color:var(--garden-border)] sm:block" />

      <TopButton
        title="Toggle grid"
        active={gridOn}
        onClick={onToggleGrid}
        className="hidden sm:flex"
      >
        <Grid3x3 className="h-4 w-4" />
        <span className="hidden lg:inline">Grid</span>
      </TopButton>

      {onToggleMeasure && (
        <TopButton
          title="Measure tool"
          active={measureActive}
          onClick={onToggleMeasure}
          className="hidden sm:flex"
        >
          <Ruler className="h-4 w-4" />
          <span className="hidden lg:inline">Measure</span>
        </TopButton>
      )}

      <TopButton
        title="Change location"
        onClick={onLocation}
        className="hidden sm:flex"
      >
        <MapPin className="h-4 w-4" />
        <span className="hidden lg:inline">Location</span>
      </TopButton>

      <TopButton
        title="Pro tools"
        onClick={onOpenProTools}
        className="hidden sm:flex"
      >
        <Sliders className="h-4 w-4" />
        <span className="hidden lg:inline">Pro</span>
      </TopButton>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2">
        <TopButton
          title="Export plan"
          onClick={onExport}
          className="hidden sm:flex"
        >
          <Download className="h-4 w-4" />
          <span className="hidden md:inline">Export</span>
        </TopButton>

        <button
          type="button"
          title={
            hasAiGeneration
              ? "AI garden generation"
              : "AI generation requires Raven Pro (500K $RAVEN)"
          }
          onClick={onAi}
          className={cn(
            "hidden h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors sm:flex",
            "text-[color:var(--garden-gold)] hover:bg-[color:var(--garden-gold)]/15",
          )}
        >
          {hasAiGeneration ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          <span className="hidden md:inline">AI</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !canSave}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
            "bg-[color:var(--garden-accent)] text-black hover:brightness-110",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving…" : isDirty ? "Save*" : "Save"}
        </button>
      </div>
    </div>
  );
}
