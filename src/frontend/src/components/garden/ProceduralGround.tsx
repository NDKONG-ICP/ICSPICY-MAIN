import { memo } from "react";

type Props = {
  widthMeters: number;
  depthMeters: number;
  centerX: number;
  centerZ: number;
  receiveShadow?: boolean;
};

export const ProceduralGround = memo(function ProceduralGround({
  widthMeters,
  depthMeters,
  centerX,
  centerZ,
  receiveShadow = true,
}: Props) {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.02, centerZ]}
        receiveShadow={receiveShadow}
      >
        <planeGeometry args={[widthMeters + 4, depthMeters + 4]} />
        <meshStandardMaterial color="#4a7c2e" roughness={0.9} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.01, centerZ]}
        receiveShadow={receiveShadow}
      >
        <planeGeometry args={[widthMeters, depthMeters]} />
        <meshStandardMaterial color="#3d6b25" roughness={0.85} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.005, centerZ]}
        receiveShadow={receiveShadow}
      >
        <planeGeometry args={[widthMeters + 0.6, depthMeters + 0.6]} />
        <meshStandardMaterial color="#5c4a32" roughness={0.95} transparent opacity={0.35} />
      </mesh>
    </group>
  );
});
