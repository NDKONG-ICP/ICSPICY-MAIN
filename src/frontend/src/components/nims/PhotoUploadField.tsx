import { Camera, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NimsStoredPhoto } from "./NimsStoredPhoto";

export type PhotoUploadFieldProps = {
  label?: string;
  path: string | null;
  onPathChange: (path: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  disabled?: boolean;
  /** Shown while parent handles async upload before path is set */
  uploading?: boolean;
};

export function PhotoUploadField({
  label = "Photo evidence",
  path,
  onPathChange,
  onUpload,
  disabled = false,
  uploading = false,
}: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localUploading, setLocalUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = uploading || localUploading;

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled || busy) return;
    setError(null);
    setLocalUploading(true);
    try {
      const storagePath = await onUpload(file);
      onPathChange(storagePath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLocalUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2" data-ocid="nims-photo-upload-field">
      <Label>{label}</Label>
      {path ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <NimsStoredPhoto
            path={path}
            alt="Uploaded plant photo"
            className="aspect-video w-full object-cover"
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-2 top-2 size-8"
            disabled={disabled || busy}
            onClick={() => onPathChange(null)}
            aria-label="Remove photo"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full flex-col gap-2 py-6"
          disabled={disabled || busy}
          data-ocid="nims-photo-upload-trigger"
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-6 animate-spin" aria-hidden />
          ) : (
            <Camera className="size-6" aria-hidden />
          )}
          <span className="text-xs">{busy ? "Uploading…" : "Add photo"}</span>
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        data-ocid="nims-photo-file-input"
        disabled={disabled || busy}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
