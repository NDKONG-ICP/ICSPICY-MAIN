import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { Sprout } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useUpdateGrowerProfile } from "@/hooks/useBackend";
import { useCoopStatus } from "@/hooks/useCoopStatus";

type Props = {
  onComplete?: () => void;
};

export function GrowerOnboardingWizard({ onComplete }: Props) {
  const { status } = useCoopStatus();
  const update = useUpdateGrowerProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [license, setLicense] = useState("");

  if (!status) return null;

  const finish = async () => {
    try {
      await update.mutateAsync({ name, location, license });
      toast.success("Grower profile saved!");
      onComplete?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    }
  };

  return (
    <Card className="border-emerald-500/30 max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Sprout className="text-emerald-400" /> Founding Grower setup
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Seat #{status.tokenId.toString()} · Step {step + 1} of 3
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 0 && (
          <>
            <Label htmlFor="grower-name">Grower / farm name</Label>
            <Input
              id="grower-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunbelt Peppers LLC"
            />
            <Button disabled={name.trim().length < 2} onClick={() => setStep(1)}>
              Next
            </Button>
          </>
        )}
        {step === 1 && (
          <>
            <Label htmlFor="grower-loc">Location</Label>
            <Input
              id="grower-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Port Charlotte, FL"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)}>Next</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <Label htmlFor="grower-lic">License / FDACS # (optional)</Label>
            <Input
              id="grower-lic"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="Optional regulatory ID"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={update.isPending} onClick={() => void finish()}>
                {update.isPending ? "Saving…" : "Finish & open NIMS"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CoopPitchCard({ isSeatHolder }: { isSeatHolder: boolean }) {
  if (isSeatHolder) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-display font-bold text-emerald-300">🌱 Co-op Grower — Pro tools active</p>
            <p className="text-sm text-muted-foreground mt-1">
              Mint provenance NFTs, generate QR claims, and export agriiTrace data from your plants.
            </p>
          </div>
          <Button asChild variant="outline" className="border-emerald-600/50">
            <Link to="/growers">View directory</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-500/20">
      <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold">Join the IC SPICY Grower Co-op</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Founding seats unlock pro NIMS, on-chain plant provenance, customer QR claims, and a public grower listing — built for regenerative pepper farms and nurseries.
          </p>
        </div>
        <Button asChild>
          <Link to="/marketplace">Become a Founding Grower →</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
