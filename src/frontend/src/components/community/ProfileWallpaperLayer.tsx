/**
 * Full-page profile wallpaper layer — presets (CSS) or custom uploads.
 */
import type { CSSProperties } from "react";
import {
  parseWallpaperKey,
  presetWallpaperStyle,
  type WallpaperPresetId,
} from "@/lib/profile-wallpapers";
import { uploadsUrl } from "@/lib/uploads-canister";

export function ProfileWallpaperLayer({
  wallpaperKey,
}: {
  wallpaperKey: string | null | undefined;
}) {
  const parsed = parseWallpaperKey(wallpaperKey);
  if (!parsed) return null;

  let layerStyle: CSSProperties = {};
  let isCustomImage = false;

  if (parsed.kind === "preset") {
    layerStyle = presetWallpaperStyle(parsed.id as WallpaperPresetId) ?? {};
  } else {
    isCustomImage = true;
    layerStyle = {
      backgroundImage: `url(${uploadsUrl(parsed.path)})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden
      data-ocid="profile-wallpaper"
    >
      <div className="absolute inset-0" style={layerStyle} />
      <div
        className={[
          "absolute inset-0 bg-black/60",
          isCustomImage ? "backdrop-blur-sm" : "",
        ].join(" ")}
      />
    </div>
  );
}
