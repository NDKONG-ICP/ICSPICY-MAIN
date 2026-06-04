import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type * as THREE from "three";

export function RainParticles({
  active,
  bounds = 20,
  centerX = 5,
  centerZ = 5,
}: {
  active: boolean;
  bounds?: number;
  centerX?: number;
  centerZ?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const count = 400;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = centerX + (Math.random() - 0.5) * bounds;
      arr[i * 3 + 1] = 2 + Math.random() * 4;
      arr[i * 3 + 2] = centerZ + (Math.random() - 0.5) * bounds;
    }
    return arr;
  }, [bounds, centerX, centerZ, count]);

  useFrame(() => {
    if (!active || !ref.current) return;
    const pos = ref.current.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 0; i < count; i += 1) {
      pos.array[i * 3 + 1] -= 0.08;
      if (pos.array[i * 3 + 1] < 0)
        pos.array[i * 3 + 1] = 4 + Math.random() * 2;
    }
    pos.needsUpdate = true;
  });

  if (!active) return null;
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#93c5fd" transparent opacity={0.6} />
    </points>
  );
}
