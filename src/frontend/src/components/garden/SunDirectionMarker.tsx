import { Html } from "@react-three/drei";

type Props = {
  position: [number, number, number];
};

export function SunDirectionMarker({ position }: Props) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      <Html center distanceFactor={20}>
        <span className="text-xs font-medium text-amber-300 drop-shadow">☀️ Sun</span>
      </Html>
    </group>
  );
}
