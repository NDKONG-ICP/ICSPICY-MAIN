/**
 * Pepper Patch v2 UI — soil prep, inputs shed, weather HUD, field notes, tooltips.
 */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronDown, ChevronRight, CloudRain, FlaskConical, NotebookPen, Sprout } from "lucide-react";
import { useState } from "react";
import { AtlasSprite } from "./AtlasSprite";
import type { GardenState } from "./types";
import { UPGRADES } from "./constants";
import type { CareAction, CareInputChoice } from "./simulation";
import { WATER_DRENCH_INPUTS } from "./simulation";
import {
  EDU_BY_ID,
  INPUT_RECIPES,
  SOIL_AMENDMENTS,
  type InputKind,
  type MechanicId,
  type SoilAmendmentId,
} from "./v2-content";
import { averageSoilBiology, recordTip } from "./simulation-v2";

export function WeatherSeasonBar({
  garden,
  useSprites,
}: {
  garden: GardenState;
  useSprites: boolean;
}) {
  const wxSprite =
    garden.weather === "storm"
      ? "wx_storm"
      : garden.weather === "rain"
        ? "wx_rain"
        : null;
  return (
    <div className="mx-3 mb-2 flex shrink-0 items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2 text-[10px]">
      <div className="flex items-center gap-2">
        {useSprites ? (
          <AtlasSprite stem="season_dial" maxEdge={28} alt="Season" />
        ) : (
          <span>📅</span>
        )}
        <span className="capitalize text-orange-200/90">{garden.season}</span>
        <span className="text-muted-foreground">·</span>
        {wxSprite && useSprites ? (
          <AtlasSprite stem={wxSprite} maxEdge={24} alt={garden.weather} />
        ) : (
          <CloudRain className="h-3.5 w-3.5 text-sky-300/80" />
        )}
        <span className="capitalize">{garden.weather}</span>
      </div>
      <div className="text-emerald-300/90">
        Soil bio{" "}
        <strong className="tabular-nums">{Math.round(averageSoilBiology(garden))}%</strong>
      </div>
    </div>
  );
}

export function MechanicTooltip({
  tipId,
  onDismiss,
}: {
  tipId: MechanicId;
  onDismiss: () => void;
}) {
  const tip = EDU_BY_ID[tipId];
  if (!tip) return null;
  return (
    <div className="mx-3 mb-2 rounded-xl border border-emerald-500/30 bg-emerald-950/50 px-3 py-2 text-[11px]">
      <p className="font-semibold text-emerald-200">{tip.title}</p>
      <p className="mt-1 text-muted-foreground">{tip.body}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tip.cookbookSlug ? (
          <Link
            to="/cookbook/$slug"
            params={{ slug: tip.cookbookSlug }}
            className="inline-flex items-center gap-1 text-emerald-300 hover:underline"
          >
            <BookOpen className="h-3 w-3" />
            CookBook
          </Link>
        ) : null}
        {tip.masterclassLessonId ? (
          <Link
            to="/masterclass/lesson/$lessonId"
            params={{ lessonId: tip.masterclassLessonId }}
            className="text-orange-300 hover:underline"
          >
            Masterclass lesson
          </Link>
        ) : null}
        <button type="button" className="ml-auto text-muted-foreground hover:text-foreground" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}

