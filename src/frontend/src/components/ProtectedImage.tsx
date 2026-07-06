import type { CSSProperties, ReactNode } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  figureClassName?: string;
  style?: CSSProperties;
  /** Italic credit line beneath the image — always rendered. */
  creditText: string;
  /** Vendor product page — credit links here. */
  creditHref: string;
  /** Optional overlay badge (e.g. heat class). */
  badge?: ReactNode;
  /** Hide caption (e.g. when parent renders credit separately). */
  hideCaption?: boolean;
};

/**
 * Vendor photo display with casual save-deterrence (not DRM).
 * Watermark is burned into pixels server-side; this layer blocks naive right-click / drag.
 */
export function ProtectedImage({
  src,
  alt,
  className,
  figureClassName,
  style,
  creditText,
  creditHref,
  badge,
  hideCaption = false,
}: Props) {
  return (
    <figure
      className={`relative select-none ${figureClassName ?? ""}`}
      data-ocid="protected-vendor-photo"
    >
      <div
        className="relative overflow-hidden"
        style={{
          WebkitTouchCallout: "none",
          userSelect: "none",
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          src={src}
          alt={alt}
          className={className}
          style={style}
          loading="lazy"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
        <div
          className="absolute inset-0 z-[1]"
          aria-hidden
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
        {badge}
      </div>
      {!hideCaption ? (
        <figcaption className="mt-2 text-xs italic text-muted-foreground">
          <a
            href={creditHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            {creditText}
          </a>
        </figcaption>
      ) : null}
    </figure>
  );
}
