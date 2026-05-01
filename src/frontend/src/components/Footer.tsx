import { Link } from "@tanstack/react-router";
import { Award, Flame, MapPin } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { SOCIAL_LINKS } from "../types/index";

const SOCIAL_ICONS = [
  { href: SOCIAL_LINKS.facebook, Icon: SiFacebook, label: "Facebook" },
  { href: SOCIAL_LINKS.x, Icon: SiX, label: "X (Twitter)" },
  { href: SOCIAL_LINKS.instagram, Icon: SiInstagram, label: "Instagram" },
  { href: SOCIAL_LINKS.tiktok, Icon: SiTiktok, label: "TikTok" },
  {
    href: "https://www.youtube.com/@icspicyrwa",
    Icon: SiYoutube,
    label: "YouTube",
  },
] as const;

const FOOTER_LINKS = [
  {
    title: "Shop",
    links: [
      { label: "All Products", to: "/marketplace" },
      { label: "Seedlings ($6)", to: "/marketplace" },
      { label: "1-Gallon ($25)", to: "/marketplace" },
      { label: "5-Gallon ($45)", to: "/marketplace" },
      { label: "Artisan Spices ($12)", to: "/marketplace" },
      { label: "Garden Inputs", to: "/marketplace" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Plant NFTs", to: "/plants" },
      { label: "DAO Governance", to: "/dao" },
      { label: "Community", to: "/community" },
      { label: "My Orders", to: "/orders" },
      { label: "Profile", to: "/profile" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "NIMS Inventory", to: "/nims" },
      { label: "Schedule Builder", to: "/schedule-builder" },
      { label: "CookBook", to: "/cookbook" },
      { label: "My Wallet", to: "/wallet" },
    ],
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`;

  return (
    <footer className="bg-card border-t border-border" data-ocid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                <Flame className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-foreground">
                IC <span className="text-fire">SPICY</span>
              </span>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed mb-4 max-w-sm">
              Growing the world's rarest and hottest chili peppers for 30+ years
              using regenerative KNF &amp; JADAM methods in USDA Zone 10a.
            </p>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
              <MapPin className="w-4 h-4 flex-shrink-0 text-primary" />
              <span>Port Charlotte, FL</span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
              <Award className="w-4 h-4 flex-shrink-0 text-primary" />
              <span>FDACS Registered Nursery</span>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3" data-ocid="footer-social">
              {SOCIAL_ICONS.map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-smooth"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {FOOTER_LINKS.map(({ title, links }) => (
            <div key={title}>
              <h4 className="font-display font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {year} IC SPICY. All rights reserved. Port Charlotte, FL. FDACS
            Registered Nursery.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with love using{" "}
            <a
              href={caffeineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
