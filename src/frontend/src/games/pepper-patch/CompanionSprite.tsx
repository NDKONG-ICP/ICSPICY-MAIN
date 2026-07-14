import { useEffect, useState } from "react";
import type { IngredientKind } from "../slicer/constants";
import {
  getAtlasImage,
  getAtlasState,
  getFrame,
  preloadAtlas,
  USE_VECTOR_FALLBACK,
} from "../slicer/atlas";
import type { CompanionId } from "./constants";
import { COMPANION_BY_ID } from "./constants";

export function CompanionSprite({
  companionId,
  maxEdge = 28,
  className = "",
}: {
  companionId: CompanionId;
  maxEdge?: number;
  className?: string;
}) {
  const def = COMPANION_BY_ID[companionId];
  const [ready, setReady] = useState(getAtlasState() === "ready");

  useEffect(() => {
    void preloadAtlas().then(setReady);
  }, []);

  if (!ready || USE_VECTOR_FALLBACK) {
    return (
      <span className={className} title={def.label}>
        {def.emoji}
      </span>
    );
  }

  const frame = getFrame(def.spriteKind as IngredientKind, "whole");
  const img = getAtlasImage();
  if (!frame || !img) {
    return <span className={className}>{def.emoji}</span>;
  }

  const scale = maxEdge / Math.max(frame.w, frame.h);
  const w = frame.w * scale;
  const h = frame.h * scale;

  return (
    <span
      className={`inline-block ${className}`}
      title={def.label}
      style={{
        width: w,
        height: h,
        backgroundImage: `url(${img.src})`,
        backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
        backgroundSize: `${img.naturalWidth * scale}px ${img.naturalHeight * scale}px`,
        imageRendering: "pixelated",
      }}
      aria-hidden
    />
  );
}
