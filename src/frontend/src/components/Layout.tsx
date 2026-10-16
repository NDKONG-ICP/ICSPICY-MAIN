import { Toaster } from "@/components/ui/sonner";
import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { AgeGateHost } from "./compliance/AgeGateHost";
import { CookieConsentBanner } from "./compliance/CookieConsentBanner";
import { useSyncAgeAttestation } from "@/hooks/useSyncAgeAttestation";
import { OnboardingHost } from "./onboarding/OnboardingHost";
import { SpicyAiWidget } from "./SpicyAiWidget";

function ComplianceLayoutExtras() {
  useSyncAgeAttestation();
  return <AgeGateHost />;
}

interface LayoutProps {
  children: ReactNode;
  noFooter?: boolean;
  fullBleed?: boolean;
  mainClassName?: string;
}

export function Layout({
  children,
  noFooter,
  fullBleed,
  mainClassName,
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden max-w-[100vw]">
      <Header />
      <main
        className={[
          "flex-1",
          fullBleed ? "" : "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8",
          mainClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </main>
      {!noFooter && <Footer />}
      <SpicyAiWidget />
      <OnboardingHost />
      <ComplianceLayoutExtras />
      <CookieConsentBanner />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
