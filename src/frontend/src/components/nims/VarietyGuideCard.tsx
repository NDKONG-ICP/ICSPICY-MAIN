/**
 * VarietyGuideCard — premium presentation layer for AI-generated,
 * location-personalized regenerative growing guides. Renders hero, section
 * pill navigation, glassmorphism content cards with inline CookBook recipe
 * chips, a personalization sheet, and print / share / share-card actions.
 */
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Download,
  Loader2,
  Printer,
  Settings2,
  Share2,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import QRCode from "qrcode";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RecipePublic, VarietyProvenancePublic, VarietyPublic } from "../../declarations/backend.did";
import { recipeCategoryLabel } from "../../hooks/useCookbook";
import type {
  GuideConditions,
  GuideSectionDraft,
} from "../../lib/variety-guide-ai";
import { VarietyProvenancePanel } from "./VarietyProvenancePanel";

// ── Markdown-lite renderer with [recipe:ID] chips ────────────────────────────

const RECIPE_TOKEN_SPLIT = /(\[recipe:\d+\])/g;
const RECIPE_TOKEN = /^\[recipe:(\d+)\]$/;

function renderInline(
  text: string,
  recipeMap: Map<string, RecipePublic>,
  onOpenRecipe: (r: RecipePublic) => void,
  chipPulse: boolean,
): React.ReactNode[] {
  return text.split(RECIPE_TOKEN_SPLIT).map((part, i) => {
    const tokenMatch = part.match(RECIPE_TOKEN);
    if (tokenMatch) {
      const recipe = recipeMap.get(tokenMatch[1]!);
      if (!recipe) return null;
      return (
        <button
          key={i}
          type="button"
          onClick={() => onOpenRecipe(recipe)}
          className={`mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition hover:bg-primary/20 ${
            chipPulse ? "animate-pulse [animation-iteration-count:3]" : ""
          }`}
        >
          <BookOpen className="size-3" aria-hidden />
          {recipe.title}
        </button>
      );
    }
    // **bold** within plain spans
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return (
      <Fragment key={i}>
        {boldParts.map((b, j) =>
          b.startsWith("**") && b.endsWith("**") ? (
            <strong key={j} className="font-semibold text-foreground">
              {b.slice(2, -2)}
            </strong>
          ) : (
            b.replace(/\*([^*]+)\*/g, "$1")
          ),
        )}
      </Fragment>
    );
  });
}

function GuideMarkdown({
  content,
  recipeMap,
  onOpenRecipe,
  chipPulse,
}: {
  content: string;
  recipeMap: Map<string, RecipePublic>;
  onOpenRecipe: (r: RecipePublic) => void;
  chipPulse: boolean;
}) {
  const blocks = content.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isBulletBlock = lines.every(
          (l) => l.trim().startsWith("- ") || l.trim() === "",
        );
        if (isBulletBlock && lines.some((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i} className="space-y-1.5 pl-4">
              {lines
                .filter((l) => l.trim().startsWith("- "))
                .map((l, j) => (
                  <li key={j} className="list-disc marker:text-primary/60">
                    {renderInline(
                      l.trim().slice(2),
                      recipeMap,
                      onOpenRecipe,
                      chipPulse,
                    )}
                  </li>
                ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {renderInline(block, recipeMap, onOpenRecipe, chipPulse)}
          </p>
        );
      })}
    </div>
  );
}

// ── Share card canvas (1080×1350 IG portrait) ────────────────────────────────

