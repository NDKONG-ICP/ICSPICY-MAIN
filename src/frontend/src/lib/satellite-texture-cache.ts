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

const textureCache = new Map<string, THREE.Texture>();

export function loadSatelliteThreeTexture(
  lat: number,
  lng: number,
  zoom: number,
): Promise<THREE.Texture> {
  const key = cacheKey(lat, lng, zoom);
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