export function FieldNotesPanel({ garden }: { garden: GardenState }) {
  const [open, setOpen] = useState(false);
  if (garden.fieldNotes.length === 0) return null;
  return (
    <div className="mx-3 mb-2 rounded-xl border border-white/[0.06] bg-black/25 p-2">
      <button
        type="button"
        className="flex w-full items-center gap-1 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <NotebookPen className="h-3 w-3" />
        Field Notes ({garden.fieldNotes.length})
      </button>
      {open ? (
        <ul className="mt-1 max-h-24 space-y-1 overflow-y-auto text-[10px] text-muted-foreground">
          {garden.fieldNotes.map((id) => {
            const tip = EDU_BY_ID[id as MechanicId];
            return (
              <li key={id}>
                <strong className="text-foreground/90">{tip?.title ?? id}</strong>
                {tip?.body ? ` — ${tip.body}` : ""}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function InputInventoryBar({
  garden,
  useSprites,
}: {
  garden: GardenState;
  useSprites: boolean;
}) {
  const stocked = INPUT_RECIPES.filter((r) => (garden.inputInventory[r.kind] ?? 0) > 0);
  if (stocked.length === 0 && garden.brewing.length === 0) return null;
  return (
    <div className="mx-3 mb-2 flex shrink-0 flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.06] bg-black/25 px-2 py-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        Brewed
      </span>
      {stocked.map((r) => (
        <span
          key={r.kind}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] text-emerald-200"
          title={r.blurb}
        >
          {useSprites ? <AtlasSprite stem={r.sprite} maxEdge={16} /> : null}
          {r.label}×{garden.inputInventory[r.kind]}
        </span>
      ))}
      {garden.brewing.length > 0 ? (
        <span className="text-[9px] text-orange-300/90">
          +{garden.brewing.length} brewing
        </span>
      ) : null}
    </div>
  );
}

export function UpgradeIconRow({
  garden,
  useSprites,
}: {
  garden: GardenState;
  useSprites: boolean;
}) {
  const owned = UPGRADES.filter((u) => garden.upgrades[u.id]);
  if (owned.length === 0) return null;
  return (
    <div className="mx-3 mb-2 flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-black/25 px-2 py-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        Upgrades
      </span>
      {owned.map((u) => (
        <span
          key={u.id}
          title={u.description}
          className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-100"
        >
          {useSprites ? <AtlasSprite stem={u.sprite} maxEdge={18} /> : u.emoji}
          {u.label}
        </span>
      ))}
    </div>
  );
}

export function CareInputPickerDialog({
  open,
  onOpenChange,
  action,
  garden,
  plotPhase,
  onPick,
  useSprites,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action: CareAction;
  garden: GardenState;
  plotPhase: "vegetative" | "flowering" | "fruiting" | null;
  onPick: (choice: CareInputChoice) => void;
  useSprites: boolean;
}) {
  const title =
    action === "water" ? "Water with" : action === "nutrient" ? "Feed with" : "Light";
  const plainLabel =
    action === "nutrient"
      ? "Plain feed (free, weaker)"
      : action === "water"
        ? "Plain water"
        : "Standard light";

  const options: { choice: CareInputChoice; label: string; blurb: string; sprite?: string }[] = [
    {
      choice: "plain",
      label: plainLabel,
      blurb:
        action === "nutrient"
          ? "Compost tea vibes — no brewed input consumed."
          : "Hydrate the bed without using inventory.",
    },
  ];

  for (const r of INPUT_RECIPES) {
    const count = garden.inputInventory[r.kind] ?? 0;
    if (count <= 0) continue;
    if (action === "water" && !WATER_DRENCH_INPUTS.includes(r.kind)) continue;
    const phaseMatch = plotPhase ? r.phases.includes(plotPhase) : true;
    options.push({
      choice: r.kind,
      label: `${r.label} ×${count}`,
      blurb: phaseMatch
        ? r.blurb
        : `${r.blurb} (off-phase — reduced bonus this stage)`,
      sprite: r.sprite,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {options.map((o) => (
            <button
              key={o.choice}
              type="button"
              onClick={() => {
                onPick(o.choice);
                onOpenChange(false);
              }}
              className="flex w-full items-start gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-xs transition hover:border-emerald-500/40 hover:bg-emerald-500/5"
            >
              {useSprites && o.sprite ? (
                <AtlasSprite stem={o.sprite} maxEdge={32} />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{o.label}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{o.blurb}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SoilPrepDialog({
  open,
  onOpenChange,
  plotLabel,
  picked,
  onToggle,
  onConfirm,
  onQuickPrep,
  useSprites,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plotLabel: string;
  picked: SoilAmendmentId[];
  onToggle: (id: SoilAmendmentId) => void;
  onConfirm: () => void;
  onQuickPrep: () => void;
  useSprites: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            {useSprites ? <AtlasSprite stem="fx_microbes" maxEdge={24} /> : <Sprout className="h-5 w-5" />}
            Soil Prep — {plotLabel}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Layer amendments before planting. Casual default (compost + mulch) gives a solid harvest; min-max for legendary batches.
        </p>
        <div className="space-y-2">
          {SOIL_AMENDMENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onToggle(a.id)}
              className={[
                "w-full rounded-lg border px-3 py-2 text-left text-xs transition",
                picked.includes(a.id)
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-white/10 hover:border-emerald-500/30",
              ].join(" ")}
            >
              <span className="font-semibold">{a.label}</span>
              <span className="text-muted-foreground"> +{a.biologyBoost} biology</span>
              <p className="mt-1 text-[10px] text-muted-foreground">{a.blurb}</p>
              <Link
                to="/cookbook/$slug"
                params={{ slug: a.cookbookSlug }}
                className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-300 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Full recipe →
              </Link>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onQuickPrep}>
            Quick prep (OK harvest)
          </Button>
          <Button className="flex-1" onClick={onConfirm}>
            Prep bed
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function InputsShedDialog({
  open,
  onOpenChange,
  garden,
  onBrew,
  useSprites,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  garden: GardenState;
  onBrew: (kind: InputKind) => void;
  useSprites: boolean;
}) {
  const now = Date.now();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            {useSprites ? <AtlasSprite stem="shed" maxEdge={32} /> : <FlaskConical className="h-5 w-5" />}
            Inputs Shed
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Brew on short timers; feed at care time. Inventory:{" "}
          {INPUT_RECIPES.map((r) => `${r.label}×${garden.inputInventory[r.kind] ?? 0}`).join(" · ")}
        </p>
        {garden.brewing.length > 0 && (
          <div className="rounded-lg border border-orange-500/20 bg-orange-950/30 p-2 text-[11px]">
            Brewing:{" "}
            {garden.brewing
              .map((b) => {
                const left = Math.max(0, Math.ceil((b.readyAt - now) / 1000));
                return `${INPUT_RECIPES.find((r) => r.kind === b.kind)?.label ?? b.kind} ${left}s`;
              })
              .join(", ")}
          </div>
        )}
        <div className="space-y-2">
          {INPUT_RECIPES.map((r) => (
            <div
              key={r.kind}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-2"
            >
              {useSprites ? <AtlasSprite stem={r.sprite} maxEdge={36} /> : null}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{r.label}</p>
                <p className="text-[10px] text-muted-foreground">{r.blurb}</p>
                <Link
                  to="/cookbook/$slug"
                  params={{ slug: r.cookbookSlug }}
                  className="text-[10px] text-emerald-300 hover:underline"
                >
                  Full recipe →
                </Link>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={garden.brewing.length >= 2}
                onClick={() => onBrew(r.kind)}
              >
                Brew {Math.round(r.brewMs / 1000)}s
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function maybeRecordTip(
  state: GardenState,
  tipId: MechanicId,
): GardenState {
  if (state.seenTips.includes(tipId)) return state;
  return recordTip(state, tipId);
}
