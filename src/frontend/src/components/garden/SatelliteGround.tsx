import { loadSatelliteThreeTexture } from "@/lib/satellite-texture-cache";
import { memo, useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import { ProceduralGround } from "./ProceduralGround";

type Props = {
  lat: number;
  lng: number;
  widthMeters: number;
  depthMeters: number;
  centerX: number;
  centerZ: number;
  enabled?: boolean;
  zoom?: number;
};

export const SatelliteGround = memo(function SatelliteGround({
  lat,
  lng,
  widthMeters,
  depthMeters,
  centerX,
  centerZ,
  enabled = true,
  zoom = 17,
}: Props) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);
  const displayedRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTexture(null);
      setFailed(false);
      displayedRef.current = null;
      return;
    }

    let cancelled = false;
    setFailed(false);

    void loadSatelliteThreeTexture(lat, lng, zoom)
      .then((tex) => {
        if (cancelled) return;
        displayedRef.current = tex;
        setTexture(tex);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, lat, lng, zoom]);

  const activeTexture = texture ?? displayedRef.current;

  if (!enabled || (failed && !activeTexture)) {
    return (
      <ProceduralGround
        widthMeters={widthMeters}
        depthMeters={depthMeters}
        centerX={centerX}
        centerZ={centerZ}
      />
    );
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[centerX, -0.01, centerZ]}
      receiveShadow
    >
      <planeGeometry args={[widthMeters, depthMeters]} />
      <meshStandardMaterial
        map={activeTexture ?? undefined}
        transparent
        opacity={activeTexture ? 0.85 : 0.6}
        toneMapped={false}
        color="#cccccc"
        roughness={0.95}
        metalness={0}
      />
    </mesh>
  );
});
