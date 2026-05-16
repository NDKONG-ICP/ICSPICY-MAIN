import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-elevated/60 backdrop-blur transition-colors hover:border-gold"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="inline-flex"
          >
            <Moon className="h-4 w-4 text-gold" strokeWidth={1.6} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="inline-flex"
          >
            <Sun className="h-4 w-4 text-ember" strokeWidth={1.6} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
