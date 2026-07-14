import { Link } from "@tanstack/react-router";
import { ArrowLeft, Flame, Home, Volume2, VolumeX } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { isMuted, toggleMute } from "./audio";
import "./arcade-theme.css";
import "./game-shell.css";

export function GameShell({
  title,
  scoreSlot,
  children,
  footer,
}: {
  title: string;
  scoreSlot?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => {
    const html = document.documentElement;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevBodyTouch = document.body.style.touchAction;
    const prevBodySelect = document.body.style.userSelect;
    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.body.style.touchAction = prevBodyTouch;
      document.body.style.userSelect = prevBodySelect;
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, []);

  return (
    <div
      className="game-shell arcade-theme"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "transparent",
        touchAction: "none",
        overscrollBehavior: "none",
      }}
      data-ocid="game-shell"
    >
      <header className="game-shell__header arcade-wood-brass">
        <Link
          to="/games"
          className="game-shell__nav-link"
          data-ocid="game-shell-back-games"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Midway</span>
        </Link>
        <div className="game-shell__title-wrap">
          <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden />
          <span className="game-shell__title arcade-painted-text">{title}</span>
        </div>
        {scoreSlot != null ? (
          <div className="game-shell__score arcade-painted-text">{scoreSlot}</div>
        ) : (
          <div className="game-shell__score-spacer" />
        )}
        <button
          type="button"
          onClick={() => setMutedState(toggleMute())}
          className="game-shell__mute"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
      </header>

      <main className="game-shell__main">{children}</main>

      <footer className="game-shell__footer arcade-wood-brass">
        {footer}
        <Link to="/" className="game-shell__home" data-ocid="game-shell-back-home">
          <Home className="h-3 w-3" />
          ICSPICY.app
        </Link>
      </footer>
    </div>
  );
}
