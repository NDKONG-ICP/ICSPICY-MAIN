import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "pepper-patch-onboarding-done";

const STEPS = [
  {
    title: "Welcome to Pepper Patch 🌶️",
    body: "Grow rare heat and harvest your legacy. Let's plant your first pepper!",
  },
  {
    title: "Pick a Plot",
    body: "Tap an empty plot to choose a variety and optional companion plant.",
  },
  {
    title: "Care on Time",
    body: "Water 💧, Nutrients 🌿, and Light ☀️ when indicators appear — quality drives SHU.",
  },
  {
    title: "Harvest Small Batches",
    body: "Fruiting plants yield SHU batches. Heat Reserve unlocks varieties and upgrades.",
  },
  {
    title: "Learn for Real",
    body: "Each variety links to Pepperpedia growing guides — bridge game to nursery.",
  },
  {
    title: "Soil Prep",
    body: "Empty plots need soil prep first — compost, microbes, and mulch hire the workforce under your roots.",
  },
  {
    title: "Weather & Seasons",
    body: "Rain wets the bed; storms pause care. Mulch protects biology. Watch the season dial and plan between windows.",
  },
];

export function PepperPatchOnboarding({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) setOpen(true);
  }, []);

  if (!open) return null;
  const current = STEPS[step]!;

  const finish = () => {
    localStorage.setItem(TOUR_KEY, "1");
    setOpen(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div className="absolute bottom-8 left-1/2 w-[min(420px,92vw)] -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-card p-4 shadow-2xl">
        <p className="mb-1 text-xs text-emerald-400">
          Step {step + 1} of {STEPS.length}
        </p>
        <h3 className="mb-2 font-display font-bold">{current.title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{current.body}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={finish} data-ocid="pepper-patch-tour-skip">
            Skip
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} data-ocid="pepper-patch-tour-next">
              Next
            </Button>
          ) : (
            <Button size="sm" onClick={finish} data-ocid="pepper-patch-tour-done">
              Start Growing!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
