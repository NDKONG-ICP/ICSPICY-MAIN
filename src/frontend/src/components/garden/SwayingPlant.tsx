import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

type Props = {
  children: ReactNode;
  intensity?: number;
  seed?: number;
  windDirection?: number;
};

export function SwayingPlant({ children, intensity = 0.02, seed = 0, windDirection = 0 }: Props) {
  const groupRef = useRef<Group>(null);
  const phase = seed * 0.37;

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const wind = windDirection * 0.4;
    g.rotation.z = Math.sin(t * 1.5 + phase + wind) * intensity;
    g.rotation.x = Math.sin(t * 1.2 + phase * 0.5 + wind * 0.5) * intensity * 0.5;
  });

  return <group ref={groupRef}>{children}</group>;
}
