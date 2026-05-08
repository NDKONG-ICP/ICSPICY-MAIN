import { Flame, Library, Search, Lock } from "lucide-react";
import { motion } from "motion/react";
import { Link, NavLink } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { SocialIcons } from "./SocialLinks";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onOpenCommand: () => void;
}

const NAV: { to: string; label: string }[] = [
  { to: "/", label: "Overview" },
  { to: "/library", label: "Library" },
];

export function Header({ onOpenCommand }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 backdrop-blur-xl">
      <div className="absolute inset-0 -z-10 bg-bg/70" />
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.span
            whileHover={{ rotate: -8, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-ember via-ember to-gold shadow-ember"
          >
            <Flame className="h-4 w-4 text-bg" strokeWidth={2} />
          </motion.span>
          <span className="display text-lg font-semibold tracking-tight text-ink">
            IC <span className="ember-text">SPICY</span>
            <span className="ml-1 text-xs uppercase tracking-[0.3em] text-muted">
              Library
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-elevated/70 text-ink shadow-soft"
                    : "text-muted hover:text-ink",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCommand}
            className="hidden items-center gap-2 rounded-full border border-line/80 bg-elevated/40 px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold hover:text-ink sm:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search documents</span>
            <kbd className="ml-2 rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[10px] text-muted">
              ⌘K
            </kbd>
          </button>
          <Link
            to="/library"
            className="hidden items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-bg transition-opacity hover:opacity-90 sm:inline-flex"
          >
            <Library className="h-3.5 w-3.5" />
            Browse Library
          </Link>

          {/* Social links — visible on medium screens and up */}
          <span className="hidden h-4 w-px bg-line/50 md:block" aria-hidden="true" />
          <SocialIcons className="hidden md:flex" />
          <span className="hidden h-4 w-px bg-line/50 md:block" aria-hidden="true" />

          <Link
            to="/admin"
            title="Admin panel"
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-elevated/60 hover:text-ink"
          >
            <Lock className="h-3.5 w-3.5" />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
