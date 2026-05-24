import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "motion/react";
import { SiFacebook, SiInstagram, SiTiktok, SiX } from "react-icons/si";
import { SOCIAL_LINKS } from "../../types";
import { NimsDemo } from "./NimsDemo";

const FEATURES = [
  {
    icon: "🌱",
    title: "72-Cell Tray Tracking",
    description:
      "Visual germination tray with color-coded cells. Plant, germinate, transplant — all from the grid.",
  },
  {
    icon: "🌡️",
    title: "Automatic Weather Data",
    description:
      "Temperature, humidity, UV, rainfall, wind, air quality, and moon phase — captured with every log entry.",
  },
  {
    icon: "📊",
    title: "Growth Analytics",
    description:
      "Germination rates, feeding schedules, variety performance — data-driven growing.",
  },
  {
    icon: "🌰",
    title: "Seed Bank & Breeding",
    description:
      "Catalog your seed collection. Track breeding crosses and generation history.",
  },
  {
    icon: "📱",
    title: "Mobile-First",
    description:
      "Designed for one-handed use in the greenhouse. Tap to log, snap to document.",
  },
  {
    icon: "🔗",
    title: "NFT Provenance (Pro)",
    description:
      "For registered nurseries: every plant gets an NFT with its complete verifiable lifecycle.",
  },
] as const;

const SOCIAL_ITEMS = [
  { href: SOCIAL_LINKS.facebook, Icon: SiFacebook, label: "Facebook" },
  { href: SOCIAL_LINKS.x, Icon: SiX, label: "X" },
  { href: SOCIAL_LINKS.instagram, Icon: SiInstagram, label: "Instagram" },
  { href: SOCIAL_LINKS.tiktok, Icon: SiTiktok, label: "TikTok" },
] as const;

export type NimsLandingPageProps = {
  onLogin: () => void;
};

export function NimsLandingPage({ onLogin }: NimsLandingPageProps) {
  return (
    <div className="min-h-screen" data-ocid="nims-landing">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-background to-background"
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute -right-24 top-20 size-72 rounded-full bg-red-600/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute -left-16 bottom-0 size-64 rounded-full bg-emerald-600/10 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
          aria-hidden
        />

        <div className="container relative max-w-5xl px-4 py-16 sm:py-24 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 text-sm font-medium uppercase tracking-widest text-primary"
          >
            Nursery Inventory Management System
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          >
            Track Every Plant.
            <br />
            <span className="text-primary">From Seed to Harvest.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            NIMS is a free plant lifecycle management system for home gardeners and
            professional nurseries — powered by blockchain provenance.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <Button
              size="lg"
              className="h-12 px-8 text-base"
              data-ocid="nims-landing-hero-cta"
              onClick={onLogin}
            >
              Get Started Free — Connect Internet Identity
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Demo */}
      <section className="container max-w-5xl px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            See NIMS in action
          </h2>
          <p className="mt-2 text-muted-foreground">
            Auto-playing walkthrough — no signup required to preview.
          </p>
        </div>
        <NimsDemo />
      </section>

      {/* Features */}
      <section className="border-y border-border bg-muted/20 py-16">
        <div className="container max-w-5xl px-4">
          <h2 className="mb-10 text-center font-display text-2xl font-bold sm:text-3xl">
            Everything you need to grow smarter
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full border-border/80 bg-card/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <span className="text-xl" aria-hidden>
                        {f.icon}
                      </span>
                      {f.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Two paths */}
      <section className="container max-w-5xl px-4 py-16">
        <h2 className="mb-10 text-center font-display text-2xl font-bold">
          Built for every grower
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-emerald-500/20 bg-emerald-950/10">
            <CardHeader>
              <CardTitle className="font-display text-xl">🏡 Home Gardener</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Track your backyard peppers, tomatoes, herbs — any plant</li>
                <li>Free forever. No NFTs required.</li>
                <li>Weather data, feeding logs, pest tracking, photos</li>
              </ul>
              <Button
                className="w-full sm:w-auto"
                data-ocid="nims-landing-home-cta"
                onClick={onLogin}
              >
                Start Tracking Free
              </Button>
            </CardContent>
          </Card>
          <Card className="border-red-500/20 bg-red-950/10">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                🌶️ Professional Nursery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Full inventory management with blockchain provenance</li>
                <li>Every plant gets an ICRC-7 NFT</li>
                <li>QR codes for in-person sales with NFT transfer</li>
                <li>Your plants tell their own story</li>
              </ul>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                asChild
                data-ocid="nims-landing-nursery-cta"
              >
                <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer">
                  Contact Us
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="container max-w-3xl px-4 text-center">
          <blockquote className="space-y-3 font-display text-lg sm:text-xl">
            <p>IC SPICY is an FDACS Registered Nursery in Port Charlotte, Florida</p>
            <p className="text-muted-foreground text-base sm:text-lg">
              30+ years growing the world&apos;s hottest peppers
            </p>
            <p className="text-primary font-semibold">
              8,888 NFT collection on the Internet Computer
            </p>
          </blockquote>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {SOCIAL_ITEMS.map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <Icon className="size-5" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container max-w-3xl px-4 py-20 text-center">
        <h2 className="font-display text-3xl font-bold">Ready to grow smarter?</h2>
        <Button
          size="lg"
          className="mt-8 h-12 px-10 text-base"
          data-ocid="nims-landing-final-cta"
          onClick={onLogin}
        >
          Connect Internet Identity — Start Free
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">
          No credit card. No app download. Just connect and grow.
        </p>
      </section>
    </div>
  );
}
