import { ConnectButton } from "@/components/ConnectButton";
import { NotificationBell } from "@/components/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Flame,
  Menu,
  ShoppingCart,
  User,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { SiFacebook, SiInstagram, SiTiktok, SiX } from "react-icons/si";
import { useNewOrderCountAdmin } from "../hooks/useAdminShop";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin } from "../hooks/useBackend";
import { useCart } from "../hooks/useCart";
import { useRavenPerks } from "../hooks/useRavenPerks";
import { SOCIAL_LINKS } from "../types/index";

const PRIMARY_NAV = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/marketplace" },
  { label: "NIMS", to: "/nims" },
  { label: "Games", to: "/games", badge: "🌶️" as const },
  { label: "Masterclass", to: "/masterclass" },
  { label: "Community Garden", to: "/community" },
  { label: "CookBook", to: "/cookbook" },
] as const;

const MORE_NAV_ALWAYS = [
  { label: "Garden (Beta)", to: "/garden" },
  { label: "📖 Growing Guides", to: "/guides" },
  { label: "🌱 Grower Directory", to: "/growers" },
  { label: "Schedule Builder", to: "/schedule-builder" },
  { label: "DAO", to: "/dao" },
  { label: "🐦‍⬛ Membership Tiers", to: "/tiers" },
] as const;

const DOCS_URL = "https://pr3bu-6aaaa-aaaao-ba5ba-cai.icp0.io";

const SOCIAL_ICONS = [
  { href: SOCIAL_LINKS.facebook, Icon: SiFacebook, label: "Facebook" },
  { href: SOCIAL_LINKS.x, Icon: SiX, label: "X (Twitter)" },
  { href: SOCIAL_LINKS.instagram, Icon: SiInstagram, label: "Instagram" },
  { href: SOCIAL_LINKS.tiktok, Icon: SiTiktok, label: "TikTok" },
] as const;

function navLinkClasses(active: boolean) {
  return [
    "px-3 py-2 rounded-md text-sm font-medium transition-smooth",
    active
      ? "text-primary bg-primary/10"
      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
  ].join(" ");
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: newOrderCount = 0 } = useNewOrderCountAdmin();
  const ravenPerks = useRavenPerks();
  const itemCount = useCart((s) => s.itemCount());
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const mobileLinks = useMemo(() => {
    const adminEntry =
      isAdmin === true ? ([{ label: "Admin", to: "/admin" }] as const) : [];
    const profileEntry =
      !isInitializing && isAuthenticated
        ? ([{ label: "Profile", to: "/profile" }] as const)
        : [];
    return [
      ...PRIMARY_NAV,
      ...MORE_NAV_ALWAYS,
      ...adminEntry,
      ...profileEntry,
      { label: "Wallet", to: "/wallet" },
    ];
  }, [isAdmin, isAuthenticated, isInitializing]);

  const moreMenuOpen =
    MORE_NAV_ALWAYS.some(({ to }) => currentPath === to) ||
    (isAdmin === true && currentPath === "/admin");

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
            {PRIMARY_NAV.map(({ label, to, ...rest }) => (
              <Link
                key={to}
                to={to}
                className={navLinkClasses(currentPath === to)}
              >
                <span className="inline-flex items-center gap-1">
                  {label}
                  {"badge" in rest && rest.badge != null && (
                    <span
                      className="text-[10px] leading-none opacity-90"
                      aria-hidden
                    >
                      {rest.badge}
                    </span>
                  )}
                </span>
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-ocid="header-more-trigger"
                  className={[
                    "inline-flex items-center gap-0.5 px-3 py-2 rounded-md text-sm font-medium transition-smooth outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
                    moreMenuOpen
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  More
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" data-ocid="header-more-menu">
                {MORE_NAV_ALWAYS.map(({ label, to }) => (
                  <DropdownMenuItem key={to} asChild>
                    <Link
                      to={to}
                      data-ocid={`header-more-${to.replace("/", "") || "home"}`}
                    >
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {isAdmin === true && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/admin"
                      className={
                        currentPath === "/admin"
                          ? "bg-primary/10 text-primary focus:bg-primary/15"
                          : ""
                      }
                      data-ocid="header-admin-link"
                    >
                      <span className="flex items-center gap-2">
                        Admin
                        {newOrderCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="h-5 min-w-5 px-1.5 text-[10px] font-semibold"
                          >
                            {newOrderCount > 99 ? "99+" : newOrderCount}
                          </Badge>
                        )}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="header-docs-link"
                  >
                    📚 Docs
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

            {/* Raven tier badge — desktop */}
            {isAuthenticated && ravenPerks.tier !== "free" && (
              <Link
                to="/tiers"
                className="hidden md:flex items-center"
                aria-label="Raven tier"
                data-ocid="header-raven-badge"
              >
                <span
                  className={
                    ravenPerks.tier === "pro"
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full text-xs font-bold"
                      : "bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full text-xs font-bold"
                  }
                >
                  🐦‍⬛ {ravenPerks.tier === "pro" ? "PRO" : "MEMBER"}
                </span>
              </Link>
            )}

            {/* Notifications */}
            {isAuthenticated && <NotificationBell />}

            {/* Wallet */}
            <Link
              to="/wallet"
              className={[
                "p-2 rounded-md transition-smooth",
                currentPath === "/wallet"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
              aria-label="Wallet"
              data-ocid="header-wallet-link"
            >
              <Wallet className="w-5 h-5" />
            </Link>

            {/* Profile shortcut — xs only (duplicate of bottom nav Cluster) */}
            {!isInitializing && isAuthenticated && (
              <Link
                to="/profile"
                className={[
                  "sm:hidden p-2 rounded-md transition-smooth",
                  currentPath === "/profile"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
                aria-label="Profile"
                data-ocid="header-profile-icon-mobile"
              >
                <User className="w-5 h-5" />
              </Link>
            )}

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

            {/* Internet Identity + profile — full row sm+ ; mobile drawer has Connect */}
            <div
              className="hidden sm:flex items-center gap-2"
              data-ocid="header-wallet"
            >
              {!isInitializing && isAuthenticated && (
                <Link to="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={[
                      "text-muted-foreground hover:text-foreground",
                      currentPath === "/profile"
                        ? "text-primary bg-primary/10"
                        : "",
                    ].join(" ")}
                    data-ocid="header-profile"
                  >
                    Profile
                  </Button>
                </Link>
              )}
              <ConnectButton />
            </div>

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
              {mobileLinks.map(({ label, to }) => {
                const isAdminLink = to === "/admin";
                return (
                  <Link
                    key={`${label}-${to}`}
                    to={to}
                    className={[
                      "block px-3 py-2 rounded-md text-sm font-medium transition-smooth",
                      currentPath === to
                        ? "text-primary bg-primary/10"
                        : isAdminLink
                          ? "text-fire hover:text-fire/80 hover:bg-fire/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                    ].join(" ")}
                    onClick={() => setMobileOpen(false)}
                    data-ocid={
                      isAdminLink ? "header-admin-link-mobile" : undefined
                    }
                  >
                    <span className="flex items-center gap-2">
                      {label}
                      {isAdminLink && newOrderCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-5 min-w-5 px-1.5 text-[10px] font-semibold"
                        >
                          {newOrderCount > 99 ? "99+" : newOrderCount}
                        </Badge>
                      )}
                    </span>
                  </Link>
                );
              })}

              <div className="pt-3 border-t border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth px-1"
                    data-ocid="header-docs-link-mobile"
                    onClick={() => setMobileOpen(false)}
                  >
                    📚 Docs
                  </a>
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
                <div className="flex justify-end">
                  <ConnectButton />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
