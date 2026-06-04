import * as THREE from "three";

let grassTex: THREE.CanvasTexture | null = null;
let soilTex: THREE.CanvasTexture | null = null;
let mulchTex: THREE.CanvasTexture | null = null;
let gravelTex: THREE.CanvasTexture | null = null;

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

export function createGrassTexture(): THREE.CanvasTexture {
  if (grassTex) return grassTex;
  const canvas = makeCanvas(512, 512);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3a6b24";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const bladeH = 3 + Math.random() * 8;
    const shade = Math.random() * 40 - 20;
    ctx.strokeStyle = `rgb(${58 + shade}, ${107 + shade}, ${36 + shade})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 3, y - bladeH);
    ctx.stroke();
  }
  grassTex = new THREE.CanvasTexture(canvas);
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(4, 4);
  grassTex.colorSpace = THREE.SRGBColorSpace;
  return grassTex;
}

export function createSoilTexture(): THREE.CanvasTexture {
  if (soilTex) return soilTex;
  const canvas = makeCanvas(256, 256);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3d2817";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 800; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 1 + Math.random() * 3;
    const v = Math.random() * 30 - 15;
    ctx.fillStyle = `rgb(${61 + v}, ${40 + v}, ${23 + v})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  soilTex = new THREE.CanvasTexture(canvas);
  soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping;
  soilTex.repeat.set(2, 2);
  soilTex.colorSpace = THREE.SRGBColorSpace;
  return soilTex;
}

export function createMulchTexture(): THREE.CanvasTexture {
  if (mulchTex) return mulchTex;
  const canvas = makeCanvas(256, 256);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#5c4033";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 600; i += 1) {
    ctx.fillStyle = `rgb(${70 + Math.random() * 40}, ${45 + Math.random() * 30}, ${25 + Math.random() * 20})`;
    ctx.fillRect(
      Math.random() * 256,
      Math.random() * 256,
      4 + Math.random() * 10,
      2 + Math.random() * 4,
    );
  }
  mulchTex = new THREE.CanvasTexture(canvas);
  mulchTex.wrapS = mulchTex.wrapT = THREE.RepeatWrapping;
  mulchTex.repeat.set(3, 3);
  mulchTex.colorSpace = THREE.SRGBColorSpace;
  return mulchTex;
}

export function createGravelTexture(): THREE.CanvasTexture {
  if (gravelTex) return gravelTex;
  const canvas = makeCanvas(256, 256);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#9e8e7e";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i += 1) {
    const g = 120 + Math.random() * 60;
    ctx.fillStyle = `rgb(${g}, ${g - 10}, ${g - 20})`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * 256,
      Math.random() * 256,
      1 + Math.random() * 3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  gravelTex = new THREE.CanvasTexture(canvas);
  gravelTex.wrapS = gravelTex.wrapT = THREE.RepeatWrapping;
  gravelTex.repeat.set(2, 2);
  gravelTex.colorSpace = THREE.SRGBColorSpace;
  return gravelTex;
}
