import { Html, PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { GardenDesign } from "@/lib/garden-types";
import { PlantModel } from "./plants/PlantModel";
import { StructureMesh } from "./StructureMesh";
import { AmbientSounds } from "./AmbientSounds";

type Props = {
  design: GardenDesign;
  onExit: () => void;
};

export function WalkMode({ design, onExit }: Props) {
  const controlsRef = useRef<{ isLocked?: boolean; lock?: () => void }>(null);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef<Record<string, boolean>>({});
  const { camera } = useThree();
  const cx = design.widthMeters / 2;
  const cz = design.depthMeters / 2;

  useEffect(() => {
    camera.position.set(cx, 1.7, cz - 2);
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "Escape") onExit();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [camera, cx, cz, onExit]);

  useFrame(() => {
    if (!controlsRef.current?.isLocked) return;
    const speed = 0.06;
    direction.current.set(0, 0, 0);
    if (keys.current.KeyW || keys.current.ArrowUp) direction.current.z -= 1;
    if (keys.current.KeyS || keys.current.ArrowDown) direction.current.z += 1;
    if (keys.current.KeyA || keys.current.ArrowLeft) direction.current.x -= 1;
    if (keys.current.KeyD || keys.current.ArrowRight) direction.current.x += 1;
    direction.current.normalize();
    velocity.current.x = direction.current.x * speed;
    velocity.current.z = direction.current.z * speed;
    camera.position.x = Math.max(0, Math.min(design.widthMeters, camera.position.x + velocity.current.x));
    camera.position.z = Math.max(0, Math.min(design.depthMeters, camera.position.z + velocity.current.z));
    camera.position.y = 1.7;
  });

  return (
    <>
      <PointerLockControls ref={controlsRef as never} />
      <AmbientSounds design={design} />
      {design.plants.map((p) => (
        <PlantModel key={p.id} placement={p} maturity={0.85} readOnly />
      ))}
      {design.structures.map((s) => (
        <StructureMesh key={s.id} placement={s} />
      ))}
      <Html fullscreen>
        <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-start p-4">
          <div className="pointer-events-auto mt-2 rounded-lg bg-black/60 px-4 py-2 text-white text-sm backdrop-blur">
            Click to lock pointer · WASD to walk · ESC to exit
          </div>
          <button
            type="button"
            onClick={onExit}
            className="pointer-events-auto fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg"
          >
            Exit Walk Mode
          </button>
        </div>
      </Html>
    </>
  );
}
