import { SunDirectionMarker } from "./SunDirectionMarker";

type Props = {
  azimuthDeg: number;
  altitudeDeg: number;
  plotWidth: number;
  plotDepth: number;
};

/** 3D sun direction indicator for preview mode. */
export function SunlightSceneOverlay({
  azimuthDeg,
  altitudeDeg,
  plotWidth,
  plotDepth,
}: Props) {
  if (altitudeDeg <= 0) return null;

  const radius = Math.max(plotWidth, plotDepth) * 0.6;
  const altRad = (altitudeDeg * Math.PI) / 180;
  const azRad = (azimuthDeg * Math.PI) / 180;
  const x = plotWidth / 2 + Math.sin(azRad) * radius * Math.cos(altRad);
  const y = Math.sin(altRad) * radius + 1;
  const z = plotDepth / 2 + Math.cos(azRad) * radius * Math.cos(altRad);

  return (
    <>
      <SunDirectionMarker position={[x, y, z]} />
      <directionalLight
        position={[x, y, z]}
        intensity={0.4 + (altitudeDeg / 90) * 0.5}
        color="#fde68a"
      />
    </>
  );
}
