import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export const Butterflies = memo(function Butterflies({
  count = 5,
  bounds = 10,
  centerX = 5,
  centerZ = 5,
}: {
  count?: number;
  bounds?: number;
  centerX?: number;
  centerZ?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(0.05, 0.05), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#FFD700",
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        ox: (Math.sin(i * 2.1) * 0.5 + 0.5) * bounds - bounds / 2,
        oy: 0.5 + (i / count) * 1.2,
        oz: (Math.cos(i * 1.7) * 0.5 + 0.5) * bounds - bounds / 2,
        speed: 0.3 + (i % 5) * 0.1,
        phase: i * 1.3,
        wingPhase: i * 0.7,
      })),
    [count, bounds],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      const x = centerX + d.ox + Math.sin(t * d.speed + d.phase) * 2;
      const y = d.oy + Math.sin(t * 0.5 + d.phase) * 0.3;
      const z = centerZ + d.oz + Math.cos(t * d.speed * 0.7 + d.phase) * 2;
      const wingScale = 0.8 + Math.sin(t * 8 + d.wingPhase) * 0.2;
      dummy.position.set(x, y, z);
      quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * d.speed);
      dummy.quaternion.copy(quat);
      dummy.scale.set(wingScale, 0.02, 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
    />
  );
});

export const PollenParticles = memo(function PollenParticles({
  count = 50,
  bounds = 15,
  centerX = 5,
  centerZ = 5,
}: {
  count?: number;
  bounds?: number;
  centerX?: number;
  centerZ?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = centerX + (Math.random() - 0.5) * bounds;
      arr[i * 3 + 1] = Math.random() * 3;
      arr[i * 3 + 2] = centerZ + (Math.random() - 0.5) * bounds;
    }
    return arr;
  }, [count, bounds, centerX, centerZ]);

  useFrame(({ clock }) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i += 1) {
      pos.array[i * 3 + 1] += Math.sin(t + i) * 0.0008;
      pos.array[i * 3] += Math.sin(t * 0.3 + i * 0.5) * 0.001;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ffffcc"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
});

export function AtmosphericEffects({
  enabled,
  plotWidth,
  plotDepth,
}: {
  enabled: boolean;
  plotWidth: number;
  plotDepth: number;
}) {
  const [ready, setReady] = useState(false);
  const cx = plotWidth / 2;
  const cz = plotDepth / 2;

  useEffect(() => {
    if (!enabled) return;
    const id =
      requestIdleCallback?.(() => setReady(true)) ??
      setTimeout(() => setReady(true), 500);
    return () => {
      if (typeof id === "number") clearTimeout(id);
    };
  }, [enabled]);

  if (!enabled || !ready) return null;
  return (
    <>
      <Butterflies
        count={5}
        bounds={Math.max(plotWidth, plotDepth)}
        centerX={cx}
        centerZ={cz}
      />
      <PollenParticles
        count={40}
        bounds={Math.max(plotWidth, plotDepth) + 4}
        centerX={cx}
        centerZ={cz}
      />
    </>
  );
}
