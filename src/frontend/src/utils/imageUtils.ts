/**
 * Pure canvas-based image compression utility.
 * No external storage or blob service dependencies.
 */

const COMPRESSION_THRESHOLD = 500_000; // 500 KB
const COMPRESSION_QUALITY = 0.82;
const MAX_DIMENSION = 2048;

/**
 * Compress a File using the Canvas API.
 * Returns the original File unchanged if it is already under the threshold.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (file.size <= COMPRESSION_THRESHOLD) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        },
        "image/jpeg",
        COMPRESSION_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };
    img.src = objectUrl;
  });
}
