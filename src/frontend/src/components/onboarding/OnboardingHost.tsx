import { OnboardingCoach } from "@/components/onboarding/OnboardingCoach";
import { Button } from "@/components/ui/button";
import {
  detectInAppBrowser,
  dismissInAppBrowserTip,
  hasSeenWelcome,
  isInAppBrowserDismissed,
  isStandaloneDisplay,
  markWelcomeSeen,
  ONBOARDING_EVENT,
  openOnboarding,
  type OnboardingGuide,
} from "@/lib/onboarding";
import { ExternalLink, HelpCircle, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

export function OnboardingHost() {
  const [guide, setGuide] = useState<OnboardingGuide | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [showInApp, setShowInApp] = useState(false);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ guide: OnboardingGuide }>).detail;
      if (detail?.guide === "homescreen" || detail?.guide === "signin") {
        setGuide(detail.guide);
      }
    };
    window.addEventListener(ONBOARDING_EVENT, onEvent);
    return () => window.removeEventListener(ONBOARDING_EVENT, onEvent);
  }, []);

  useEffect(() => {
    if (isStandaloneDisplay()) return;
    if (!hasSeenWelcome()) {
      const t = window.setTimeout(() => setWelcomeOpen(true), 900);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (detectInAppBrowser() && !isInAppBrowserDismissed()) {
      setShowInApp(true);
    }
  }, []);

  return (
    <>
      {showInApp ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[920] border-t border-amber-500/40 bg-[#1a1208]/97 p-3 shadow-2xl backdrop-blur-md sm:bottom-4 sm:inset-x-auto sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-xl sm:border"
          data-ocid="inapp-browser-tip"
        >
          <div className="flex items-start gap-2">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-white">Open in Safari or Chrome</p>
              <p className="mt-0.5 text-xs text-white/70 leading-relaxed">
                Facebook / Instagram browsers block Add to Home Screen and often
                break sign-in. Tap ··· → Open in browser, then come back.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-500/40 text-amber-100"
                  onClick={() => openOnboarding("homescreen")}
                >
                  How to install
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-500/40 text-amber-100"
                  onClick={() => openOnboarding("signin")}
                >
                  How to sign in
                </Button>
              </div>
            </div>
            <button
              type="button"
              className="text-white/40 hover:text-white"
              aria-label="Dismiss"
              onClick={() => {
                dismissInAppBrowserTip();
                setShowInApp(false);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {welcomeOpen ? (
        <div
          className="fixed inset-0 z-[910] flex items-end justify-center bg-black/55 p-4 sm:items-center"
          data-ocid="onboarding-welcome"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">New here?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Two things growers ask most — tap either for a quick animated
              walkthrough.
            </p>
            <div className="mt-4 grid gap-2">
              <Button
                type="button"
                className="bg-primary justify-start gap-2"
                onClick={() => {
                  markWelcomeSeen();
                  setWelcomeOpen(false);
                  openOnboarding("homescreen");
                }}
              >
                <Smartphone className="h-4 w-4" />
                Add to Home Screen
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start gap-2"
                onClick={() => {
                  markWelcomeSeen();
                  setWelcomeOpen(false);
                  openOnboarding("signin");
                }}
              >
                Sign in (Connect)
              </Button>
              <button
                type="button"
                className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  markWelcomeSeen();
                  setWelcomeOpen(false);
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {guide ? (
        <OnboardingCoach
          guide={guide}
          open
          onOpenChange={(open) => {
            if (!open) setGuide(null);
          }}
        />
      ) : null}
    </>
  );
}

/** Compact help triggers for header / footer / pages. */
export function OnboardingHelpLinks({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${className}`}>
      <button
        type="button"
        className="text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
        onClick={() => openOnboarding("homescreen")}
        data-ocid="help-homescreen"
      >
        Add to Home Screen
      </button>
      <button
        type="button"
        className="text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
        onClick={() => openOnboarding("signin")}
        data-ocid="help-signin"
      >
        How to sign in
      </button>
    </div>
  );
}
