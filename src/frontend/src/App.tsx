import { useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ActorReadyProvider } from "./components/ActorReadyProvider";
import { Layout } from "./components/Layout";
import { PageLoader } from "./components/ui/LoadingSpinner";
import { useActorReady } from "./hooks/useActorReady";
import { useAuth } from "./hooks/useAuth";
import { useIsAdmin } from "./hooks/useBackend";

// AuthCacheSync: clears ALL query cache when the principal changes.
// This is critical for Chrome's full-page redirect flow:
//   1. User clicks "Sign In" → Chrome redirects to II → app restarts
//   2. On restart, anonymous queries may have fired and cached stale data
//   3. When principal is restored from IndexedDB, we must clear ALL stale cache
//      so no anonymous responses are served to the new authenticated principal
//
// We clear only AFTER actorReady=true, because ActorReadyProvider handles
// the cache invalidation as part of the probe completion. This component
// acts as a safety net for any additional cache that wasn't cleared.
function AuthCacheSync() {
  const { principal, isAuthenticated, isInitializing } = useAuth();
  const { actorReady } = useActorReady();
  const qc = useQueryClient();
  const prevPrincipalRef = useRef<string>("anon");
  const prevReadyRef = useRef<boolean>(false);

  useEffect(() => {
    const principalText = principal?.toText() ?? "anon";
    const isAnon = !principal || principal.isAnonymous();

    // On sign-out: wipe ALL query cache so stale identity-scoped data
    // doesn't persist into the next session.
    if (!isInitializing && (!isAuthenticated || isAnon)) {
      if (prevReadyRef.current) {
        console.log("[AuthCacheSync] Sign-out detected — clearing all cache");
        qc.clear();
        prevPrincipalRef.current = "anon";
        prevReadyRef.current = false;
      }
      return;
    }

    // Only proceed when actor is confirmed ready with authenticated identity.
    if (!actorReady || isAnon || isInitializing) return;

    prevReadyRef.current = true;

    // Detect principal change (covers Chrome full-page redirect case where
    // the principal transitions from "anon" to the real authenticated PID).
    if (prevPrincipalRef.current === principalText) return;

    const wasAnon = prevPrincipalRef.current === "anon";
    prevPrincipalRef.current = principalText;

    if (wasAnon) {
      // Transitioning from anonymous → authenticated.
      // ActorReadyProvider already cleared cache and re-fetched profile.
      // Just ensure profile query is fresh for this principal.
      console.log(
        "[AuthCacheSync] Principal confirmed:",
        principalText,
        "— refreshing profile",
      );
      qc.invalidateQueries({ queryKey: ["profile", principalText] });
    } else {
      // Principal switched (different II identity) — clear everything.
      console.log(
        "[AuthCacheSync] Principal changed to:",
        principalText,
        "— clearing all cache",
      );
      qc.clear();
      qc.invalidateQueries({ queryKey: ["profile", principalText] });
    }
  }, [principal, isAuthenticated, isInitializing, actorReady, qc]);

  return null;
}

