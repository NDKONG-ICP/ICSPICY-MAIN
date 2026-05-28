import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GardenDesign } from "@/lib/garden-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designs: GardenDesign[];
  onLoad: (design: GardenDesign) => void;
  onNew: () => void;
};

export function LoadDesignDialog({
  open,
  onOpenChange,
  designs,
  onLoad,
  onNew,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Load saved design</DialogTitle>
        </DialogHeader>
        <Button size="sm" variant="outline" className="w-full mb-3" onClick={onNew}>
          New blank plot…
        </Button>
        <ScrollArea className="max-h-[50vh]">
          {designs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No saved designs yet. Save your first layout from the toolbar.
            </p>
          ) : (
            <div className="space-y-2 pr-2">
              {designs.map((d) => (
                <button
                  key={d.id ?? d.name}
                  type="button"
                  className="w-full rounded-lg border border-border bg-card p-3 text-left hover:border-primary/40 transition-smooth"
                  onClick={() => {
                    onLoad(d);
                    onOpenChange(false);
                  }}
                >
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {d.plants.length} plants · {d.structures.length} structures
                    {d.isPublic ? " · public" : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
