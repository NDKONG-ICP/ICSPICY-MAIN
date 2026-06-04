import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const TOUR_KEY = "garden-onboarding-done";

const STEPS = [
  {
    title: "Welcome to IC SPICY Garden Designer! 🌶️",
    body: "Design your dream garden with 385 Florida plants.",
    target: null,
  },
  {
    title: "Try AI Design",
    body: "Type what you want and let on-chain SpicyAI lay out your garden.",
    target: "[data-tour=ai-bar]",
  },
  {
    title: "Browse the Catalog",
    body: "Drag plants and structures onto your plot from the sidebar.",
    target: "[data-tour=catalog]",
  },
  {
    title: "Walk Through Your Garden",
    body: "Experience your design in first-person 3D with ambient sound.",
    target: "[data-tour=walk]",
  },
  {
    title: "Save & Share",
    body: "Designs save on the Internet Computer. Share with the community gallery.",
    target: "[data-tour=save]",
  },
];

type Props = { onComplete: () => void };

export function GardenOnboardingTour({ onComplete }: Props) {
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
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[min(420px,92vw)] rounded-xl border border-white/10 bg-card p-4 shadow-2xl pointer-events-auto">
        <p className="text-xs text-primary mb-1">
          Step {step + 1} of {STEPS.length}
        </p>
        <h3 className="font-semibold mb-2">{current.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{current.body}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={finish}>
            Skip
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button size="sm" onClick={finish}>
              Start Designing!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function BadgeToast({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] animate-bounce rounded-lg border border-amber-400/50 bg-amber-950/90 px-4 py-2 text-sm shadow-lg">
      {emoji} Badge unlocked: <strong>{title}</strong>
    </div>
  );
}
