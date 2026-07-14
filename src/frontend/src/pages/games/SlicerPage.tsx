import { Seo } from "../../components/Seo";
import { staticRouteSeo } from "../../lib/seo-routes.mjs";
import { GameErrorBoundary } from "../../games/shared/GameErrorBoundary";
import { SlicerGame } from "../../games/slicer/SlicerGame";

const SLICER_SEO = staticRouteSeo("/games/slicer");

export default function SlicerPage() {
  return (
    <>
      <Seo
        title={SLICER_SEO.title}
        description={SLICER_SEO.description}
        path="/games/slicer"
        jsonLd={SLICER_SEO.jsonLd ?? undefined}
      />
      <GameErrorBoundary gameName="ICSPICY Slicer">
        <SlicerGame />
      </GameErrorBoundary>
    </>
  );
}
