import { Link } from "@tanstack/react-router";
import { ExternalLink, Sprout } from "lucide-react";
import { Seo } from "@/components/Seo";
import { staticRouteSeo } from "@/lib/seo-routes.mjs";

const SEO = staticRouteSeo("/credits");

const VENDORS = [
  {
    name: "Refining Fire Chiles",
    alsoKnownAs: "Super Hot Chiles",
    url: "https://www.superhotchiles.com",
    domain: "superhotchiles.com",
    blurb:
      "Refining Fire Chiles (Super Hot Chiles) supplies superhot and specialty pepper seeds with decades of grower expertise. IC SPICY uses their product photography in Pepperpedia with written permission — every image carries a burned-in credit and links back to their shop.",
  },
  {
    name: "Towns-End Chili & Spice",
    alsoKnownAs: null,
    url: "https://towns-endchiliandspice.com",
    domain: "towns-endchiliandspice.com",
    blurb:
      "William Townshend's Towns-End Chili & Spice is a South Florida pepper institution — original T-E cultivars, rare genetics, and one of the deepest superhot seed catalogs anywhere. Photography and cultivar data appear in Pepperpedia courtesy of Towns-End, with direct links on every photo.",
  },
] as const;

export default function CreditsPage() {
  return (
    <div className="container max-w-3xl py-10 space-y-10" data-ocid="photo-credits-page">
      <Seo title={SEO.title} description={SEO.description} path="/credits" jsonLd={SEO.jsonLd ?? undefined} />

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Sprout className="text-primary h-8 w-8" aria-hidden />
          Photo &amp; Seed Credits
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Seeds and photography courtesy of{" "}
          <strong className="text-foreground">Refining Fire Chiles</strong> and{" "}
          <strong className="text-foreground">Towns-End Chili &amp; Spice</strong>.
          IC SPICY Pepperpedia would not exist without their generosity and grower knowledge.
        </p>
      </header>

      <div className="space-y-6">
        {VENDORS.map((v) => (
          <article
            key={v.domain}
            className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-bold">{v.name}</h2>
              <span className="text-sm text-muted-foreground font-mono">{v.domain}</span>
            </div>
            {v.alsoKnownAs ? (
              <p className="text-xs text-primary">Also known as {v.alsoKnownAs}</p>
            ) : null}
            <p className="text-sm text-muted-foreground leading-relaxed">{v.blurb}</p>
            <a
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
            >
              Visit {v.name}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </article>
        ))}
      </div>

      <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm text-muted-foreground space-y-2">
        <p>
          All vendor photos in Pepperpedia are displayed at reduced resolution with a permanent
          on-image watermark and are not stored in their original form. Images are used under
          written permission; please support these vendors by purchasing seeds directly from their
          shops.
        </p>
        <p>
          Explore the full index on{" "}
          <Link to="/guides" className="text-primary hover:underline">
            Growing Guides (Pepperpedia)
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
