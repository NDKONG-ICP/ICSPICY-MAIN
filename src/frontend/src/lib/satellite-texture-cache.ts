import * as THREE from "three";
import { clampSatelliteZoom, singleTileUrl } from "./satellite-tiles";

const urlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function cacheKey(lat: number, lng: number, zoom: number) {
  return `${lat.toFixed(5)}:${lng.toFixed(5)}:${clampSatelliteZoom(zoom)}`;
}

/** Preload a satellite tile URL; returns cached URL when ready. */
export function preloadSatelliteTileUrl(
  lat: number,
  lng: number,
  zoom: number,
): Promise<string> {
  const key = cacheKey(lat, lng, zoom);
  const hit = urlCache.get(key);
  if (hit) return Promise.resolve(hit);

  const pending = inflight.get(key);
  if (pending) return pending;

  const url = singleTileUrl(lat, lng, zoom);
  const promise = new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      urlCache.set(key, url);
      inflight.delete(key);
      resolve(url);
    };
    img.onerror = () => {
      inflight.delete(key);
      reject(new Error(`Failed to preload tile ${url}`));
    };
    img.src = url;
  });
  inflight.set(key, promise);
  return promise;
}

export function getCachedSatelliteTileUrl(
  lat: number,
  lng: number,
  zoom: number,
): string | null {
  return urlCache.get(cacheKey(lat, lng, zoom)) ?? null;
}

/**
 * Downscale an image to fit within maxSize on its largest edge. Guards against
 * over-large GPU textures (some mobile GPUs choke above 2048²). Returns a canvas
 * suitable for use as THREE.Texture.image. No-op (returns null) when already small.
 */
export function resizeImageToMax(
  img: HTMLImageElement | HTMLCanvasElement,
  maxSize: number,
): HTMLCanvasElement | null {
  const w = img.width;
  const h = img.height;
  if (w <= maxSize && h <= maxSize) return null;
  const scale = Math.min(maxSize / w, maxSize / h, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(w * scale);
  canvas.height = Math.floor(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const DEFAULT_MAX_TEXTURE_PX = 512;
const textureCache = new Map<string, THREE.Texture>();

export function loadSatelliteThreeTexture(
  lat: number,
  lng: number,
  zoom: number,
  maxTexturePx: number = DEFAULT_MAX_TEXTURE_PX,
): Promise<THREE.Texture> {
  const key = `${cacheKey(lat, lng, zoom)}:${maxTexturePx}`;
  const cached = textureCache.get(key);
  if (cached) return Promise.resolve(cached);

  return preloadSatelliteTileUrl(lat, lng, zoom).then(
    (url) =>
      new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        loader.load(
          url,
          (tex) => {
            const img = tex.image as HTMLImageElement | undefined;
            if (img) {
              const resized = resizeImageToMax(img, maxTexturePx);
              if (resized) {
                tex.image = resized;
                tex.needsUpdate = true;
              }
            }
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.generateMipmaps = false;
            textureCache.set(key, tex);
            resolve(tex);
          },
          undefined,
          reject,
        );
      }),
  );
}
