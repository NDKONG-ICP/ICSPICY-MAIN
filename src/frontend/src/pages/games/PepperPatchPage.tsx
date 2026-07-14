import { Seo } from "../../components/Seo";
import { staticRouteSeo } from "../../lib/seo-routes.mjs";
import { GameErrorBoundary } from "../../games/shared/GameErrorBoundary";
import { PepperPatchGame } from "../../games/pepper-patch/PepperPatchGame";

const PATCH_SEO = staticRouteSeo("/games/pepper-patch");

export default function PepperPatchPage() {
  return (
    <>
      <Seo
        title={PATCH_SEO.title}
        description={PATCH_SEO.description}
        path="/games/pepper-patch"
        jsonLd={PATCH_SEO.jsonLd ?? undefined}
      />
      <GameErrorBoundary gameName="ICSPICY Pepper Patch">
        <PepperPatchGame />
      </GameErrorBoundary>
    </>
  );
}
