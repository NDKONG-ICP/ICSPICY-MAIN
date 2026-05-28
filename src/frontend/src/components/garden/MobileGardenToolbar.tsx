import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GardenDesignerState } from "@/hooks/useGardenDesigner";
import type { DesignerMode } from "@/lib/garden-types";
import { Box, Layers, Menu, Undo2 } from "lucide-react";

type Props = {
  designer: GardenDesignerState;
  mode: DesignerMode;
  onMenuOpen: () => void;
};

export function MobileGardenToolbar({ designer, mode, onMenuOpen }: Props) {
  const { design, viewMode, setViewMode, setName, undo, readOnly } = designer;

  return (
    <div className="sm:hidden flex items-center gap-2 border-b border-white/10 bg-card/95 backdrop-blur px-2 py-2 shrink-0">
      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={onMenuOpen}>
        <Menu className="h-5 w-5" />
      </Button>
      <Input
        value={design.name}
        onChange={(e) => setName(e.target.value)}
        disabled={readOnly || mode === "view"}
        className="h-9 flex-1 min-w-0 text-sm font-medium bg-white/5 border-white/10"
      />
      <div className="flex rounded-md border border-white/10 overflow-hidden shrink-0">
        <Button
          type="button"
          size="sm"
          variant={viewMode === "3d" ? "default" : "ghost"}
          className="h-9 rounded-none px-2"
          onClick={() => setViewMode("3d")}
        >
          <Box className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewMode === "2d" ? "default" : "ghost"}
          className="h-9 rounded-none px-2"
          onClick={() => setViewMode("2d")}
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>
      {!readOnly && mode === "edit" && (
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={undo}>
          <Undo2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
