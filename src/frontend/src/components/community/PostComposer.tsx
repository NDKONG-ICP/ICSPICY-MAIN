import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Backend } from "../../backend";
import type { CreatePostInput } from "../../declarations/backend.did";
import { useActor } from "../../hooks/useActor";
import { useAuth } from "../../hooks/useAuth";
import { usePlants } from "../../hooks/useBackend";
import { useMyNftTokenIds } from "../../hooks/useMyNftIds";
import { useCreatePost } from "../../hooks/usePost";
import { useMyCommunityProfile } from "../../hooks/useProfile";
import {
  MAX_COMMUNITY_IMAGE_FILES,
  uploadCommunityImages,
} from "../../lib/community-image-upload";

const MAX_CHARS = 2000;

export function PostComposer({
  onPublished,
}: {
  onPublished?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [picked, setPicked] = useState<File[]>([]);
  const [plantSel, setPlantSel] = useState<string>("__none");
  const [nftSel, setNftSel] = useState<string>("__none");

  const { actor } = useActor<Backend>();
  const { principal, isAuthenticated, login } = useAuth();
  const principalText = principal?.toText() ?? "";

  const { data: mine, isPending: minePending } = useMyCommunityProfile();
  const { data: plants = [], isPending: plantsPending } = usePlants();
  const { data: nftIds = [], isPending: nftIdsPending } = useMyNftTokenIds();
  const createPost = useCreatePost();

  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = picked.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [picked]);

  const profileReady =
    !!mine &&
    typeof mine.username === "string" &&
    mine.username.trim().length > 0;

  const sortedPlants = useMemo(
    () => [...plants].sort((a, b) => Number(a.id - b.id)),
    [plants],
  );
  const sortedNfts = useMemo(
    () => [...nftIds].sort((a, b) => Number(a - b)),
    [nftIds],
  );

  const canPost =
    isAuthenticated &&
    profileReady &&
    content.trim().length > 0 &&
    content.trim().length <= MAX_CHARS &&
    !!actor &&
    !!principalText;

  const addFilesFromInput = (list: FileList | null) => {
    const next = [...picked];
    for (
      let i = 0;
      list && i < list.length && next.length < MAX_COMMUNITY_IMAGE_FILES;
      i++
    ) {
      const file = list[i]!;
      if (!file.type.startsWith("image/")) {
        toast.error("Attachments must be photos.");
        continue;
      }
      next.push(file);
    }
    if (list?.length && next.length > MAX_COMMUNITY_IMAGE_FILES) {
      toast.message(`Carousel caps at ${MAX_COMMUNITY_IMAGE_FILES} images.`);
    }
    setPicked(next.slice(0, MAX_COMMUNITY_IMAGE_FILES));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !principal || !principalText) {
      login();
      return;
    }
    if (minePending || !mine) {
      toast.message("Fetching your garden profile…");
      return;
    }
    if (!profileReady) {
      toast.error(
        "Finish your IC SPICY profile (display name) before posting publicly.",
      );
      return;
    }

    const text = content.trim();
    if (!text.length || text.length > MAX_CHARS) {
      toast.error("Keep posts between 1 and 2000 characters.");
      return;
    }

    if (!actor) {
      toast.error("Backend reconnecting…");
      return;
    }

    try {
      const uploaded =
        picked.length === 0
          ? []
          : await uploadCommunityImages(actor, principalText, picked);

      const payload: CreatePostInput = {
        content: text,
        anonymous,
        plant_id: plantSel === "__none" ? [] : [BigInt(plantSel)],
        nft_token_id: nftSel === "__none" ? [] : [BigInt(nftSel)],
        image_key: [],
        image_keys: uploaded,
      };

      await createPost.mutateAsync(payload);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not publish post.",
      );
      return;
    }

    toast.success("Posted to the community feed.");
    setContent("");
    setAnonymous(false);
    setPicked([]);
    setPlantSel("__none");
    setNftSel("__none");
    if (fileRef.current) fileRef.current.value = "";
    onPublished?.();
  };

  const busy = createPost.isPending;

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-card border border-primary/25 p-4 sm:p-5 space-y-4 shadow-elevated"
      data-ocid="community-post-composer"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-display font-semibold text-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          New post
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {content.length}/{MAX_CHARS}
        </span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX_CHARS}
        rows={5}
        placeholder="Share grow notes, pheno hunts, recipes, or ask the farm…"
        className="resize-none text-sm min-h-[120px] bg-muted/30 border-border"
      />

      {picked.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {picked.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="relative rounded-lg border border-border overflow-hidden aspect-square bg-muted/40"
            >
              <img
                src={previews[i] ?? ""}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                className="absolute top-1 right-1 rounded-full bg-background/80 p-1 text-xs"
                onClick={() =>
                  setPicked((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-smooth"
          onClick={() => fileRef.current?.click()}
          disabled={picked.length >= MAX_COMMUNITY_IMAGE_FILES}
        >
          <ImageIcon className="w-4 h-4" />
          Add photos ({picked.length}/{MAX_COMMUNITY_IMAGE_FILES})
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFilesFromInput(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="inline-flex items-center gap-2">
          <Checkbox
            id="community-post-anonymous"
            checked={anonymous}
            onCheckedChange={(v) => setAnonymous(v === true)}
          />
          <Label
            htmlFor="community-post-anonymous"
            className="cursor-pointer select-none text-xs text-muted-foreground"
          >
            Post anonymously
          </Label>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">
            Link plant (optional)
          </Label>
          <Select
            value={plantSel}
            onValueChange={setPlantSel}
            disabled={plantsPending || !isAuthenticated}
          >
            <SelectTrigger className="h-10 text-xs border-border bg-muted/30">
              <SelectValue placeholder="Choose from your plants" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="__none" className="text-xs">
                None
              </SelectItem>
              {sortedPlants.map((p) => (
                <SelectItem
                  key={p.id.toString()}
                  value={p.id.toString()}
                  className="text-xs"
                >
                  #{p.id.toString()} · {p.variety}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">
            Link NFT (optional)
          </Label>
          <Select
            value={nftSel}
            onValueChange={setNftSel}
            disabled={nftIdsPending || !isAuthenticated}
          >
            <SelectTrigger className="h-10 text-xs border-border bg-muted/30">
              <SelectValue placeholder="Choose from your wallet" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="__none" className="text-xs">
                None
              </SelectItem>
              {sortedNfts.map((id) => (
                <SelectItem
                  key={id.toString()}
                  value={id.toString()}
                  className="text-xs"
                >
                  Token #{id.toString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isAuthenticated ? (
        <p className="text-[11px] text-primary">
          Sign in with Internet Identity to publish.
        </p>
      ) : !profileReady && !minePending ? (
        <p className="text-[11px] text-destructive">
          Add a display name in your profile before joining the feed.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          className="bg-primary hover:bg-primary/90 text-xs gap-2"
          disabled={!canPost || busy}
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Publishing…
            </>
          ) : (
            "Publish"
          )}
        </Button>
      </div>
    </form>
  );
}
