import { Principal } from "@icp-sdk/core/principal";
import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Backend } from "../../backend";
import { createActor } from "../../backend";
import { useActor } from "../../hooks/useActor";
import { uploadAvatar } from "../../lib/avatar-upload";
import { CommunityAvatar } from "./CommunityAvatar";

export function AvatarUpload({
  principalText,
  username,
  avatarKey,
  onAvatarKey,
  size = "lg",
}: {
  principalText: string;
  username?: string;
  avatarKey?: string;
  onAvatarKey: (key: string) => void;
  size?: "md" | "lg";
}) {
  const { actor } = useActor<Backend>(createActor);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const dim = size === "lg" ? "w-24 h-24" : "w-16 h-16";

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const key = await uploadAvatar(actor, file);
      onAvatarKey(key);
      toast.success("Avatar uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Avatar upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2" data-ocid="avatar-upload">
      <button
        type="button"
        className={`relative ${dim} rounded-full ring-2 ring-border overflow-hidden group`}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Upload avatar"
      >
        <CommunityAvatar
          principalText={principalText}
          username={username}
          avatarKey={avatarKey}
          className={`${dim} text-lg`}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <p className="text-[11px] text-muted-foreground">Click to upload photo</p>
    </div>
  );
}

export function principalTextFromOpt(
  p: [] | [Principal] | Principal | undefined,
): string | undefined {
  if (!p) return undefined;
  if (p instanceof Principal) return p.toText();
  return p.length === 1 ? p[0]!.toText() : undefined;
}
