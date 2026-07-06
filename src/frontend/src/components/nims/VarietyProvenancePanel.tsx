/**
 * VarietyProvenancePanel — Pepperpedia facts + protected vendor photo.
 */
import { ProtectedImage } from "@/components/ProtectedImage";
import {
  VENDOR_CREDIT_FALLBACK,
  vendorPhotoCreditHref,
  vendorPhotoSrc,
} from "@/lib/vendor-photo";
import type { VarietyProvenancePublic } from "../../declarations/backend.did";

function optText(v: [] | [string] | undefined): string | null {
  return v != null && v.length > 0 ? v[0]! : null;
}

export type VarietyProvenancePanelProps = {
  varietyName: string;
  intro: string | null;
  provenance: VarietyProvenancePublic | null;
};

export function VarietyProvenancePanel({
  varietyName,
  intro,
  provenance,
}: VarietyProvenancePanelProps) {
  if (!provenance && !intro) return null;

  const breeder = provenance ? optText(provenance.breeder) : null;
  const breederLocation = provenance ? optText(provenance.breederLocation) : null;
  const origin = provenance ? optText(provenance.origin) : null;
  const heatClass = provenance ? optText(provenance.heatClass) : null;
  const species = provenance ? optText(provenance.species) : null;
  const photoKey = provenance ? optText(provenance.photoKey) : null;
  const photoCredit = provenance ? optText(provenance.photoCredit) : null;
  const sources = provenance?.sources ?? [];
  const creditHref = vendorPhotoCreditHref(sources);

  const breederLine =
    breeder != null
      ? breeder.includes("Towns-End")
        ? breederLocation != null
          ? "An original Towns-End cultivar bred by William Townshend in South Florida."
          : "An original Towns-End cultivar bred by William Townshend."
        : breederLocation != null
          ? `Bred by ${breeder} (${breederLocation}).`
          : `Bred by ${breeder}.`
      : null;

  const creditText =
    photoCredit ??
    (creditHref
      ? `Photo courtesy of ${sources[0]?.vendorName ?? "vendor"} — used with permission`
      : VENDOR_CREDIT_FALLBACK);

  return (
    <section
      className="mb-8 rounded-2xl border border-border/70 bg-card/55 overflow-hidden"
      aria-label="Pepperpedia variety facts"
    >
      {photoKey ? (
        <>
          <div className="relative aspect-[21/9] min-h-[140px] overflow-hidden">
            <ProtectedImage
              src={vendorPhotoSrc(photoKey)}
              alt={`${varietyName} pepper`}
              className="h-full w-full object-cover"
              figureClassName="h-full"
              creditText={creditText}
              creditHref={creditHref ?? sources[0]?.url ?? "https://www.icspicy.app/credits"}
              hideCaption
            />
          </div>
          <p className="border-t border-border/50 bg-muted/20 px-5 py-2 text-xs italic text-muted-foreground">
            <a
              href={creditHref ?? sources[0]?.url ?? "https://www.icspicy.app/credits"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {creditText}
            </a>
          </p>
        </>
      ) : (
        <div className="relative aspect-[21/9] min-h-[140px] bg-gradient-to-br from-[#1c0a0a] via-[#7f1d1d] to-[#92400e]">
          <div className="flex h-full items-center justify-center px-6">
            <p className="font-display text-center text-2xl font-bold text-white/90 sm:text-3xl">
              {varietyName}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Pepperpedia
        </p>

        {intro ? (
          <p className="text-sm leading-relaxed text-foreground/90">{intro}</p>
        ) : null}

        {breederLine ? (
          <p className="text-sm italic text-muted-foreground">{breederLine}</p>
        ) : null}

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {species ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Species
              </dt>
              <dd className="italic text-foreground">{species}</dd>
            </div>
          ) : null}
          {heatClass ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Heat class
              </dt>
              <dd className="text-foreground">{heatClass}</dd>
            </div>
          ) : null}
          {origin ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Origin
              </dt>
              <dd className="text-foreground">{origin}</dd>
            </div>
          ) : null}
        </dl>

        {sources.length > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
              Available from
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    {s.vendorName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Compact heat-class chip for VarietyPicker rows. */
export function HeatClassChip({ heatClass }: { heatClass: string | null }) {
  if (!heatClass) return null;
  return (
    <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
      {heatClass}
    </span>
  );
}

export function optProvenanceText(
  v: [] | [string] | undefined,
): string | null {
  return optText(v);
}
