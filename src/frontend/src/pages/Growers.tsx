import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BadgeCheck,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { Seo } from "@/components/Seo";
import { useGrowerDirectory } from "@/hooks/useCoopStatus";
import {
  getGrowerOfTheMonth,
  getVerifiedGrowersExceptFeatured,
  useVerifiedGrowers,
  type VerifiedGrowerView,
} from "@/hooks/useVerifiedGrowers";
import { staticRouteSeo } from "@/lib/seo-routes.mjs";

const SEO = staticRouteSeo("/growers");

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

function VerifiedGrowerTile({
  grower,
  featured = false,
}: {
  grower: VerifiedGrowerView;
  featured?: boolean;
}) {
  return (
    <motion.a
      href={grower.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        featured
          ? "border-emerald-500/40 shadow-lg shadow-emerald-950/20 hover:border-emerald-400/60"
          : "border-border/80 hover:border-emerald-500/35"
      }`}
      {...fadeUp}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <img
          src={grower.imageUrl}
          alt={`${grower.name} website preview`}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          loading={featured ? "eager" : "lazy"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge className="gap-1 border-emerald-400/30 bg-emerald-950/80 text-emerald-100 backdrop-blur-sm">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified grower
          </Badge>
          {grower.establishedYear ? (
            <Badge variant="secondary" className="backdrop-blur-sm">
              Est. {grower.establishedYear}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fire">
            {grower.owners}
          </p>
          <h3 className="font-display text-2xl font-bold leading-tight group-hover:text-emerald-300 transition-colors">
            {grower.name}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {featured ? grower.story : grower.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {grower.categories.map((cat) => (
            <Badge
              key={cat}
              variant="outline"
              className="border-emerald-500/25 bg-emerald-500/5 text-emerald-200/90"
            >
              {cat}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {grower.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-center"
            >
              <p className="font-display text-lg font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 group-hover:underline">
            Visit {grower.name}
            <ExternalLink className="h-4 w-4" />
          </span>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-400" />
        </div>
      </div>
    </motion.a>
  );
}

export default function GrowersPage() {
  const { data: growers, isLoading } = useGrowerDirectory();
  const {
    data: verifiedGrowers,
    isLoading: verifiedLoading,
  } = useVerifiedGrowers();
  const growerOfTheMonth = getGrowerOfTheMonth(verifiedGrowers);
  const otherVerified = getVerifiedGrowersExceptFeatured(verifiedGrowers);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "IC SPICY Verified Trusted Growers",
    itemListElement: [
      ...(verifiedGrowers ?? []).map((g, i) => ({
        "@type": "ListItem" as const,
        position: i + 1,
        name: g.name,
        url: g.url,
      })),
      ...(growers ?? []).map((g, i) => ({
        "@type": "ListItem" as const,
        position: (verifiedGrowers?.length ?? 0) + i + 1,
        name: g.growerName,
        url: `https://www.icspicy.app/u/${g.profilePrincipal.toString()}`,
      })),
    ],
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      data-ocid="grower-directory"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.14),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 h-72 w-72 rounded-full bg-fire/10 blur-3xl"
      />

      <div className="container relative max-w-6xl space-y-14 py-10 sm:py-14">
        <Seo
          title={SEO.title}
          description={SEO.description}
          path="/growers"
          jsonLd={itemListJsonLd}
        />

        <motion.header className="max-w-3xl space-y-4" {...fadeUp}>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-fire">
            <ShieldCheck className="h-4 w-4" />
            Verified trusted growers
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Regenerative growers with{" "}
            <span className="text-emerald-400">real provenance</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Meet exceptional pepper farms and nurseries we stand behind — from
            cottage-certified sauce makers to co-op members minting on-chain
            plant history. Every verified partner is vetted for regenerative
            practice, product integrity, and community impact.
          </p>
        </motion.header>

        {verifiedLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {growerOfTheMonth ? (
              <section className="space-y-5" aria-labelledby="grower-of-month">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      Grower of the Month — {growerOfTheMonth.growerOfTheMonth}
                    </div>
                    <h2
                      id="grower-of-month"
                      className="font-display text-2xl font-bold sm:text-3xl"
                    >
                      Featured partner spotlight
                    </h2>
                  </div>
                </div>

                <div className="relative rounded-[1.35rem] bg-gradient-to-br from-emerald-500/20 via-amber-500/10 to-fire/10 p-[1px]">
                  <VerifiedGrowerTile grower={growerOfTheMonth} featured />
                </div>
              </section>
            ) : null}

            {otherVerified.length > 0 ? (
              <section className="space-y-5" aria-labelledby="verified-growers">
                <h2
                  id="verified-growers"
                  className="font-display text-2xl font-bold"
                >
                  Verified growers
                </h2>
                <div className="grid gap-6 lg:grid-cols-2">
                  {otherVerified.map((g) => (
                    <VerifiedGrowerTile key={g.id} grower={g} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        <section className="space-y-5" aria-labelledby="coop-directory">
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border/60 pt-10">
            <div>
              <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                <Sprout className="h-3.5 w-3.5" />
                On-chain co-op
              </p>
              <h2
                id="coop-directory"
                className="font-display text-2xl font-bold sm:text-3xl"
              >
                Grower Co-op Directory
              </h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Founding IC SPICY co-op members with public profiles, plant
                counts, and provenance NFTs minted through NIMS.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : growers?.length === 0 ? (
            <Card className="border-dashed border-emerald-500/25 bg-emerald-500/5">
              <CardContent className="py-10 text-center text-muted-foreground">
                No co-op profiles live yet. Founding seats are available on the{" "}
                <Link to="/marketplace" className="text-emerald-400 underline">
                  marketplace
                </Link>
                .
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {growers?.map((g) => (
                <Card
                  key={g.tokenId.toString()}
                  className="border-border/80 transition-colors hover:border-emerald-500/30 hover:shadow-md"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg">
                      {g.growerName}
                    </CardTitle>
                    {g.growerLocation.length > 0 ? (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {g.growerLocation[0]}
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {Number(g.plantCount)} plants
                      </Badge>
                      <Badge variant="outline">
                        {Number(g.provenanceMinted)} provenance NFTs
                      </Badge>
                    </div>
                    <Link
                      to="/u/$user"
                      params={{ user: g.profilePrincipal.toString() }}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      View profile
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <motion.section
          className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/40 via-card to-background p-8 sm:p-10"
          {...fadeUp}
          aria-labelledby="onboard-growers"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-fire">
                <Sparkles className="h-4 w-4" />
                Join the network
              </p>
              <h2
                id="onboard-growers"
                className="font-display text-2xl font-bold sm:text-3xl"
              >
                Are you a regenerative grower?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                IC SPICY is onboarding exceptional farms and nurseries — on-chain
                plant provenance, NFC handoff at checkout, co-op visibility, and
                access to pepper lovers nationwide. Bring your story. We&apos;ll
                help you reach more end users.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link to="/marketplace">
                  Claim a co-op seat
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="mailto:hello@icspicy.app?subject=Verified%20Grower%20Onboarding">
                  Apply for verified listing
                </a>
              </Button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
