import { X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "garden-beta-banner-dismissed";

export function GardenBetaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div className="relative border-b border-amber-500/40 bg-zinc-950 px-4 py-2.5 text-sm text-amber-100/90">
      <p className="pr-8 leading-snug">
        <span className="font-semibold text-amber-400">
          🧪 Experimental Beta
        </span>
        {" — "}
        This feature is under active development. Have fun designing and check
        back often for new tools and improvements!
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-amber-200/70 hover:bg-amber-500/10 hover:text-amber-100"
        aria-label="Dismiss beta notice"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