function firstSentence(text: string): string {
  const clean = text
    .replace(/\[recipe:\d+\]/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const idx = clean.search(/[.!?]\s/);
  return idx === -1 ? clean.slice(0, 110) : clean.slice(0, idx + 1);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function renderShareCard(
  variety: VarietyPublic,
  zone: string,
  sections: GuideSectionDraft[],
  guideUrl: string,
  isHot: boolean,
): Promise<string> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, W, H);
  if (isHot) {
    grad.addColorStop(0, "#1c0a0a");
    grad.addColorStop(0.5, "#450a0a");
    grad.addColorStop(1, "#7f1d1d");
  } else {
    grad.addColorStop(0, "#08130c");
    grad.addColorStop(0.5, "#14532d");
    grad.addColorStop(1, "#166534");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillText("🌶️ IC SPICY · Growing Guide", 72, 110);

  ctx.font = "800 84px system-ui, sans-serif";
  const nameLines = wrapText(ctx, variety.name, W - 144);
  let y = 250;
  for (const l of nameLines.slice(0, 3)) {
    ctx.fillText(l, 72, y);
    y += 96;
  }
  ctx.font = "italic 400 44px Georgia, serif";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(variety.species, 72, y + 8);
  y += 76;

  ctx.font = "600 36px system-ui, sans-serif";
  ctx.fillStyle = isHot ? "#fca5a5" : "#86efac";
  ctx.fillText(`Personalized for Zone ${zone} · Regenerative KNF`, 72, y + 12);
  y += 92;

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, y);
  ctx.lineTo(W - 72, y);
  ctx.stroke();
  y += 76;

  for (const s of sections.slice(0, 3)) {
    ctx.font = "700 42px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(`${s.icon}  ${s.title}`, 72, y);
    y += 58;
    ctx.font = "400 34px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    for (const l of wrapText(ctx, firstSentence(s.content), W - 160).slice(0, 3)) {
      ctx.fillText(l, 72, y);
      y += 46;
    }
    y += 44;
    if (y > H - 320) break;
  }

  try {
    const qr = await QRCode.toDataURL(guideUrl, {
      width: 180,
      margin: 1,
      color: { dark: "#ffffff", light: "#00000000" },
    });
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = qr;
    });
    ctx.drawImage(img, W - 252, H - 252, 180, 180);
  } catch {
    /* QR optional */
  }

  ctx.font = "600 36px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("icspicy.app", 72, H - 96);

  return canvas.toDataURL("image/png");
}

// ── Component ────────────────────────────────────────────────────────────────

export type VarietyGuideCardProps = {
  variety: VarietyPublic;
  zone: string;
  status: "loading" | "generating" | "ready";
  sections: GuideSectionDraft[];
  recipes: RecipePublic[];
  isFallback: boolean;
  conditions: GuideConditions;
  personalized: boolean;
  canPersonalize: boolean;
  onApplyConditions: (c: GuideConditions) => void;
  intro?: string | null;
  provenance?: VarietyProvenancePublic | null;
};

