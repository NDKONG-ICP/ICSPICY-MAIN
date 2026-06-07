import { useEffect, useMemo } from "react";
import * as THREE from "three";

type Props = {
  widthMeters: number;
  depthMeters: number;
};

/**
 * Build a stylized lush-grass texture entirely on a canvas (no external asset):
 * a deep-green base, thousands of short HSL grass blades, and a scattering of
 * faint dirt ellipses for variation.
 */
function buildGrassTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#2d5a1b";
  ctx.fillRect(0, 0, size, size);

  // ~8000 short grass blades across the green range.
  for (let i = 0; i < 8000; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const hue = 88 + Math.random() * 42; // 88–130 = grassy greens
    const sat = 38 + Math.random() * 34;
    const light = 16 + Math.random() * 26;
    ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
    const w = 1 + Math.random() * 1.4;
    const h = 2 + Math.random() * 4;
    ctx.fillRect(x, y, w, h);
  }

  // ~200 faint brown dirt ellipses.
  for (let i = 0; i < 200; i += 1) {
    const r = Math.floor(58 + Math.random() * 34);
    const g = Math.floor(40 + Math.random() * 22);
    const b = Math.floor(20 + Math.random() * 16);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.22)`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      3 + Math.random() * 8,
      2 + Math.random() * 5,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Stylized grass ground for the 3D view. The design's coordinate origin is the
 * SW corner, so the plot spans 0..width on X and 0..depth on Z; the plane is
 * oversized 1.5× and centred at the plot midpoint.
 */
export function GardenGround({ widthMeters, depthMeters }: Props) {
  const texture = useMemo(() => {
    const t = buildGrassTexture();
    t.repeat.set(
      Math.max(1, widthMeters / 2),
      Math.max(1, depthMeters / 2),
    );
    return t;
  }, [widthMeters, depthMeters]);

  const borderGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(widthMeters, 0.05, depthMeters);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [widthMeters, depthMeters]);

  useEffect(() => {
    return () => {
      texture.dispose();
      borderGeometry.dispose();
    };
  }, [texture, borderGeometry]);

  const cx = widthMeters / 2;
  const cz = depthMeters / 2;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[cx, -0.02, cz]}
        receiveShadow
      >
        <planeGeometry args={[widthMeters * 1.5, depthMeters * 1.5]} />
        <meshLambertMaterial map={texture} />
      </mesh>
      {/* Subtle raised green plot outline. */}
      <lineSegments geometry={borderGeometry} position={[cx, 0.03, cz]}>
        <lineBasicMaterial color="#22c55e" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}
