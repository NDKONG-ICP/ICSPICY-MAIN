import { cn } from "@/lib/utils";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.93a8.2 8.2 0 0 0 4.83 1.55V7.01a4.85 4.85 0 0 1-1.06-.32Z" />
    </svg>
  );
}

export const SOCIAL_LINKS = [
  {
    label: "X (Twitter)",
    href: "https://x.com/icspicyrwa?s=21",
    icon: <Twitter className="h-3.5 w-3.5" />,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@icspicyrwa?_r=1&_t=ZP-93jkqSSwaXW",
    icon: <TikTokIcon className="h-3.5 w-3.5" />,
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@ic-spicy?sub_confirmation=1",
    icon: <Youtube className="h-3.5 w-3.5" />,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/icspicyrwa?igsh=MXAzc2RoYW1mN2t2aw==",
    icon: <Instagram className="h-3.5 w-3.5" />,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/18FY3jmLuY/?mibextid=wwXIfr",
    icon: <Facebook className="h-3.5 w-3.5" />,
  },
] as const;

interface SocialIconsProps {
  className?: string;
  iconClassName?: string;
}

export function SocialIcons({ className, iconClassName }: SocialIconsProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {SOCIAL_LINKS.map(({ label, href, icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-elevated/60 hover:text-ink",
            iconClassName,
          )}
        >
          {icon}
        </a>
      ))}
    </div>
  );
}