export function VarietyGuideCard({
  variety,
  zone,
  status,
  sections,
  recipes,
  isFallback,
  conditions,
  personalized,
  canPersonalize,
  onApplyConditions,
  intro = null,
  provenance = null,
}: VarietyGuideCardProps) {
  const reducedMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState<string>("");
  const [activeRecipe, setActiveRecipe] = useState<RecipePublic | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [printQr, setPrintQr] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  const isHot = variety.scovilleMax > 0n;
  const recipeMap = useMemo(
    () => new Map(recipes.map((r) => [r.id.toString(), r])),
    [recipes],
  );
  const guideUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/variety/${variety.id.toString()}/guide`
      : "";

  useEffect(() => {
    if (sections.length > 0 && !sections.some((s) => s.id === activeSection)) {
      setActiveSection(sections[0]!.id);
    }
  }, [sections, activeSection]);

  useEffect(() => {
    if (!guideUrl) return;
    QRCode.toDataURL(guideUrl, { width: 120, margin: 1 })
      .then(setPrintQr)
      .catch(() => {});
  }, [guideUrl]);

  const gateOr = (fn: () => void) => () => {
    if (!canPersonalize) {
      toast.error(
        "Raven Member feature — hold 100K $RAVEN to unlock personalization, PDF and share cards.",
      );
      return;
    }
    fn();
  };

  const handleShare = async () => {
    const shareData = {
      title: `${variety.name} — Growing Guide`,
      text: `Regenerative growing guide for ${variety.name} (Zone ${zone}) on IC SPICY`,
      url: guideUrl,
    };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* cancelled — fall through to copy */
      }
    }
    await navigator.clipboard.writeText(guideUrl);
    toast.success("Guide link copied");
  };

  const handleDownloadCard = gateOr(() => {
    setDownloading(true);
    void renderShareCard(variety, zone, sections, guideUrl, isHot)
      .then((dataUrl) => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${variety.name.replace(/\s+/g, "-").toLowerCase()}-guide.png`;
        a.click();
        toast.success("Share card downloaded");
      })
      .catch(() => toast.error("Could not render share card"))
      .finally(() => setDownloading(false));
  });

  const handlePrint = gateOr(() => {
    window.requestAnimationFrame(() => window.print());
  });

  const active = sections.find((s) => s.id === activeSection) ?? sections[0];

  return (
    <div className="relative pb-28">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #guide-print-root, #guide-print-root * { visibility: visible; }
          #guide-print-root { position: absolute; inset: 0; background: white; color: black; }
        }
        @keyframes guide-gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8"
        style={{
          background: isHot
            ? "linear-gradient(120deg, #1c0a0a, #450a0a, #7f1d1d, #92400e, #450a0a)"
            : "linear-gradient(120deg, #08130c, #14532d, #166534, #3f6212, #14532d)",
          backgroundSize: "300% 300%",
          animation: reducedMotion
            ? undefined
            : "guide-gradient-shift 20s ease infinite",
        }}
      >
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            Regenerative Growing Guide
          </p>
          <h1 className="font-display text-3xl font-bold text-white sm:text-5xl">
            {variety.name}
          </h1>
          <p className="mt-1 italic text-white/60">{variety.species}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isHot && (
              <Badge className="border-red-400/40 bg-red-500/20 text-red-200">
                🔥 {Number(variety.scovilleMax).toLocaleString()} SHU
              </Badge>
            )}
            {variety.daysToMaturity.length > 0 && (
              <Badge className="border-amber-300/30 bg-amber-500/15 text-amber-100">
                ⏱ ~{variety.daysToMaturity[0]!.toString()} days to maturity
              </Badge>
            )}
            <Badge className="border-emerald-300/30 bg-emerald-500/15 text-emerald-100">
              📍 Personalized for Zone {zone}
              {personalized ? ` · ${conditions.soilType} soil` : ""}
            </Badge>
            {isFallback && (
              <Badge className="border-white/20 bg-white/10 text-white/70">
                KNF quick guide
              </Badge>
            )}
          </div>
        </motion.div>
        <button
          type="button"
          onClick={gateOr(() => setPersonalizeOpen(true))}
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur transition hover:bg-white/20"
        >
          <Settings2 className="size-3.5" aria-hidden />
          Personalize
        </button>
      </div>

      <VarietyProvenancePanel
        varietyName={variety.name}
        intro={intro}
        provenance={provenance}
      />

      {/* ── Generating state ── */}
      {status !== "ready" && (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/60 p-10 text-center backdrop-blur">
          {status === "generating" ? (
            <>
              <motion.div
                animate={reducedMotion ? {} : { rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="text-4xl"
              >
                🌱
              </motion.div>
              <div>
                <p className="font-semibold">
                  Generating your personalized guide…
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  SpicyAI is writing a Zone {zone} regenerative plan for{" "}
                  {variety.name}. This takes 10–20 seconds.
                </p>
              </div>
              <Sparkles className="size-4 animate-pulse text-primary" />
            </>
          ) : (
            <>
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading guide…</p>
            </>
          )}
        </div>
      )}

      {/* ── Section navigator + content ── */}
      {status === "ready" && sections.length > 0 && (
        <>
          <div className="scrollbar-none -mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeSection === s.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card/50 text-muted-foreground hover:border-primary/40"
                }`}
              >
                <span aria-hidden>{s.icon}</span>
                {s.title}
              </button>
            ))}
          </div>

          {active && (
            <motion.div
              key={active.id}
              initial={reducedMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mt-4"
            >
              <div className="rounded-2xl border border-white/5 bg-card/60 p-5 shadow-[0_8px_32px_-12px_rgb(0,0,0,0.5)] backdrop-blur-md sm:p-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <span aria-hidden>{active.icon}</span>
                    {active.title}
                  </h2>
                  {active.timing && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-400"
                    >
                      🗓 {active.timing}
                    </Badge>
                  )}
                </div>
                <GuideMarkdown
                  content={active.content}
                  recipeMap={recipeMap}
                  onOpenRecipe={setActiveRecipe}
                  chipPulse={!reducedMotion}
                />
              </div>
            </motion.div>
          )}

          {/* All sections stacked (scroll reading mode) */}
          <div className="mt-8 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Full guide
            </p>
            {sections.map((s, i) => (
              <motion.div
                key={s.id}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                className="rounded-2xl border border-white/5 bg-card/40 p-5 backdrop-blur-md transition sm:hover:translate-y-[-2px] sm:hover:shadow-[0_12px_40px_-14px_rgb(0,0,0,0.6)]"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <span aria-hidden>{s.icon}</span>
                    {s.title}
                  </h3>
                  {s.timing && (
                    <span className="text-xs text-amber-400/90">
                      🗓 {s.timing}
                    </span>
                  )}
                </div>
                <GuideMarkdown
                  content={s.content}
                  recipeMap={recipeMap}
                  onOpenRecipe={setActiveRecipe}
                  chipPulse={false}
                />
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* ── Sticky action bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 p-3 pb-[max(env(safe-area-inset-bottom,0px),12px)] backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={handlePrint}>
            <Printer className="mr-1.5 size-4" aria-hidden />
            PDF / Print
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void handleShare()}>
            <Share2 className="mr-1.5 size-4" aria-hidden />
            Share
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={downloading || sections.length === 0}
            onClick={handleDownloadCard}
          >
            {downloading ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-1.5 size-4" aria-hidden />
            )}
            Share card
          </Button>
        </div>
      </div>

      {/* ── Recipe slide-over ── */}
      <Sheet
        open={activeRecipe != null}
        onOpenChange={(open) => {
          if (!open) setActiveRecipe(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[80vh] overflow-y-auto rounded-t-2xl"
        >
          {activeRecipe && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" aria-hidden />
                  {activeRecipe.title}
                </SheetTitle>
                <SheetDescription>
                  {recipeCategoryLabel(activeRecipe.category)} ·{" "}
                  {activeRecipe.description.slice(0, 160)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                {activeRecipe.ingredients.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-semibold">Ingredients</p>
                    <ul className="space-y-1 pl-4 text-sm text-muted-foreground">
                      {activeRecipe.ingredients.slice(0, 8).map((ing, i) => (
                        <li key={i} className="list-disc">
                          {ing.amount} {ing.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {activeRecipe.steps.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-semibold">Steps</p>
                    <ol className="space-y-1.5 pl-4 text-sm text-muted-foreground">
                      {activeRecipe.steps.slice(0, 5).map((st, i) => (
                        <li key={i} className="list-decimal">
                          {st.instruction}
                        </li>
                      ))}
                      {activeRecipe.steps.length > 5 && (
                        <li className="list-none text-xs italic">
                          …{activeRecipe.steps.length - 5} more steps in the
                          full recipe
                        </li>
                      )}
                    </ol>
                  </div>
                )}
                <Link
                  to="/cookbook/$slug"
                  params={{ slug: activeRecipe.slug }}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View full recipe →
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Personalization sheet ── */}
      <PersonalizeSheet
        open={personalizeOpen}
        onOpenChange={setPersonalizeOpen}
        conditions={conditions}
        onApply={(c) => {
          setPersonalizeOpen(false);
          onApplyConditions(c);
        }}
      />

      {/* ── Print root ── */}
      <div id="guide-print-root" className="hidden print:block">
        <div style={{ padding: 32, fontFamily: "Georgia, serif" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "2px solid #b91c1c",
              paddingBottom: 12,
            }}
          >
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: "#b91c1c" }}>
                🌶️ IC SPICY — Regenerative Growing Guide
              </p>
              <h1 style={{ fontSize: 28, margin: "4px 0 0" }}>
                {variety.name}
              </h1>
              <p style={{ fontStyle: "italic", color: "#555", margin: 0 }}>
                {variety.species} · Zone {zone}
              </p>
            </div>
            {printQr && (
              <img src={printQr} alt="Guide QR" width={90} height={90} />
            )}
          </div>
          {sections.map((s) => (
            <div key={s.id} style={{ marginTop: 20 }}>
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>
                {s.icon} {s.title}
                {s.timing ? (
                  <span
                    style={{ fontSize: 12, color: "#92400e", marginLeft: 8 }}
                  >
                    ({s.timing})
                  </span>
                ) : null}
              </h2>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: "#222" }}>
                {s.content
                  .replace(/\[recipe:(\d+)\]/g, (_, id: string) => {
                    const r = recipeMap.get(id);
                    return r ? `“${r.title}” (icspicy.app/cookbook)` : "";
                  })
                  .replace(/\*\*/g, "")
                  .split(/\n{2,}/)
                  .map((p, i) => (
                    <p key={i} style={{ margin: "6px 0" }}>
                      {p}
                    </p>
                  ))}
              </div>
            </div>
          ))}
          <p
            style={{
              marginTop: 28,
              borderTop: "1px solid #ccc",
              paddingTop: 8,
              fontSize: 11,
              color: "#777",
            }}
          >
            Generated by IC SPICY · icspicy.app · Korean Natural Farming ·
            regenerative, biological growing
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Personalization sheet ────────────────────────────────────────────────────

const SOIL_TYPES = ["sandy", "clay", "loam", "muck"] as const;
const WATER_SOURCES = ["municipal", "well", "rainwater"] as const;

function PersonalizeSheet({
  open,
  onOpenChange,
  conditions,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conditions: GuideConditions;
  onApply: (c: GuideConditions) => void;
}) {
  const [soil, setSoil] = useState(conditions.soilType);
  const [water, setWater] = useState(conditions.waterSource);
  const [ph, setPh] = useState(conditions.ph?.toString() ?? "");
  const [zone, setZone] = useState(conditions.zone);

  useEffect(() => {
    if (open) {
      setSoil(conditions.soilType);
      setWater(conditions.waterSource);
      setPh(conditions.ph?.toString() ?? "");
      setZone(conditions.zone);
    }
  }, [open, conditions]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Personalize this guide</SheetTitle>
          <SheetDescription>
            Your conditions shape the soil, watering, and input advice.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <div className="space-y-1.5">
            <Label>Soil type</Label>
            <div className="flex flex-wrap gap-2">
              {SOIL_TYPES.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={soil === s ? "default" : "outline"}
                  onClick={() => setSoil(s)}
                  className="capitalize"
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Water source</Label>
            <div className="flex flex-wrap gap-2">
              {WATER_SOURCES.map((w) => (
                <Button
                  key={w}
                  type="button"
                  size="sm"
                  variant={water === w ? "default" : "outline"}
                  onClick={() => setWater(w)}
                  className="capitalize"
                >
                  {w}
                </Button>
              ))}
            </div>
            {water === "municipal" && (
              <p className="text-xs text-muted-foreground">
                Municipal water: the guide will include chlorine
                dechlorination steps before LAB/IMO applications.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="guide-ph">Soil pH (optional)</Label>
              <Input
                id="guide-ph"
                inputMode="decimal"
                placeholder="6.5"
                value={ph}
                onChange={(e) =>
                  setPh(e.target.value.replace(/[^0-9.]/g, ""))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guide-zone">USDA zone</Label>
              <Input
                id="guide-zone"
                placeholder="10a"
                value={zone}
                onChange={(e) => setZone(e.target.value.trim().slice(0, 4))}
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              onApply({
                soilType: soil,
                waterSource: water,
                ph: ph ? Number.parseFloat(ph) : null,
                zone: zone || "10a",
              })
            }
          >
            <Sparkles className="mr-1.5 size-4" aria-hidden />
            Regenerate guide with your conditions
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
