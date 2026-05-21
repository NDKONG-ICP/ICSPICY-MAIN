import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  ExternalLink,
  Facebook,
  ImageIcon,
  Send,
  Share2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { PostId } from "../../declarations/backend.did";
import { communitySharePostUrl } from "../../lib/community-utils";
import { SOCIAL_LINKS } from "../../types/index";

export function ShareMenu({
  postId,
  previewText,
}: {
  postId: PostId;
  previewText?: string;
}) {
  const url = communitySharePostUrl(postId);
  const snippet = previewText?.trim().slice(0, 140) ?? "Check out this post";

  const copyLink = () => {
    void navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied");
    });
  };

  const copyInstagram = () => {
    const msg = `Open IC SPICY:\n${url}\nInstagram hub: ${SOCIAL_LINKS.instagram}\n(Open the app and paste wherever you normally share harvest updates.)`;

    void navigator.clipboard.writeText(msg).then(() => {
      toast.success("Instagram share text copied");
    });
  };

  const copyTikTok = () => {
    const msg = `${snippet}\n${url}\nCatch more on TikTok: ${SOCIAL_LINKS.tiktok}`;

    void navigator.clipboard.writeText(msg).then(() => {
      toast.success("TikTok caption/snippet copied");
    });
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${snippet} — @icspicyrwa`);

  const openFb = SOCIAL_LINKS.facebook;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-smooth"
          data-ocid="community-share-trigger"
          aria-label="Share post"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          Share
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="rounded-xl bg-card border border-border shadow-elevated w-56"
      >
        <DropdownMenuItem
          className="text-xs flex gap-2 focus:text-blue-400"
          onClick={() =>
            window.open(
              `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
              "_blank",
            )
          }
        >
          <Facebook className="w-3.5 h-3.5 shrink-0" />
          Share on Facebook
          <ExternalLink className="w-3 h-3 ml-auto opacity-60 shrink-0" />
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs flex gap-2"
          onClick={() =>
            window.open(
              `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
              "_blank",
            )
          }
        >
          <X className="w-3.5 h-3.5 shrink-0" />
          Post on X
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs flex gap-2 focus:text-pink-400"
          onClick={() => window.open(openFb, "_blank")}
        >
          <Facebook className="w-3.5 h-3.5 shrink-0 opacity-70" />
          IC SPICY Facebook page
          <ExternalLink className="w-3 h-3 ml-auto opacity-60 shrink-0" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs flex gap-2 focus:text-pink-400"
          onClick={() => window.open(SOCIAL_LINKS.instagram, "_blank")}
        >
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          Open Instagram hub
          <ExternalLink className="w-3 h-3 ml-auto opacity-60 shrink-0" />
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs flex gap-2 focus:text-cyan-400"
          onClick={copyInstagram}
        >
          <Copy className="w-3.5 h-3.5 shrink-0" />
          Copy IG share text…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs flex gap-2"
          onClick={() => window.open(SOCIAL_LINKS.tiktok, "_blank")}
        >
          <Send className="w-3.5 h-3.5 shrink-0 opacity-70" />
          Open TikTok hub
          <ExternalLink className="w-3 h-3 ml-auto opacity-60 shrink-0" />
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs flex gap-2 focus:text-cyan-400"
          onClick={copyTikTok}
        >
          <Copy className="w-3.5 h-3.5 shrink-0" />
          Copy TikTok caption/snippet…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs flex gap-2" onClick={copyLink}>
          <Copy className="w-3.5 h-3.5 shrink-0" />
          Copy canonical link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
