import type { PlantPlacement } from "@/lib/garden-types";
import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const MAX_INSTANCED = 10;

function InstancedVarietyGroup({
  plants,
  color,
}: {
  plants: PlantPlacement[];
  color: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(
    () => new THREE.CylinderGeometry(0.06, 0.1, 0.35, 6),
    [],
  );
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.75 }),
    [color],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    plants.forEach((p, i) => {
      dummy.position.set(p.x, 0.18 * p.scale, p.y);
      dummy.rotation.set(0, (p.rotation * Math.PI) / 180, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [plants]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, plants.length]}
      castShadow
      receiveShadow
    />
  );
}

export const InstancedPlantField = memo(function InstancedPlantField({
  plants,
}: { plants: PlantPlacement[] }) {
  const groups = useMemo(() => {
    const byKey = new Map<string, PlantPlacement[]>();
    for (const p of plants) {
      const key = p.catalogId ?? String(p.varietyId ?? p.label);
      const list = byKey.get(key) ?? [];
      list.push(p);
      byKey.set(key, list);
    }
    const instanced: {
      key: string;
      plants: PlantPlacement[];
      color: string;
    }[] = [];
    for (const [key, list] of byKey) {
      if (list.length > MAX_INSTANCED) {
        instanced.push({ key, plants: list, color: list[0].color });
      }
    }
    return instanced;
  }, [plants]);

  if (groups.length === 0) return null;

  return (
    <group>
      {groups.map((g) => (
        <InstancedVarietyGroup key={g.key} plants={g.plants} color={g.color} />
      ))}
    </group>
  );
});

export function instancedPlantIds(plants: PlantPlacement[]): Set<number> {
  const counts = new Map<string, PlantPlacement[]>();
  for (const p of plants) {
    const key = p.catalogId ?? String(p.varietyId ?? p.label);
    const list = counts.get(key) ?? [];
    list.push(p);
    counts.set(key, list);
  }
  const ids = new Set<number>();
  for (const list of counts.values()) {
    if (list.length > MAX_INSTANCED) {
      for (const p of list) ids.add(p.id);
    }
  }
  return ids;
}
