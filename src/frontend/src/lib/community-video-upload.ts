/**
 * On-chain short-video uploads for community posts.
 *
 * Client-side validation (duration/size/format), first-frame poster capture,
 * and the chunked upload flow against the backend's
 * beginVideoUpload / uploadVideoChunk / finishVideoUpload methods.
 * Videos land in the uploads asset canister under `community-videos/…`.
 */
import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import type { IDL } from "@dfinity/candid";
import { BACKEND_CANISTER_ID } from "./auth-config";

export const MAX_VIDEO_BYTES = 50_000_000;
export const MAX_VIDEO_SECONDS = 60;
export const VIDEO_SIZE_MESSAGE =
  "Videos must be under 50MB (~60 seconds). Try trimming or compressing.";

/** Matches the backend's MAX_CHUNK_BYTES headroom under the 2MB ingress cap. */
const CHUNK_BYTES = 1_800_000;

const ALLOWED_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function isVideoKey(key: string): boolean {
  return key.startsWith("community-videos/") && !key.includes("-poster.");
}

export function isVideoPosterKey(key: string): boolean {
  return key.startsWith("community-videos/") && key.includes("-poster.");
}

// ── Minimal candid actor (mirrors the variety-guide-idl pattern) ────────────

interface CommunityVideoActor {
  beginVideoUpload(contentType: string, totalSize: bigint): Promise<bigint>;
  uploadVideoChunk(
    uploadId: bigint,
    chunkIndex: bigint,
    data: Uint8Array,
  ): Promise<void>;
  finishVideoUpload(
    uploadId: bigint,
    poster: [] | [Uint8Array],
  ): Promise<{ videoKey: string; posterKey: [] | [string] }>;
  cancelVideoUpload(uploadId: bigint): Promise<void>;
}

const videoIdlFactory: IDL.InterfaceFactory = ({ IDL }) =>
  IDL.Service({
    beginVideoUpload: IDL.Func([IDL.Text, IDL.Nat], [IDL.Nat], []),
    uploadVideoChunk: IDL.Func([IDL.Nat, IDL.Nat, IDL.Vec(IDL.Nat8)], [], []),
    finishVideoUpload: IDL.Func(
      [IDL.Nat, IDL.Opt(IDL.Vec(IDL.Nat8))],
      [IDL.Record({ videoKey: IDL.Text, posterKey: IDL.Opt(IDL.Text) })],
      [],
    ),
    cancelVideoUpload: IDL.Func([IDL.Nat], [], []),
  });

function resolveHost(): string {
  if (typeof window === "undefined") return "https://icp-api.io";
  const { protocol, hostname, port } = window.location;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    return `${protocol}//127.0.0.1:${port || "4943"}`;
  }
  return "https://icp-api.io";
}

let authClientPromise: Promise<AuthClient> | null = null;

async function getAuthClient(): Promise<AuthClient> {
  if (!authClientPromise) authClientPromise = AuthClient.create();
  return authClientPromise;
}

let authActor: CommunityVideoActor | null = null;

async function getVideoActor(): Promise<CommunityVideoActor> {
  if (authActor) return authActor;
  const client = await getAuthClient();
  if (!(await client.isAuthenticated())) {
    throw new Error("Sign in to upload videos.");
  }
  const agent = HttpAgent.createSync({
    identity: client.getIdentity(),
    host: resolveHost(),
  });
  authActor = Actor.createActor<CommunityVideoActor>(videoIdlFactory, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  });
  return authActor;
}

// ── Validation ──────────────────────────────────────────────────────────────

export function isSupportedVideoFile(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) return true;
  // Some browsers report .mov as empty type — fall back to extension.
  return /\.(mp4|webm|mov)$/i.test(file.name);
}

function normalizedContentType(file: File): string {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  if (/\.webm$/i.test(file.name)) return "video/webm";
  if (/\.mov$/i.test(file.name)) return "video/quicktime";
  return "video/mp4";
}

/** Reads duration + first frame via an off-DOM <video>. */
function loadVideoMetadata(
  file: File,
): Promise<{ duration: number; video: HTMLVideoElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      resolve({ duration: video.duration, video, objectUrl });
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This video can't be read by your browser."));
    };
    video.src = objectUrl;
  });
}

/**
 * Validate a picked file and capture a poster frame.
 * Throws with a friendly message when the video is too long/large.
 */
export async function prepareVideoFile(file: File): Promise<{
  contentType: string;
  duration: number;
  poster: Uint8Array | null;
  posterPreviewUrl: string | null;
}> {
  if (!isSupportedVideoFile(file)) {
    throw new Error("Videos must be mp4, webm, or mov.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(VIDEO_SIZE_MESSAGE);
  }
  const { duration, video, objectUrl } = await loadVideoMetadata(file);
  try {
    if (Number.isFinite(duration) && duration > MAX_VIDEO_SECONDS + 0.5) {
      throw new Error(VIDEO_SIZE_MESSAGE);
    }
    const poster = await capturePoster(video);
    return {
      contentType: normalizedContentType(file),
      duration,
      poster: poster?.bytes ?? null,
      posterPreviewUrl: poster?.previewUrl ?? null,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
    video.removeAttribute("src");
    video.load();
  }
}

/** Canvas snapshot of the first frame → JPEG ≤1MB (best-effort). */
async function capturePoster(
  video: HTMLVideoElement,
): Promise<{ bytes: Uint8Array; previewUrl: string } | null> {
  try {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      video.onseeked = done;
      // Seek slightly in — frame 0 is often black on phone recordings.
      video.currentTime = Math.min(0.1, video.duration || 0.1);
      window.setTimeout(done, 2000);
    });
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;
    const scale = Math.min(1, 720 / width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob || blob.size > 1_000_000) return null;
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      previewUrl: canvas.toDataURL("image/jpeg", 0.7),
    };
  } catch {
    return null;
  }
}

// ── Chunked upload ──────────────────────────────────────────────────────────

/**
 * Upload the video (and optional poster) on-chain.
 * `onProgress` receives 0..1 across the chunk stream + finalize step.
 */
export async function uploadCommunityVideo(
  file: File,
  contentType: string,
  poster: Uint8Array | null,
  onProgress: (fraction: number) => void,
): Promise<{ videoKey: string; posterKey: string | null }> {
  const actor = await getVideoActor();
  const total = file.size;
  const uploadId = await actor.beginVideoUpload(contentType, BigInt(total));

  try {
    const chunkCount = Math.ceil(total / CHUNK_BYTES);
    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_BYTES;
      const slice = file.slice(start, Math.min(start + CHUNK_BYTES, total));
      const bytes = new Uint8Array(await slice.arrayBuffer());
      await actor.uploadVideoChunk(uploadId, BigInt(i), bytes);
      // Reserve the last 10% for the finalize (asset-canister forwarding).
      onProgress(((i + 1) / chunkCount) * 0.9);
    }

    const result = await actor.finishVideoUpload(
      uploadId,
      poster ? [poster] : [],
    );
    onProgress(1);
    return {
      videoKey: result.videoKey,
      posterKey: result.posterKey.length > 0 ? (result.posterKey[0] ?? null) : null,
    };
  } catch (e) {
    // Free the server-side buffer; ignore failures (session expires anyway).
    try {
      await actor.cancelVideoUpload(uploadId);
    } catch {
      /* best-effort */
    }
    throw e;
  }
}
