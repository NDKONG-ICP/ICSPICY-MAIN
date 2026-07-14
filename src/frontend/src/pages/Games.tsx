import { Link } from "@tanstack/react-router";
import { Flame, Trophy } from "lucide-react";
import { Seo } from "../components/Seo";
import { staticRouteSeo } from "../lib/seo-routes.mjs";
import { GAMES } from "../games/config";
import { ARCADE_ASSETS } from "../games/shared/arcade-assets";
import { MidwayBooth } from "../games/shared/MidwayBooth";
import { useIngredientInventory } from "../games/shared/useIngredientInventory";
import { useAuth } from "../hooks/useAuth";
import "../games/shared/arcade-theme.css";
import "../games/shared/midway-hub.css";

export default function GamesPage() {
  const seo = staticRouteSeo("/games");
  const { inventory, hydrated, isAuthenticated } = useIngredientInventory();
  const { login } = useAuth();

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        path="/games"
        jsonLd={seo.jsonLd ?? undefined}
      />

      <div className="arcade-midway arcade-theme" data-ocid="games-hub">
        <img
          src={ARCADE_ASSETS.midwayBg}
          alt=""
          className="arcade-midway__bg"
          aria-hidden
          decoding="async"
          fetchPriority="high"
        />
        <div className="arcade-midway__scrim" aria-hidden />

        <div className="arcade-midway__content">
          <header className="arcade-midway-header">
            <div className="arcade-midway-header__badge">
              <Flame className="h-3.5 w-3.5" aria-hidden />
              ICSPICY Midway
            </div>
            <h1 className="arcade-midway-header__title arcade-painted-text">
              State Fair of Heat
            </h1>
            <p className="arcade-midway-header__sub">
              Pick a booth — compete for SHU glory on the global boards.
            </p>
            <Link
              to="/games/leaderboard"
              search={{ game: undefined }}
              className="arcade-btn arcade-btn--ghost arcade-midway-header__all-lb"
              data-ocid="games-hub-leaderboard"
            >
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
              All Scoreboards
            </Link>
          </header>

          <div className="arcade-midway-provisions-wrap" data-ocid="games-pantry-summary">
            <div className="arcade-provisions-chit">
              <span className="arcade-provisions-chit__label">PROVISIONS</span>
              <span className="arcade-provisions-chit__counts">
                Raw {hydrated ? inventory.raw.length : "—"} · Sliced{" "}
                {hydrated ? inventory.sliced.length : "—"}
              </span>
            </div>
            {!isAuthenticated && (
              <p className="arcade-midway-provisions__signin">
                <button
                  type="button"
                  className="arcade-midway-provisions__signin-link"
                  onClick={login}
                >
                  Sign in
                </button>
                {" "}to sync pantry on-chain.
              </p>
            )}
          </div>

          <div className="arcade-midway-booths">
            {GAMES.map((game) => (
              <MidwayBooth key={game.id} game={game} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
