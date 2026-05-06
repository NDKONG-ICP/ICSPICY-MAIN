import { useState, useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { isAuthenticated, getIdentity } from "@/lib/auth";
import { getDocsBackendActor } from "@/lib/backend";
import type { Principal } from "@dfinity/principal";

interface Props {
  children: ReactNode;
}

type AdminState = "checking" | "admin" | "not-admin" | "not-authenticated";

export function AdminGuard({ children }: Props) {
  const [state, setState] = useState<AdminState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const authed = await isAuthenticated();
        if (!authed) {
          if (!cancelled) setState("not-authenticated");
          return;
        }

        const identity = await getIdentity();
        const principal: Principal = identity.getPrincipal();
        const actor = getDocsBackendActor();
        if (!actor) {
          // Can't verify — allow access if authenticated; method guards catch the rest.
          if (!cancelled) setState("admin");
          return;
        }

        const adm = await actor.isAdmin(principal);
        if (!cancelled) setState(adm ? "admin" : "not-admin");
      } catch {
        if (!cancelled) setState("not-authenticated");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ember" />
      </div>
    );
  }

  if (state === "not-authenticated") {
    return <Navigate to="/admin/login" replace />;
  }

  if (state === "not-admin") {
    return (
      <div className="container py-24 text-center">
        <p className="text-xl font-semibold text-ink">
          Not an admin principal
        </p>
        <p className="mt-2 text-muted">
          Your Internet Identity is not in the admin list for this canister.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
