import { memo, useEffect, useState } from "react";
import * as THREE from "three";
import { stitchSatelliteTexture } from "@/lib/satellite-tiles";
import { ProceduralGround } from "./ProceduralGround";

type Props = {
  lat: number;
  lng: number;
  widthMeters: number;
  depthMeters: number;
  centerX: number;
  centerZ: number;
  enabled?: boolean;
};

export const SatelliteGround = memo(function SatelliteGround({
  lat,
  lng,
  widthMeters,
  depthMeters,
  centerX,
  centerZ,
  enabled = true,
}: Props) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setTexture(null);
      setFailed(false);
      return;
    }

    let cancelled = false;
    let revoke: (() => void) | null = null;
    setLoading(true);
    setFailed(false);

    void stitchSatelliteTexture(lat, lng, widthMeters, depthMeters).then((result) => {
      if (cancelled) {
        result?.revoke();
        return;
      }
      setLoading(false);
      if (!result) {
        setFailed(true);
        return;
      }
      revoke = result.revoke;
      const loader = new THREE.TextureLoader();
      loader.load(result.url, (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      });
    });

    return () => {
      cancelled = true;
      revoke?.();
      setTexture((prev) => {
        prev?.dispose();
        return null;
      });
    };
  }, [enabled, lat, lng, widthMeters, depthMeters]);

  if (!enabled || failed) {
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
    <>
      {loading && !texture && (
        <ProceduralGround
          widthMeters={widthMeters}
          depthMeters={depthMeters}
          centerX={centerX}
          centerZ={centerZ}
        />
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.01, centerZ]}
        receiveShadow
      >
        <planeGeometry args={[widthMeters, depthMeters]} />
        {texture ? (
          <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
        ) : (
          <meshStandardMaterial color="#2d5016" roughness={0.9} />
        )}
      </mesh>
    </>
  );
});
