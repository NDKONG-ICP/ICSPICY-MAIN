import { CAMERA_PRESETS, type CameraPresetId } from "@/lib/garden-types";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

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
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(...plotCenter));
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
    framesLeft.current = 90;
  }, [preset, plotCenter, plotSize, offset]);

  useFrame(() => {
    if (framesLeft.current <= 0) return;
    framesLeft.current -= 1;
    camera.position.lerp(desiredPos.current, 0.08);
    target.current.lerp(desiredTarget.current, 0.08);
    camera.lookAt(target.current);
  });

  return null;
}
