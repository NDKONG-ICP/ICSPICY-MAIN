import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  detectMobilePlatform,
  type OnboardingGuide,
  openOnboarding,
} from "@/lib/onboarding";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, ChevronRight, Share, Smartphone, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import "./onboarding-coach.css";

type Step = {
  title: string;
  body: string;
  /** Visual variant for the phone mock highlight */
  scene: "safari-share" | "share-sheet" | "add-home" | "menu" | "connect" | "ii" | "done";
};

function homescreenSteps(platform: ReturnType<typeof detectMobilePlatform>): Step[] {
  if (platform === "android") {
    return [
      {
        title: "Open in Chrome",
        body: "Use Chrome (not Instagram or Facebook’s in-app browser). Go to icspicy.app.",
        scene: "safari-share",
      },
      {
        title: "Open the browser menu",
        body: "Tap the ⋮ (three dots) in Chrome’s toolbar.",
        scene: "share-sheet",
      },
      {
        title: "Install / Add to Home screen",
        body: "Choose “Install app” or “Add to Home screen”, then confirm.",
        scene: "add-home",
      },
      {
        title: "Launch like an app",
        body: "Find the IC SPICY icon on your home screen. You’re set.",
        scene: "done",
      },
    ];
  }
  // iOS + desktop fallback use Safari-style Share → Add to Home Screen
  return [
    {
      title: "Open in Safari",
      body: "On iPhone, open icspicy.app in Safari (not the Facebook or Instagram browser).",
      scene: "safari-share",
    },
    {
      title: "Tap Share",
      body: "Tap the Share icon (square with an arrow pointing up) in Safari’s bar.",
      scene: "safari-share",
    },
    {
      title: "Add to Home Screen",
      body: "Scroll the share sheet and tap “Add to Home Screen”, then tap Add.",
      scene: "add-home",
    },
    {
      title: "Done",
      body: "IC SPICY appears on your home screen — tap it anytime like a native app.",
      scene: "done",
    },
  ];
}

const SIGNIN_STEPS: Step[] = [
  {
    title: "Open the menu",
    body: "On your phone, tap the ☰ menu (top right). On larger screens, use Connect in the header.",
    scene: "menu",
  },
  {
    title: "Tap Connect",
    body: "Tap the red Connect button. That starts sign-in for IC SPICY.",
    scene: "connect",
  },
  {
    title: "Internet Identity",
    body: "A secure Internet Identity window opens. You can often continue with Google, Apple, or a device passkey — whatever II offers on your phone.",
    scene: "ii",
  },
  {
    title: "You’re in",
    body: "After approving, you’ll return to IC SPICY signed in. Wallet Connect (OISY) is separate — that’s for payments later.",
    scene: "done",
  },
];

