import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { MapPin, Sprout } from "lucide-react";
import { Seo } from "@/components/Seo";
import { useGrowerDirectory } from "@/hooks/useCoopStatus";
import { staticRouteSeo } from "@/lib/seo-routes.mjs";

const SEO = staticRouteSeo("/growers");

export default function GrowersPage() {
  const { data: growers, isLoading } = useGrowerDirectory();

  const itemListJsonLd = growers?.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "IC SPICY Grower Co-op Directory",
        itemListElement: growers.map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: g.growerName,
          url: `https://www.icspicy.app/u/${g.profilePrincipal.toString()}`,
        })),
      }
    : undefined;

  return (
    <div className="container max-w-4xl py-8 space-y-8" data-ocid="grower-directory">
      <Seo
        title={SEO.title}
        description={SEO.description}
        path="/growers"
        jsonLd={itemListJsonLd}
      />
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Sprout className="text-emerald-400" /> Grower Directory
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Founding members of the IC SPICY Grower Co-op — regenerative pepper growers with on-chain plant provenance and public profiles.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : growers?.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No grower profiles yet. Founding seats are available on the{" "}
            <Link to="/marketplace" className="text-emerald-400 underline">
              marketplace
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {growers?.map((g) => (
            <Card key={g.tokenId.toString()} className="border-border/80 hover:border-emerald-500/30 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display">{g.growerName}</CardTitle>
                {g.growerLocation.length > 0 ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {g.growerLocation[0]}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{Number(g.plantCount)} plants</Badge>
                  <Badge variant="outline">{Number(g.provenanceMinted)} provenance NFTs</Badge>
                </div>
                <Link
                  to="/u/$user"
                  params={{ user: g.profilePrincipal.toString() }}
                  className="text-emerald-400 hover:underline text-sm"
                >
                  View profile →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
