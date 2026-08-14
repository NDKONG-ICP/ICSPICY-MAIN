import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, Loader2, Radio, Tag } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { NfcTagLinkModal } from "@/components/nims/NfcTagLinkModal";
import {
  NfcIphoneProgramChecklist,
  NfcIphoneTutorialDialog,
  nextPlantNfcReminder,
  useNfcIphoneTutorialGate,
} from "@/components/admin/NfcIphoneTutorial";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { VarietyPicker } from "@/components/nims/VarietyPicker";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useWeather } from "@/hooks/useWeather";
import { useNimsLocation } from "@/hooks/useNimsLocation";
import {
  useAddPlant,
  useAddVariety,
  useListPlantForSale,
  useVarieties,
} from "@/hooks/useNims";
import {
  useAddNimsPlantPhoto,
  useAddWeatherSnapshot,
} from "@/hooks/useNimsDashboard";
import { useUploadNimsPhoto } from "@/hooks/useNimsPhotoUpload";
import { plantNfcUrl } from "@/lib/plant-nfc-url";
import { weatherDataToSnapshot } from "@/lib/weather-snapshot";
import { webNfcSupported, writePlantUrlToNfcTag } from "@/lib/web-nfc";
import type {
  ContainerSize,
  PlantStage,
} from "@/declarations/backend.did";

const STEPS = ["Photo", "Plant", "Program tag"] as const;

const CONTAINERS: ReadonlyArray<{ label: string; size: ContainerSize }> = [
  { label: "1 gallon pot", size: { Gal1New: null } },
  { label: "3 gallon pot", size: { Gal3New: null } },
  { label: "5 gallon bucket", size: { Gal5Bucket: null } },
  { label: "4″ liner", size: { Pot4Inch: null } },
  { label: "6″ liner", size: { Pot6Inch: null } },
  { label: "In ground bed", size: { InGround: null } },
];

const STAGES: ReadonlyArray<{ label: string; stage: PlantStage }> = [
  { label: "Seedling", stage: { Seedling: null } },
  { label: "Mature", stage: { Mature: null } },
];