function PhoneScene({ scene }: { scene: Step["scene"] }) {
  return (
    <div className="ob-phone" aria-hidden>
      <div className="ob-phone-notch" />
      <div className="ob-phone-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="ob-scene"
          >
            {(scene === "safari-share" || scene === "share-sheet") && (
              <>
                <div className="ob-url-bar">
                  <span>icspicy.app</span>
                  <motion.span
                    className={`ob-share-btn ${scene === "safari-share" ? "ob-pulse" : ""}`}
                    animate={scene === "safari-share" ? { scale: [1, 1.12, 1] } : undefined}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                  >
                    <Share className="w-3.5 h-3.5" />
                  </motion.span>
                </div>
                <div className="ob-hero-mini">IC SPICY</div>
                {scene === "share-sheet" && (
                  <div className="ob-sheet">
                    <div className="ob-sheet-row muted">Copy</div>
                    <div className="ob-sheet-row muted">Bookmark</div>
                    <div className="ob-sheet-row ob-pulse highlight">
                      + Add to Home Screen
                    </div>
                  </div>
                )}
              </>
            )}
            {scene === "add-home" && (
              <>
                <div className="ob-url-bar">
                  <span>icspicy.app</span>
                  <Share className="w-3.5 h-3.5 opacity-50" />
                </div>
                <div className="ob-sheet tall">
                  <div className="ob-sheet-row muted">Create QR Code</div>
                  <div className="ob-sheet-row muted">Find on Page</div>
                  <motion.div
                    className="ob-sheet-row highlight ob-pulse"
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    + Add to Home Screen
                  </motion.div>
                  <div className="ob-sheet-row muted">Add to Quick Note</div>
                </div>
              </>
            )}
            {scene === "menu" && (
              <>
                <div className="ob-app-header">
                  <span className="ob-brand">IC SPICY</span>
                  <motion.span
                    className="ob-burger ob-pulse"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.3 }}
                  >
                    ☰
                  </motion.span>
                </div>
                <div className="ob-menu-list">
                  <div>Home</div>
                  <div>Shop</div>
                  <div>Community Garden</div>
                  <div>Winter Grow Challenge</div>
                </div>
              </>
            )}
            {scene === "connect" && (
              <>
                <div className="ob-app-header">
                  <span className="ob-brand">IC SPICY</span>
                  <span>✕</span>
                </div>
                <div className="ob-menu-list dim">
                  <div>Home</div>
                  <div>Shop</div>
                  <div>…</div>
                </div>
                <motion.div
                  className="ob-connect-fab ob-pulse"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  Connect
                </motion.div>
              </>
            )}
            {scene === "ii" && (
              <div className="ob-ii">
                <p className="ob-ii-title">Internet Identity</p>
                <p className="ob-ii-sub">Continue with</p>
                <div className="ob-ii-btns">
                  <span className="ob-pulse">Google</span>
                  <span>Apple</span>
                  <span>Passkey</span>
                </div>
              </div>
            )}
            {scene === "done" && (
              <div className="ob-done">
                <div className="ob-home-icon">🌶️</div>
                <p>IC SPICY</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function OnboardingCoach({
  guide,
  open,
  onOpenChange,
}: {
  guide: OnboardingGuide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const platform = useMemo(() => detectMobilePlatform(), []);
  const { login, isAuthenticated } = useAuth();
  const steps =
    guide === "homescreen" ? homescreenSteps(platform) : SIGNIN_STEPS;
  const [step, setStep] = useState(0);
  const current = steps[step]!;
  const last = step >= steps.length - 1;

  const title =
    guide === "homescreen"
      ? "Add IC SPICY to your Home Screen"
      : "Sign in with Connect";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setStep(0);
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="ob-dialog max-w-md gap-0 overflow-hidden border-border bg-card p-0"
        data-ocid={`onboarding-${guide}`}
      >
        <DialogHeader className="space-y-1 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            {guide === "homescreen" ? (
              <Smartphone className="w-5 h-5 text-primary" />
            ) : (
              <UserRound className="w-5 h-5 text-primary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {guide === "signin"
              ? "App login uses Internet Identity (not a separate Google button inside IC SPICY)."
              : platform === "android"
                ? "Works best in Chrome."
                : "Works best in Safari on iPhone."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-4">
          <PhoneScene scene={current.scene} />
        </div>

        <div className="space-y-3 px-5 pb-5 pt-3">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i === step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <h3 className="font-display font-bold text-base text-foreground">
            Step {step + 1}: {current.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {current.body}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              Back
            </Button>
            {!last ? (
              <Button
                type="button"
                size="sm"
                className="bg-primary flex-1"
                onClick={() => setStep((s) => s + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            ) : guide === "signin" && !isAuthenticated ? (
              <Button
                type="button"
                size="sm"
                className="bg-primary flex-1"
                onClick={() => {
                  onOpenChange(false);
                  login();
                }}
              >
                Connect now
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="bg-primary flex-1"
                onClick={() => onOpenChange(false)}
              >
                Got it
              </Button>
            )}
          </div>
          {guide === "homescreen" && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline w-full text-center"
              onClick={() => {
                onOpenChange(false);
                openOnboarding("signin");
              }}
            >
              How do I sign in?
            </button>
          )}
          {guide === "signin" && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline w-full text-center"
              onClick={() => {
                onOpenChange(false);
                openOnboarding("homescreen");
              }}
            >
              How do I add this to my Home Screen?
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
