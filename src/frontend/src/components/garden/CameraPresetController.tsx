import { CAMERA_PRESETS, type CameraPresetId } from "@/lib/garden-types";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type OrbitControlsLike = {
  enabled: boolean;
  target: THREE.Vector3;
  update: () => void;
};

type Props = {
  preset: CameraPresetId;
  plotCenter: [number, number, number];
  plotSize: number;
};

export function CameraPresetController({
  preset,
  plotCenter,
  plotSize,
}: Props) {
  const { camera, controls } = useThree();
  const desiredPos = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3(...plotCenter));
  const framesLeft = useRef(0);
  const offset = plotSize * 0.85;

  useEffect(() => {
    const base = CAMERA_PRESETS[preset];
    desiredPos.current.set(
      plotCenter[0] + base.position[0] * (offset / 8),
      Math.max(base.position[1] * (offset / 8), 2),
      plotCenter[2] + base.position[2] * (offset / 8),
    );
    desiredTarget.current.set(
      plotCenter[0] + base.target[0],
      base.target[1],
      plotCenter[2] + base.target[2],
    );
    framesLeft.current = 60;
  }, [preset, plotCenter[0], plotCenter[1], plotCenter[2], plotSize, offset]);

  useFrame(() => {
    if (framesLeft.current <= 0) return;
    framesLeft.current -= 1;
    const orbit = controls as unknown as OrbitControlsLike | undefined;
    // Disable OrbitControls while we animate so they don't fight.
    if (orbit) orbit.enabled = false;
    camera.position.lerp(desiredPos.current, 0.1);
    if (orbit) {
      orbit.target.lerp(desiredTarget.current, 0.1);
      orbit.update();
      // Re-enable on the last frame
      if (framesLeft.current <= 0) orbit.enabled = true;
    } else {
      camera.lookAt(desiredTarget.current);
    }
  });

  return null;
}
