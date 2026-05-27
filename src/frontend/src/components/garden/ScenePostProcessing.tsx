import { EffectComposer, Bloom, Vignette, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { memo } from "react";

export const ScenePostProcessing = memo(function ScenePostProcessing({
  enabled,
}: {
  enabled: boolean;
}) {
  if (!enabled) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.1} luminanceThreshold={0.9} mipmapBlur />
      <Vignette offset={0.3} darkness={0.4} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
});
