import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const LS_KEY = "icspicy_cookie_notice_v1";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(LS_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(LS_KEY, "ack");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 inset-x-0 z-[60] border-t border-border bg-card/95 backdrop-blur px-4 py-3 shadow-lg"
      data-ocid="cookie-consent"
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
        <p>
          We use essential cookies and local storage for sign-in (Internet Identity),
          checkout (PayPal), and preferences. Embedded YouTube videos may set
          third-party cookies if you play them. We do not use session replay tools.{" "}
          <Link to="/privacy" className="underline text-foreground">
            Privacy Policy
          </Link>
        </p>
        <Button type="button" size="sm" className="shrink-0" onClick={dismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
