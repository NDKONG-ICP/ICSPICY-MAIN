import { useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { memo, useEffect, useState } from "react";

export function PixelRatioLimiter() {
  const { gl } = useThree();
  useEffect(() => {
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, [gl]);
  return null;
}

function useCanDoPostProcessing(): boolean {
  const { gl, size } = useThree();
  const [canPost, setCanPost] = useState(false);

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const ctx = gl.getContext();
    const maxRb = ctx.getParameter(ctx.MAX_RENDERBUFFER_SIZE) as number;
    const needW = size.width * dpr;
    const needH = size.height * dpr;
    setCanPost(
      maxRb >= needW && maxRb >= needH && needW <= 4096 && needH <= 4096,
    );
  }, [gl, size.width, size.height]);

  return canPost;
}

export const ScenePostProcessing = memo(function ScenePostProcessing({
  enabled,
}: {
  enabled: boolean;
}) {
  const canPost = useCanDoPostProcessing();
  if (!enabled || !canPost) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.1} luminanceThreshold={0.9} mipmapBlur />
      <Vignette offset={0.3} darkness={0.4} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
});