const HomePage = lazy(() => import("./pages/Home"));
const MarketplacePage = lazy(() => import("./pages/Marketplace"));
const PlantsPage = lazy(() => import("./pages/Plants"));
const PlantDetailPage = lazy(() => import("./pages/PlantDetail"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const DAOPage = lazy(() => import("./pages/DAO"));
const CommunityPage = lazy(() => import("./pages/Community"));
const AdminPage = lazy(() => import("./pages/Admin"));
const CheckoutPage = lazy(() => import("./pages/Checkout"));
const OrdersPage = lazy(() => import("./pages/Orders"));
const WalletPage = lazy(() => import("./pages/Wallet"));
const NIMSPage = lazy(() => import("./pages/NIMS"));
const CookBookPage = lazy(() => import("./pages/CookBook"));
const ScheduleBuilderPage = lazy(() => import("./pages/ScheduleBuilder"));
const ClaimPage = lazy(() => import("./pages/Claim"));

// Admin guard component — shows a clear Access Denied message for non-admins.
// The tab is always visible in the nav; the gate lives here inside the route.
//
// CHROME FIX: After II full-page redirect, the sequence is:
//   isInitializing=true → isInitializing=false, isAuthenticated=true → actorReady=true
//
// We must NOT show "Access Denied" until BOTH isInitializing=false AND actorReady=true.
// Before that, we show a loading spinner.
function AdminGuard() {
  const { actorReady, probeError } = useActorReady();
  const { isAuthenticated, isInitializing, principal } = useAuth();
  const { data: isAdmin, isPending: isAdminPending } = useIsAdmin();

  if (typeof window !== "undefined") {
    console.log("[AdminGuard]", {
      principal: principal?.toText() ?? "anon",
      isAuthenticated,
      isInitializing,
      actorReady,
      probeError,
      isAdmin,
      isAdminPending,
    });
  }

  // Case 1: II is still initializing (restoring from IndexedDB after Chrome redirect).
  // MUST show loader here — isAdmin is synchronous but principal is not yet known.
  if (isInitializing) return <PageLoader />;

  // Case 2: Not authenticated — show sign-in prompt.
  if (!isAuthenticated) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center"
        data-ocid="admin.unauthenticated"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-3xl">🌶️</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Admin Panel
          </h1>
          <p className="text-muted-foreground max-w-sm">
            Sign in with the nursery owner's Internet Identity to access the
            admin panel.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-smooth"
          data-ocid="admin.go_home_button"
        >
          Go Home
        </a>
      </div>
    );
  }

  // Case 3: isAdminPending means II is still initializing (isPending = isInitializing in useIsAdmin).
  // This is a safety net — already handled by Case 1, but keep for clarity.
  if (isAdminPending) return <PageLoader />;

  // Case 4: Confirmed NOT admin — show access denied with current principal for debugging.
  // We reach here only when isInitializing=false, so isAdmin is a definitive answer.
  // We do NOT wait for actorReady here because isAdmin is purely synchronous from the PID.
  if (!isAdmin) {
    const currentPrincipal = principal?.toText() ?? "unknown";
    const handleCopyPid = () => {
      if (currentPrincipal === "unknown") return;
      navigator.clipboard.writeText(currentPrincipal).then(() => {
        toast.success("Principal ID copied!", { duration: 3000 });
      });
    };
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center"
        data-ocid="admin.access_denied"
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-3xl">🌶️</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Access Restricted
          </h1>
          <p className="text-muted-foreground max-w-sm">
            This area is restricted to the nursery owner. Please sign in with
            the correct Internet Identity to continue.
          </p>
        </div>
        <div className="w-full max-w-md rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-left space-y-2">
          <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
            Your Internet Identity Principal:
          </p>
          {currentPrincipal !== "unknown" ? (
            <>
              <p
                className="font-mono text-xs text-yellow-200 break-all select-all leading-relaxed bg-black/20 rounded px-2 py-1.5 cursor-text"
                data-ocid="admin.current-principal-text"
              >
                {currentPrincipal}
              </p>
              <button
                type="button"
                onClick={handleCopyPid}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-medium hover:bg-yellow-500/30 transition-colors"
                data-ocid="admin.copy-principal-btn"
              >
                📋 Copy this Principal ID
              </button>
              <p className="text-[11px] text-yellow-400/70">
                If this is your admin principal ID, copy it and add it to the
                app. Character count:{" "}
                <span className="font-mono font-bold">
                  {currentPrincipal.length}
                </span>
              </p>
            </>
          ) : (
            <p className="text-xs text-yellow-400/70">
              Sign in with Internet Identity to see your principal ID.
            </p>
          )}
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-smooth"
          data-ocid="admin.go_home_button"
        >
          Go Home
        </a>
      </div>
    );
  }

  // Case 5: Confirmed admin (isAdmin=true).
  // Wait for actorReady before rendering the AdminPage so it has a valid actor.
  // Show loader while probe completes — this only takes a second or two.
  if (!actorReady && !probeError) {
    return <PageLoader />;
  }

  // Case 6: Probe timed out — show connection error.
  if (probeError) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center"
        data-ocid="admin.probe_error"
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Connection Timeout
          </h1>
          <p className="text-muted-foreground max-w-sm">
            Could not connect to the backend. Please refresh the page and try
            again. If this keeps happening, the canister may be upgrading.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-smooth"
          data-ocid="admin.retry_button"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Case 7: Confirmed admin + actorReady — render the admin page.
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminPage />
    </Suspense>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <AuthCacheSync />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </Layout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const marketplaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marketplace",
  component: MarketplacePage,
});

const plantsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plants",
  component: PlantsPage,
});

const plantDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plants/$plantId",
  component: PlantDetailPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const daoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dao",
  component: DAOPage,
});

const communityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/community",
  component: CommunityPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminGuard,
});

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout",
  component: CheckoutPage,
});

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orders",
  component: OrdersPage,
});

const walletRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallet",
  component: WalletPage,
});

const nimsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nims",
  component: NIMSPage,
});

const cookbookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cookbook",
  component: CookBookPage,
});

const scheduleBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/schedule-builder",
  component: ScheduleBuilderPage,
});

const claimRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/claim/$claimToken",
  component: ClaimPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  marketplaceRoute,
  plantsRoute,
  plantDetailRoute,
  profileRoute,
  daoRoute,
  communityRoute,
  adminRoute,
  checkoutRoute,
  ordersRoute,
  walletRoute,
  nimsRoute,
  cookbookRoute,
  scheduleBuilderRoute,
  claimRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ActorReadyProvider>
      <RouterProvider router={router} />
    </ActorReadyProvider>
  );
}
