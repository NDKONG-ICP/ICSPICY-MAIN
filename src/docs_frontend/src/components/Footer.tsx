import { Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { SocialIcons } from "./SocialLinks";

const EXPLORE_LINKS = [
  { to: "/", label: "Overview" },
  { to: "/library", label: "Documents" },
  { to: "/library?category=vision", label: "Whitepaper" },
  { to: "/chat", label: "SpicyAI" },
];

const RESOURCE_LINKS = [
  { href: "/library/branded-whitepaper", label: "Whitepaper" },
  { href: "/library/roadmap", label: "Roadmap" },
  { href: "/library/pepperhead-membership-guide", label: "PepperHead NFTs" },
  { href: "/library/spicy-utility-explainer", label: "SPICY Token" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line/40 mt-24">
      <div className="container py-12">
        {/* Top: logo + columns */}
        <div className="grid gap-10 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-ember to-gold shadow-ember">
                <Flame className="h-3.5 w-3.5 text-bg" strokeWidth={2} />
              </span>
              <span className="display text-sm font-semibold tracking-tight text-ink">
                IC <span className="ember-text">SPICY</span>
              </span>
            </div>
            <p className="text-xs font-medium tracking-[0.1em] uppercase text-muted mb-3">
              Rare. Hot. Alive.
            </p>
            <p className="text-xs text-muted/70 leading-relaxed max-w-[20ch]">
              Florida-grown rare peppers. On-chain provenance on the Internet
              Computer.
            </p>
            <SocialIcons className="mt-4" />
          </div>

          {/* Explore */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted mb-4">
              Explore
            </p>
            <ul className="space-y-2.5">
              {EXPLORE_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted/80 hover:text-ink transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted mb-4">
              Resources
            </p>
            <ul className="space-y-2.5">
              {RESOURCE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    to={l.href}
                    className="text-sm text-muted/80 hover:text-ink transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="/documents/llms.txt"
                  className="text-sm text-muted/80 hover:text-ink transition-colors"
                >
                  LLMs.txt
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-line/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted/60">
          <p>© {year} IC SPICY RWA. Built on the Internet Computer.</p>
          <a
            href="/admin"
            className="opacity-40 hover:opacity-100 transition-opacity"
          >
            Admin
          </a>
        </div>
      </div>
    </footer>
  );
}
