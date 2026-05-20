import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Droplets, FlaskConical, Leaf, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { PlantStage as BackendPlantStage } from "../backend";
import { StageBadge } from "../components/ui/StageBadge";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin } from "../hooks/useBackend";
import {
  formatCents,
  nftImageUrl,
  stageLabel,
  unwrapOpt,
  useAddPlantNote,
  usePlantLifecycle,
  useVarieties,
} from "../hooks/useNims";

function fmtTs(ts: bigint | undefined): string {
  if (ts === undefined) return "—";
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlantDetailPage() {
  const { plantId } = useParams({ from: "/plants/$plantId" });
  const id = BigInt(plantId);
  const { data: lc, isLoading } = usePlantLifecycle(id);
  const { data: varieties = [] } = useVarieties();
  const { identity } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const addNote = useAddPlantNote();
  const [noteText, setNoteText] = useState("");

  if (isLoading) return <Skeleton className="h-96 m-8" />;
  if (!lc) {
    return (
      <div className="container py-16 text-center">
        <p>Plant not found.</p>
        <Link to="/nims" className="text-primary underline">
          Back to NIMS
        </Link>
      </div>
    );
  }

  const plant = lc.plant;
  const tokenId = unwrapOpt(lc.nftTokenId);
  const variety = varieties.find((v) => v.id === unwrapOpt(lc.varietyId));
  const callerText = identity?.getPrincipal().toText() ?? "";
  const isOwner =
    isAdmin ||
    plant.created_by.toText() === callerText ||
    unwrapOpt(plant.sold_to)?.toText() === callerText;
  const canEdit = isOwner;

  return (
    <div className="container max-w-5xl py-8 px-4">
      <Link to="/nims" className="inline-flex items-center text-sm text-muted-foreground mb-6 hover:text-primary">
        <ArrowLeft className="w-4 h-4 mr-1" /> NIMS
      </Link>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="rounded-xl overflow-hidden border border-border aspect-square bg-muted">
          <img
            src={nftImageUrl(tokenId)}
            alt={plant.variety}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{plant.variety}</h1>
            {variety && (
              <p className="text-muted-foreground italic">{variety.species}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <StageBadge stage={plant.stage as unknown as BackendPlantStage} />
            {plant.for_sale && (
              <Badge variant="secondary">
                For Sale: {formatCents(unwrapOpt(lc.priceCents))}
              </Badge>
            )}
            {plant.sold && <Badge>Sold</Badge>}
          </div>
          {tokenId !== undefined && (
            <Link
              to="/nft/$tokenId"
              params={{ tokenId: tokenId.toString() }}
              className="text-primary hover:underline text-sm"
            >
              IC SPICY NFT #{tokenId.toString()} →
            </Link>
          )}
          <p className="text-xs text-muted-foreground break-all">
            Owner: {plant.created_by.toText()}
          </p>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lifecycle Timeline</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>Planted: {fmtTs(plant.planting_date)}</p>
              <p>Germinated: {fmtTs(unwrapOpt(plant.germination_date))}</p>
              <p>Transplanted: {fmtTs(unwrapOpt(plant.transplant_date))}</p>
              <p>Sold: {fmtTs(unwrapOpt(lc.soldAt))}</p>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Verified on-chain provenance</p>
              <p className="text-muted-foreground text-xs">
                Lifecycle data stored on the Internet Computer. NFT travels with ownership.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="feeding">Feeding ({lc.feedingLog.length})</TabsTrigger>
          <TabsTrigger value="watering">Watering ({lc.wateringLog.length})</TabsTrigger>
          <TabsTrigger value="pests">Pests ({lc.pestLog.length})</TabsTrigger>
          <TabsTrigger value="photos">Photos ({lc.photos.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({lc.notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-2 text-sm">
          <p>Stage: {stageLabel(plant.stage)}</p>
          {variety && (
            <>
              <p>
                Heat: {variety.scovilleMin.toString()}–{variety.scovilleMax.toString()} SHU
              </p>
              <p>{variety.description}</p>
            </>
          )}
        </TabsContent>

        <TabsContent value="feeding" className="mt-4">
          {lc.feedingLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">No feeding entries yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lc.feedingLog.map((f) => (
                <li key={f.id.toString()} className="border-b border-border pb-2">
                  {fmtTs(f.date)} — {f.product_name} ({f.nutrient_type}) {f.dosage_amount}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="watering" className="mt-4">
          {lc.wateringLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">No watering entries.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lc.wateringLog.map((w, i) => (
                <li key={i} className="border-b border-border pb-2">
                  {fmtTs(w.timestamp)} — {w.amountMl.toString()} ml
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="pests" className="mt-4">
          {lc.pestLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pest issues logged.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lc.pestLog.map((p, i) => (
                <li key={i} className="border-b border-border pb-2">
                  {fmtTs(p.timestamp)} — {p.pestName} ({p.severity})
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          {lc.photos.length === 0 ? (
            <p className="text-muted-foreground text-sm">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {lc.photos.map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noreferrer">
                  <img src={p.url} alt="" className="rounded-lg aspect-square object-cover" />
                </a>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          {lc.notes.map((n, i) => (
            <div key={i} className="text-sm border-l-2 border-primary pl-3">
              <p className="text-muted-foreground text-xs">{fmtTs(n.timestamp)}</p>
              <p>{n.text}</p>
            </div>
          ))}
          {canEdit && (
            <div className="space-y-2 pt-4 border-t border-border">
              <Label>Add note</Label>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <Button
                size="sm"
                disabled={!noteText.trim() || addNote.isPending}
                onClick={async () => {
                  await addNote.mutateAsync({ plantId: id, text: noteText });
                  setNoteText("");
                  toast.success("Note added");
                }}
              >
                Save Note
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {canEdit && (
        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled>
            <FlaskConical className="w-4 h-4 mr-1" /> Log Feeding (use NIMS admin)
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Droplets className="w-4 h-4 mr-1" /> Log Watering
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Leaf className="w-4 h-4 mr-1" /> Log Pest
          </Button>
        </div>
      )}
    </div>
  );
}