export default function AdminNfcAssignPage() {
  usePageTitle("Assign NFC");

  const { data: varieties = [] } = useVarieties();
  const addVariety = useAddVariety();
  const addPlant = useAddPlant();
  const uploadPhoto = useUploadNimsPhoto();
  const addPlantPhoto = useAddNimsPlantPhoto();
  const addWeatherSnapshot = useAddWeatherSnapshot();
  const listForSale = useListPlantForSale();
  const nimsLocation = useNimsLocation();
  const { data: weather } = useWeather(
    nimsLocation.coordinates.lat,
    nimsLocation.coordinates.lng,
  );

  const [step, setStep] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [varietyId, setVarietyId] = useState("");
  const [stageKey, setStageKey] = useState("Seedling");
  const [containerIdx, setContainerIdx] = useState("0");
  const [listEnabled, setListEnabled] = useState(false);
  const [priceCents, setPriceCents] = useState("2500");
  const [plantId, setPlantId] = useState<bigint | null>(null);
  const [nftTokenId, setNftTokenId] = useState<bigint | null>(null);
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [writingNfc, setWritingNfc] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const stage = useMemo(
    () => STAGES.find((s) => s.label === stageKey)?.stage ?? { Seedling: null },
    [stageKey],
  );
  const container =
    CONTAINERS[Number(containerIdx)]?.size ?? ({ Gal1New: null } as ContainerSize);
  const tagUrl = plantId != null ? plantNfcUrl(plantId, { trackNfc: true }) : "";
  const canWebNfc = webNfcSupported();
  const { tutorialOpen, setTutorialOpen } = useNfcIphoneTutorialGate();

  useEffect(() => {
    if (!tagUrl) {
      setQrDataUrl(null);
      return;
    }
    void QRCode.toDataURL(tagUrl, { margin: 1, width: 180 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [tagUrl]);

  const resetWizard = useCallback(() => {
    setStep(0);
    setPhotoFile(null);
    setPhotoPreview(null);
    setVarietyId("");
    setStageKey("Seedling");
    setContainerIdx("0");
    setListEnabled(false);
    setPriceCents("2500");
    setPlantId(null);
    setNftTokenId(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    const reminder = nextPlantNfcReminder();
    if (reminder) {
      toast.info(reminder.title, { description: reminder.description, duration: reminder.duration });
    }
  }, []);

  const onPhotoSelected = (file: File | null) => {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setStep(1);
  };

  const createPlantRecord = async () => {
    if (!varietyId) {
      toast.error("Select a variety");
      return;
    }
    try {
      const result = await addPlant.mutateAsync({
        varietyId: BigInt(varietyId),
        stage,
        container,
      });
      const pid = result.plantId;
      setPlantId(pid);
      setNftTokenId(result.nftTokenId);

      if (photoFile) {
        const path = await uploadPhoto.mutateAsync({ plantId: pid, file: photoFile });
        await addPlantPhoto.mutateAsync({
          plantId: pid,
          path,
          caption: "Nursery inventory photo",
        });
      }

      if (weather) {
        await addWeatherSnapshot.mutateAsync({
          plantId: pid,
          snapshot: {
            ...weatherDataToSnapshot(weather),
            source: `activation|${weatherDataToSnapshot(weather).source}`,
          },
        });
      }

      if (listEnabled) {
        const cents = BigInt(priceCents.replace(/\D/g, "") || "0");
        await listForSale.mutateAsync({ plantId: pid, priceCents: cents });
      }

      setStep(2);
      toast.success(`Plant #${pid.toString()} · NFT #${result.nftTokenId.toString()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create plant");
    }
  };

  const writeNfc = async () => {
    if (!tagUrl) return;
    setWritingNfc(true);
    try {
      await writePlantUrlToNfcTag(tagUrl);
      toast.success("Tag programmed!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "NFC write failed");
    } finally {
      setWritingNfc(false);
    }
  };

  return (
    <div className="container max-w-lg py-8 px-4 pb-24" data-ocid="admin-nfc-assign">
      <div className="mb-6">
        <Link
          to="/admin"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Admin
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold flex items-center gap-2">
          <Tag className="size-6 text-primary" />
          Assign NFC tag
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Walk the benches: photo → plant → program NTAG215.
        </p>
        {!canWebNfc && (
          <Button
            type="button"
            variant="link"
            className="mt-1 h-auto p-0 text-xs"
            onClick={() => setTutorialOpen(true)}
          >
            Show iPhone NFC tutorial
          </Button>
        )}
      </div>

      <NfcIphoneTutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />

      <div className="mb-6 flex gap-1">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            title={label}
          />
        ))}
      </div>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPhotoSelected(e.target.files?.[0] ?? null)}
            />
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Plant preview"
                className="aspect-square w-full rounded-xl object-cover"
              />
            ) : (
              <button
                type="button"
                className="flex aspect-square w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground"
                onClick={() => photoInputRef.current?.click()}
              >
                <span className="text-4xl mb-2">📷</span>
                Tap to capture plant photo
              </button>
            )}
            <Button
              type="button"
              className="w-full"
              onClick={() => photoInputRef.current?.click()}
            >
              {photoPreview ? "Retake photo" : "Open camera"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs"
              onClick={() => setStep(1)}
            >
              Skip photo for now
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Enter plant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Variety</Label>
              <VarietyPicker
                idPrefix="nfc-assign"
                varieties={varieties}
                value={varietyId}
                onChange={setVarietyId}
                onCreateVariety={async (name, species) => {
                  const id = await addVariety.mutateAsync({
                    name,
                    species,
                    scovilleMin: 0,
                    scovilleMax: 0,
                    description: "",
                  });
                  return id;
                }}
                isCreating={addVariety.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={stageKey} onValueChange={setStageKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.label} value={s.label}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Container</Label>
              <Select value={containerIdx} onValueChange={setContainerIdx}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTAINERS.map((c, i) => (
                    <SelectItem key={c.label} value={String(i)}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="list-toggle">List for sale</Label>
              <Switch
                id="list-toggle"
                checked={listEnabled}
                onCheckedChange={setListEnabled}
              />
            </div>
            {listEnabled && (
              <div className="space-y-2">
                <Label>Price (cents)</Label>
                <Input
                  inputMode="numeric"
                  value={priceCents}
                  onChange={(e) => setPriceCents(e.target.value)}
                />
              </div>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={addPlant.isPending || !varietyId}
              onClick={() => void createPlantRecord()}
            >
              {addPlant.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating plant + NFT…
                </>
              ) : (
                <>
                  Assign NFT & start provenance
                  <ChevronRight className="ml-1 size-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && plantId != null && (
        <>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="size-4 text-emerald-500" />
              Provenance live
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Plant{" "}
              <Link
                to="/plant/$plantId"
                params={{ plantId: plantId.toString() }}
                className="text-primary underline"
              >
                #{plantId.toString()}
              </Link>
            </p>
            {nftTokenId != null && (
              <p>NFT #{nftTokenId.toString()} · weather at activation recorded</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Program NTAG215</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canWebNfc && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="mb-2 text-xs font-semibold text-foreground">
                  iPhone — program this sticker
                </p>
                <NfcIphoneProgramChecklist compact />
              </div>
            )}
            {qrDataUrl && (
              <img src={qrDataUrl} alt="Tag QR" className="mx-auto rounded-lg" />
            )}
            <p className="break-all font-mono text-[10px] text-muted-foreground">
              {tagUrl}
            </p>
            {canWebNfc ? (
              <Button
                type="button"
                className="w-full"
                disabled={writingNfc}
                onClick={() => void writeNfc()}
              >
                {writingNfc ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Hold to blank tag…
                  </>
                ) : (
                  <>
                    <Radio className="mr-2 size-4" />
                    Write to NFC tag
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setNfcModalOpen(true)}
              >
                Copy URL / NFC Tools steps
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  void navigator.clipboard.writeText(tagUrl);
                  toast.success("URL copied");
                }}
              >
                Copy URL
              </Button>
              <Button type="button" className="flex-1" onClick={resetWizard}>
                Next plant
              </Button>
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {plantId != null && (
        <NfcTagLinkModal
          open={nfcModalOpen}
          onOpenChange={setNfcModalOpen}
          plantId={plantId}
        />
      )}
    </div>
  );
}
