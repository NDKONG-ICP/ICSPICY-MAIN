import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAddVariety,
  useNftPoolStatus,
  useVarieties,
} from "../hooks/useNims";

export function AdminNimsPanel() {
  const { data: varieties = [], isLoading } = useVarieties();
  const { data: pool } = useNftPoolStatus();
  const addVariety = useAddVariety();
  const [form, setForm] = useState({
    name: "",
    species: "Capsicum chinense",
    scovilleMin: "100000",
    scovilleMax: "2000000",
    description: "",
  });

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-2">NFT Plant Pool</h3>
        {pool ? (
          <p className="text-sm text-muted-foreground">
            {pool.available.toString()} / {pool.total.toString()} non-PepperHead
            NFTs available for plant assignment
          </p>
        ) : (
          <Skeleton className="h-6 w-48" />
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Pepper Varieties</h3>
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : varieties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No varieties yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {varieties.map((v) => (
              <li
                key={v.id.toString()}
                className="flex justify-between border-b border-border py-2"
              >
                <span>
                  <strong>{v.name}</strong> — {v.species}
                </span>
                <span className="text-muted-foreground">
                  {v.scovilleMin.toString()}–{v.scovilleMax.toString()} SHU
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-border rounded-lg p-4 space-y-3 max-w-md">
        <h4 className="font-medium">Add Variety</h4>
        <Input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Input
          placeholder="Species"
          value={form.species}
          onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Scoville min</Label>
            <Input
              value={form.scovilleMin}
              onChange={(e) =>
                setForm((f) => ({ ...f, scovilleMin: e.target.value }))
              }
            />
          </div>
          <div>
            <Label className="text-xs">Scoville max</Label>
            <Input
              value={form.scovilleMax}
              onChange={(e) =>
                setForm((f) => ({ ...f, scovilleMax: e.target.value }))
              }
            />
          </div>
        </div>
        <Textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
        <Button
          disabled={!form.name || addVariety.isPending}
          onClick={async () => {
            await addVariety.mutateAsync({
              name: form.name,
              species: form.species,
              scovilleMin: Number(form.scovilleMin),
              scovilleMax: Number(form.scovilleMax),
              description: form.description,
            });
            toast.success("Variety added");
            setForm({
              name: "",
              species: "Capsicum chinense",
              scovilleMin: "100000",
              scovilleMax: "2000000",
              description: "",
            });
          }}
        >
          {addVariety.isPending && (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          )}
          Add Variety
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Full inventory management is in the{" "}
        <a href="/nims" className="text-primary underline">
          NIMS Dashboard
        </a>
        .
      </p>
    </div>
  );
}
