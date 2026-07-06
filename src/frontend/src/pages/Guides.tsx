/**
 * /guides — Pepperpedia: searchable variety index with provenance filters.
 */
import { Link } from "@tanstack/react-router";
import { BookOpen, Flame, Search } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedImage } from "@/components/ProtectedImage";
import { Seo } from "../components/Seo";
import { optProvenanceText } from "../components/nims/VarietyProvenancePanel";
import {
  vendorPhotoCreditHref,
  vendorPhotoSrc,
  vendorPhotoThumbSrc,
} from "@/lib/vendor-photo";
import { useVarieties } from "../hooks/useNims";
import { useAllVarietyProvenance } from "../hooks/useVarietyProvenance";
import { staticRouteSeo } from "../lib/seo-routes.mjs";

const GUIDES_SEO = staticRouteSeo("/guides");
const PAGE_SIZE = 48;

function scovilleLabel(max: number): string | null {
  if (max <= 0) return null;
  if (max >= 1_000_000) return `${(max / 1_000_000).toFixed(1)}M SHU`;
  if (max >= 1_000) return `${Math.round(max / 1_000)}K SHU`;
  return `${max} SHU`;
}

export default function GuidesPage() {
  const { data: varieties = [], isLoading: varietiesLoading } = useVarieties();
  const { data: provenanceMap = new Map(), isLoading: provLoading } =
    useAllVarietyProvenance();

  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [heatFilter, setHeatFilter] = useState("all");
  const [breederFilter, setBreederFilter] = useState("all");
  const [originalOnly, setOriginalOnly] = useState(false);
  const [page, setPage] = useState(0);

  const isLoading = varietiesLoading || provLoading;

  const speciesOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of varieties) {
      const p = provenanceMap.get(v.id);
      const sp = optProvenanceText(p?.species) ?? v.species;
      if (sp) set.add(sp);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [varieties, provenanceMap]);

  const heatOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of provenanceMap.values()) {
      const h = optProvenanceText(p.heatClass);
      if (h) set.add(h);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [provenanceMap]);

  const breederOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of provenanceMap.values()) {
      const b = optProvenanceText(p.breeder);
      if (b) set.add(b);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [provenanceMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...varieties]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((v) => {
        const p = provenanceMap.get(v.id);
        const species = optProvenanceText(p?.species) ?? v.species;
        const heat = optProvenanceText(p?.heatClass);
        const breeder = optProvenanceText(p?.breeder);

        if (q) {
          const hay = [v.name, species, heat ?? "", breeder ?? ""]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (speciesFilter !== "all" && species !== speciesFilter) return false;
        if (heatFilter !== "all" && heat !== heatFilter) return false;
        if (breederFilter !== "all" && breeder !== breederFilter) return false;
        if (originalOnly && !breeder) return false;
        return true;
      });
  }, [
    search,
    varieties,
    provenanceMap,
    speciesFilter,
    heatFilter,
    breederFilter,
    originalOnly,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const shown = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const resetFilters = () => {
    setSpeciesFilter("all");
    setHeatFilter("all");
    setBreederFilter("all");
    setOriginalOnly(false);
    setPage(0);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20">
      <Seo
        title={GUIDES_SEO.title}
        description={GUIDES_SEO.description}
        path="/guides"
        jsonLd={GUIDES_SEO.jsonLd ?? undefined}
      />

      <motion.section
        className="text-center pt-8 pb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="inline-flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Pepperpedia
          </span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          {varieties.length > 0 ? `${String(varieties.length)} ` : ""}
          Variety Index &amp; Growing Guides
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto mt-3 text-sm md:text-base">
          Permanent variety catalog with breeder credits, heat class, and vendor
          sources — plus KNF-powered growing guides for every entry.
        </p>
      </motion.section>

      <div className="relative max-w-md mx-auto mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search varieties — Reaper, annuum, Towns-End…"
          className="pl-9 bg-card/60 border-border"
          aria-label="Search Pepperpedia"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 justify-center">
        <div className="w-full sm:w-40">
          <Label className="text-xs text-muted-foreground">Species</Label>
          <Select
            value={speciesFilter}
            onValueChange={(v) => {
              setSpeciesFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All species" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All species</SelectItem>
              {speciesOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <Label className="text-xs text-muted-foreground">Heat class</Label>
          <Select
            value={heatFilter}
            onValueChange={(v) => {
              setHeatFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All heat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All heat</SelectItem>
              {heatOptions.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Label className="text-xs text-muted-foreground">Breeder</Label>
          <Select
            value={breederFilter}
            onValueChange={(v) => {
              setBreederFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All breeders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All breeders</SelectItem>
              {breederOptions.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            id="original-only"
            checked={originalOnly}
            onCheckedChange={(c) => {
              setOriginalOnly(c === true);
              setPage(0);
            }}
          />
          <Label htmlFor="original-only" className="text-sm cursor-pointer">
            Original cultivars
          </Label>
        </div>
        {(speciesFilter !== "all" ||
          heatFilter !== "all" ||
          breederFilter !== "all" ||
          originalOnly) && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-primary underline-offset-2 hover:underline pb-1"
          >
            Clear filters
          </button>
        )}
      </div>

      {!isLoading && (
        <p className="text-center text-sm text-muted-foreground mb-6">
          {filtered.length} {filtered.length === 1 ? "variety" : "varieties"}
          {filtered.length !== varieties.length
            ? ` (of ${varieties.length})`
            : ""}
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No varieties match your filters.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {shown.map((v, i) => {
              const p = provenanceMap.get(v.id);
              const species = optProvenanceText(p?.species) ?? v.species;
              const heat = optProvenanceText(p?.heatClass);
              const breeder = optProvenanceText(p?.breeder);
              const photoKey = optProvenanceText(p?.photoKey);
              const photoCredit = optProvenanceText(p?.photoCredit);
              const creditHref = vendorPhotoCreditHref(p?.sources);
              const shu = scovilleLabel(Number(v.scovilleMax));
              const thumbSrc = photoKey
                ? vendorPhotoThumbSrc(photoKey) ?? vendorPhotoSrc(photoKey)
                : null;
              return (
                <motion.div
                  key={v.id.toString()}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 12) * 0.03 }}
                >
                  <Link
                    to="/variety/$varietyId/guide"
                    params={{ varietyId: v.id.toString() }}
                    className="group block h-full rounded-xl border border-border/70 bg-card/55 hover:border-primary/40 hover:bg-card/85 overflow-hidden transition-colors"
                    data-ocid={`guide-card-${v.id.toString()}`}
                  >
                    {thumbSrc && creditHref ? (
                      <ProtectedImage
                        src={thumbSrc}
                        alt={`${v.name} pepper`}
                        className="aspect-[4/3] w-full object-cover"
                        creditText={
                          photoCredit ??
                          `Photo courtesy of ${p?.sources[0]?.vendorName ?? "vendor"} — used with permission`
                        }
                        creditHref={creditHref}
                      />
                    ) : null}
                    <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-smooth line-clamp-2">
                        {v.name}
                      </h2>
                      <BookOpen
                        className="w-4 h-4 text-primary/60 shrink-0 mt-0.5"
                        aria-hidden
                      />
                    </div>
                    {species ? (
                      <p className="text-[11px] italic text-muted-foreground mt-1 line-clamp-1">
                        {species}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {heat ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/40 text-primary"
                        >
                          <Flame className="w-2.5 h-2.5 mr-0.5" />
                          {heat}
                        </Badge>
                      ) : shu ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/40 text-primary"
                        >
                          <Flame className="w-2.5 h-2.5 mr-0.5" />
                          {shu}
                        </Badge>
                      ) : null}
                      {breeder ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {breeder}
                        </Badge>
                      ) : null}
                    </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          {pageCount > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="text-sm text-primary disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {safePage + 1} of {pageCount}
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
                className="text-sm text-primary disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
