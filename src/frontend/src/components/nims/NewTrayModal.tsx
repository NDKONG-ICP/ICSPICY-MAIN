import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewTrayModal({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New germination tray</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="tray-name">Tray name</Label>
          <Input
            id="tray-name"
            placeholder="Spring 2026 · Bench A"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || isPending}
            onClick={() => {
              onSubmit(name.trim());
              setName("");
            }}
          >
            {isPending ? "Creating…" : "Create tray"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
