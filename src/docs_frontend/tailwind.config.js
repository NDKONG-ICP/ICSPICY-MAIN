import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        ember: "rgb(var(--c-ember) / <alpha-value>)",
        gold: "rgb(var(--c-gold) / <alpha-value>)",
        sage: "rgb(var(--c-sage) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        body: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "0.875rem",
        md: "0.625rem",
        sm: "0.375rem",
      },
      boxShadow: {
        glass:
          "0 1px 0 0 rgb(var(--c-line) / 0.6) inset, 0 24px 80px -32px rgb(0 0 0 / 0.55)",
        ember: "0 18px 60px -22px rgb(var(--c-ember) / 0.55)",
        soft: "0 12px 32px -16px rgb(0 0 0 / 0.35)",
      },
      backgroundImage: {
        "ember-radial":
          "radial-gradient(100% 60% at 50% -5%, rgb(var(--c-ember) / 0.22), transparent 55%)",
        "gold-radial":
          "radial-gradient(70% 50% at 85% 0%, rgb(var(--c-gold) / 0.18), transparent 55%)",
        "dark-texture":
          "radial-gradient(ellipse 80% 50% at 20% 80%, rgb(var(--c-ember) / 0.06), transparent 50%)",
        "hero-overlay":
          "linear-gradient(to right, rgb(0 0 0 / 0.82) 0%, rgb(0 0 0 / 0.55) 55%, rgb(0 0 0 / 0.28) 100%)",
        "section-fade":
          "linear-gradient(to bottom, transparent 0%, rgb(var(--c-bg)) 100%)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "ember-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
        shimmer: "shimmer 3.5s linear infinite",
        "ember-pulse": "ember-pulse 4.5s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, animate],
};
