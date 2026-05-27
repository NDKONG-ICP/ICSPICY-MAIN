import { memo, useMemo } from "react";
import { createGrassTexture } from "@/lib/ground-textures";

type Props = {
  widthMeters: number;
  depthMeters: number;
  centerX: number;
  centerZ: number;
};

export const TexturedGround = memo(function TexturedGround({
  widthMeters,
  depthMeters,
  centerX,
  centerZ,
}: Props) {
  const grass = useMemo(() => createGrassTexture(), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, -0.02, centerZ]} receiveShadow>
        <planeGeometry args={[widthMeters + 6, depthMeters + 6]} />
        <meshStandardMaterial map={grass} roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, -0.01, centerZ]} receiveShadow>
        <planeGeometry args={[widthMeters, depthMeters]} />
        <meshStandardMaterial map={grass} roughness={0.88} color="#3d6b25" />
      </mesh>
    </group>
  );
});
