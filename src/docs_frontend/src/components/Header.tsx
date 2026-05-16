import { cn } from "@/lib/utils";
import { Flame, Lock, MessageSquare, Search } from "lucide-react";
import { motion } from "motion/react";
import { Link, NavLink } from "react-router-dom";
import { SocialIcons } from "./SocialLinks";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  onOpenCommand: () => void;
}

const NAV: { to: string; label: string }[] = [
  { to: "/", label: "Overview" },
  { to: "/library", label: "Documents" },
  { to: "/chat", label: "SpicyAI" },
];

export function Header({ onOpenCommand }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/40 backdrop-blur-xl">
      <div className="absolute inset-0 -z-10 bg-bg/80" />
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <motion.span
            whileHover={{ rotate: -8, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-ember via-ember to-gold shadow-ember"
          >
            <Flame className="h-4 w-4 text-bg" strokeWidth={2} />
          </motion.span>
          <span className="display text-base font-semibold tracking-tight text-ink">
            IC <span className="ember-text">SPICY</span>
            <span className="ml-1.5 text-[10px] uppercase tracking-[0.3em] text-muted">
              RWA
            </span>
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-elevated/60 text-ink"
                    : "text-muted hover:text-ink",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCommand}
            aria-label="Search documents"
            className="hidden items-center gap-2 rounded-full border border-line/60 bg-elevated/30 px-3 py-1.5 text-xs text-muted transition-colors hover:border-line hover:text-ink sm:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="ml-1 rounded bg-elevated/60 px-1.5 py-0.5 font-mono text-[10px] text-muted/80">
              ⌘K
            </kbd>
          </button>

          <Link
            to="/chat"
            className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-ember to-gold px-4 py-1.5 text-xs font-semibold text-bg shadow-ember transition-all hover:-translate-y-0.5 sm:inline-flex"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ask SpicyAI
          </Link>

          <span
            className="hidden h-4 w-px bg-line/40 md:block"
            aria-hidden="true"
          />
          <SocialIcons className="hidden md:flex" />
          <span
            className="hidden h-4 w-px bg-line/40 md:block"
            aria-hidden="true"
          />

          <Link
            to="/admin"
            title="Admin panel"
            className="grid h-8 w-8 place-items-center rounded-full text-muted/60 transition-colors hover:bg-elevated/60 hover:text-ink"
          >
            <Lock className="h-3.5 w-3.5" />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
