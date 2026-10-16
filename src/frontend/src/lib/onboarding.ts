/** Onboarding coach helpers — homescreen install + Connect / Internet Identity. */

export type OnboardingGuide = "homescreen" | "signin";

export const ONBOARDING_EVENT = "icspicy:onboarding";

const LS_SEEN_WELCOME = "icspicy_onboarding_welcome_v1";
const LS_DISMISS_INAPP = "icspicy_dismiss_inapp_browser_v1";

export function openOnboarding(guide: OnboardingGuide) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ONBOARDING_EVENT, { detail: { guide } }),
  );
}

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(LS_SEEN_WELCOME) === "1";
  } catch {
    return true;
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(LS_SEEN_WELCOME, "1");
  } catch {
    /* ignore */
  }
}

export function isInAppBrowserDismissed(): boolean {
  try {
    return localStorage.getItem(LS_DISMISS_INAPP) === "1";
  } catch {
    return true;
  }
}

export function dismissInAppBrowserTip() {
  try {
    localStorage.setItem(LS_DISMISS_INAPP, "1");
  } catch {
    /* ignore */
  }
}

/** Facebook / Instagram / TikTok / etc. in-app WebViews break II + Add to Home Screen. */
export function detectInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|BytedanceWebview|Snapchat|LinkedInApp|Pinterest/i.test(
    ua,
  );
}

export type MobilePlatform = "ios" | "android" | "other";

export function detectMobilePlatform(): MobilePlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}
