import { Seo } from "../../components/Seo";
import { staticRouteSeo } from "../../lib/seo-routes.mjs";
import { GameErrorBoundary } from "../../games/shared/GameErrorBoundary";
import { CrafterGame } from "../../games/crafter/CrafterGame";

const CRAFTER_SEO = staticRouteSeo("/games/crafter");

export default function CrafterPage() {
  return (
    <>
      <Seo
        title={CRAFTER_SEO.title}
        description={CRAFTER_SEO.description}
        path="/games/crafter"
        jsonLd={CRAFTER_SEO.jsonLd ?? undefined}
      />
      <GameErrorBoundary gameName="ICSPICY Small Batch Crafter">
        <CrafterGame />
      </GameErrorBoundary>
    </>
  );
}
