import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useRouterState } from "@tanstack/react-router";
import { Flame, Menu, ShoppingCart, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { SiFacebook, SiInstagram, SiTiktok, SiX } from "react-icons/si";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { SOCIAL_LINKS } from "../types/index";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/marketplace" },
  { label: "Plants", to: "/plants" },
  { label: "CookBook", to: "/cookbook" },
  { label: "Schedule Builder", to: "/schedule-builder" },
  { label: "Community", to: "/community" },
  { label: "DAO", to: "/dao" },
  { label: "Wallet", to: "/wallet" },
] as const;

const SOCIAL_ICONS = [
  { href: SOCIAL_LINKS.facebook, Icon: SiFacebook, label: "Facebook" },
  { href: SOCIAL_LINKS.x, Icon: SiX, label: "X (Twitter)" },
  { href: SOCIAL_LINKS.instagram, Icon: SiInstagram, label: "Instagram" },
  { href: SOCIAL_LINKS.tiktok, Icon: SiTiktok, label: "TikTok" },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, login, logout, isInitializing } = useAuth();
  const itemCount = useCart((s) => s.itemCount());
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <header
      className="sticky top-0 z-50 bg-card border-b border-border shadow-subtle"
      data-ocid="header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
            data-ocid="header-logo"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-elevated group-hover:scale-110 transition-smooth">
              <Flame className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              IC <span className="text-fire">SPICY</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden md:flex items-center gap-1"
            data-ocid="header-nav"
          >
            {NAV_LINKS.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className={[
                  "px-3 py-2 rounded-md text-sm font-medium transition-smooth",
                  currentPath === to
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                ].join(" ")}
              >
                {label}
              </Link>
            ))}
            {/* NIMS link — always visible to everyone */}
            <Link
              to="/nims"
              className={[
                "px-3 py-2 rounded-md text-sm font-medium transition-smooth",
                currentPath === "/nims"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              ].join(" ")}
              data-ocid="header-nims-link"
            >
              NIMS
            </Link>
            {/* Admin link — always visible; access is gated inside the route */}
            <Link
              to="/admin"
              className={[
                "px-3 py-2 rounded-md text-sm font-medium transition-smooth",
                currentPath === "/admin"
                  ? "text-primary bg-primary/10"
                  : "text-fire hover:text-fire/80 hover:bg-fire/10",
              ].join(" ")}
              data-ocid="header-admin-link"
            >
              Admin
            </Link>
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-3">
            {/* Social icons — desktop */}
            <div
              className="hidden lg:flex items-center gap-2"
              data-ocid="header-social"
            >
              {SOCIAL_ICONS.map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-smooth"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            {/* Cart */}
            <Link
              to="/checkout"
              className="relative p-2 rounded-md text-muted-foreground hover:text-foreground transition-smooth"
              aria-label="Shopping cart"
              data-ocid="header-cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground border-0">
                  {itemCount}
                </Badge>
              )}
            </Link>

            {/* Auth */}
            {!isInitializing &&
              (isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-2">
                  <Link to="/profile">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      data-ocid="header-profile"
                    >
                      Profile
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    data-ocid="header-logout"
                    className="border-border"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={login}
                  disabled={isInitializing}
                  data-ocid="header-login"
                  className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Connect
                </Button>
              ))}

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground transition-smooth"
              aria-label="Toggle mobile menu"
              data-ocid="header-mobile-menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-card border-t border-border overflow-hidden"
            data-ocid="header-mobile-nav"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  className={[
                    "block px-3 py-2 rounded-md text-sm font-medium transition-smooth",
                    currentPath === to
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  ].join(" ")}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
              {/* NIMS mobile link — always visible to everyone */}
              <Link
                to="/nims"
                className={[
                  "block px-3 py-2 rounded-md text-sm font-medium transition-smooth",
                  currentPath === "/nims"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                ].join(" ")}
                onClick={() => setMobileOpen(false)}
                data-ocid="header-nims-link-mobile"
              >
                NIMS
              </Link>
              {/* Admin mobile link — always visible; access is gated inside the route */}
              <Link
                to="/admin"
                className={[
                  "block px-3 py-2 rounded-md text-sm font-medium transition-smooth",
                  currentPath === "/admin"
                    ? "text-primary bg-primary/10"
                    : "text-fire hover:text-fire/80 hover:bg-fire/10",
                ].join(" ")}
                onClick={() => setMobileOpen(false)}
                data-ocid="header-admin-link-mobile"
              >
                Admin
              </Link>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {SOCIAL_ICONS.map(({ href, Icon, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="p-1.5 text-muted-foreground hover:text-primary transition-smooth"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
                {!isInitializing &&
                  (isAuthenticated ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={logout}
                      className="border-border"
                    >
                      Sign Out
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={login}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Connect
                    </Button>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
