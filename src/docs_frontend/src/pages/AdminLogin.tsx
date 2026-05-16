import { isAuthenticated, login } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Flame, Loader2, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, go straight to admin.
  useEffect(() => {
    isAuthenticated().then((authed) => {
      if (authed) navigate("/admin/documents", { replace: true });
    });
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await login();
      if (ok) {
        navigate("/admin/documents", { replace: true });
      } else {
        setError("Login was cancelled or failed. Please try again.");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "w-full max-w-sm rounded-2xl border border-line/60 p-8",
          "backdrop-blur-2xl bg-elevated/40 shadow-xl",
        )}
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold shadow-ember">
            <Flame className="h-7 w-7 text-bg" strokeWidth={2} />
          </span>
          <div className="text-center">
            <h1 className="display text-2xl font-bold text-ink">
              IC <span className="ember-text">SPICY</span> Admin
            </h1>
            <p className="mt-1 text-sm text-muted">
              Sign in with Internet Identity to manage docs and SpicyAi
            </p>
          </div>
        </div>

        {/* Login button */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center gap-2.5 rounded-xl py-3 px-4",
            "bg-gradient-to-r from-ember to-gold text-bg font-semibold",
            "shadow-ember transition-opacity",
            "hover:opacity-90 active:scale-[0.98] disabled:opacity-60",
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" strokeWidth={2.5} />
          )}
          {loading
            ? "Opening Internet Identity…"
            : "Sign in with Internet Identity"}
        </button>

        {error && (
          <p className="mt-4 text-center text-sm text-red-400">{error}</p>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Only principals in the canister admin list can access this panel.
        </p>
      </motion.div>
    </div>
  );
}
