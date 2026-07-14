/**
 * Atlas CSS-sprite element. Returns null when fallback is active or frame missing.
 */
import type { CSSProperties } from "react";
import { frameStyle, USE_PLACEHOLDER_FALLBACK } from "./atlas";

interface Props {
  stem: string;
  maxEdge: number;
  className?: string;
  alt?: string;
  style?: CSSProperties;
}

export function AtlasSprite({ stem, maxEdge, className, alt, style }: Props) {
  if (USE_PLACEHOLDER_FALLBACK) return null;
  const sprite = frameStyle(stem, maxEdge);
  if (!sprite) return null;
  return (
    <div
      role={alt ? "img" : undefined}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
      className={className}
      style={{ ...sprite, ...style }}
    />
  );
}
