import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Backend } from "../../backend";
import { useActor } from "../../hooks/useActor";
import { useAuth } from "../../hooks/useAuth";
import { useCreateChallengePost } from "../../hooks/useChallenge";
import { useMyCommunityProfile } from "../../hooks/useProfile";
import {
  MAX_COMMUNITY_IMAGE_FILES,
  uploadCommunityImages,
} from "../../lib/community-image-upload";

const MAX_CHARS = 2000;

export function ChallengePostComposer({
  challengeId,
  onPublished,
}: {
  challengeId: string;
  onPublished?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [picked, setPicked] = useState<File[]>([]);
  const { actor } = useActor<Backend>();
  const { principal, isAuthenticated, login } = useAuth();
  const principalText = principal?.toText() ?? "";
  const { data: mine } = useMyCommunityProfile();
  const createPost = useCreateChallengePost(challengeId);

  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = picked.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [picked]);

  const profileReady =
    !!mine && typeof mine.username === "string" && mine.username.trim().length > 0;

  const canPost =
    isAuthenticated &&
    profileReady &&
    content.trim().length > 0 &&
    content.trim().length <= MAX_CHARS &&
    !!actor &&
    !!principalText;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !principalText) {
      login();
      return;
    }
    if (!profileReady) {
      toast.error("Create your profile first.");
      return;
    }
    if (!canPost || !actor) return;

    try {
      let imageKeys: string[] = [];
      if (picked.length > 0) {
        imageKeys = await uploadCommunityImages(actor, principalText, picked);
      }
      await createPost.mutateAsync({
        content: content.trim(),
        anonymous: false,
        image_key: imageKeys[0] ? [imageKeys[0]] : [],
        image_keys: imageKeys,
        plant_id: [],
        nft_token_id: [],
      });
      setContent("");
      setPicked([]);
      toast.success("Check-in posted");
      onPublished?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    }
  };

  return (
    <form className="wg-composer" onSubmit={(e) => void submit(e)}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Weekly check-in — how’s the plant looking?"
        maxLength={MAX_CHARS}
        rows={4}
        className="bg-black/40 border-white/15 text-white placeholder:text-white/40"
      />
      {previews.length > 0 ? (
        <div className="wg-composer-previews">
          {previews.map((src, i) => (
            <div key={src} className="wg-composer-preview">
              <img src={src} alt="" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() =>
                  setPicked((prev) => prev.filter((_, idx) => idx !== i))
                }
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="wg-composer-actions">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])].filter((f) =>
              f.type.startsWith("image/"),
            );
            setPicked((prev) =>
              [...prev, ...files].slice(0, MAX_COMMUNITY_IMAGE_FILES),
            );
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-cyan-400/40 text-cyan-200"
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon className="w-4 h-4 mr-1" />
          Progress photo
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!canPost || createPost.isPending}
          className="bg-[var(--wg-crimson)] hover:bg-[var(--wg-crimson)]/90 text-white"
        >
          {createPost.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : null}
          Post check-in
        </Button>
      </div>
    </form>
  );
}
