/**
 * /masterclass/lesson/$lessonId — readable teaching content before optional checkpoint quiz.
 */
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Seo } from "@/components/Seo";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Flame,
  Sprout,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useUsageTracking } from "../../hooks/useUsageTracking";
import { DeepDivePanel } from "../../masterclass/DeepDivePanel";
import { hasLiveQuiz, moduleForLessonId } from "../../masterclass/curriculum";
import {
  adjacentLessons,
  getLessonById,
  lessonPath,
} from "../../masterclass/lesson-data";
import { LessonMarkdown } from "../../masterclass/LessonMarkdown";
import {
  MC_CARD,
  MC_CARD_ACCENT,
  MC_CARD_EMERALD,
  MasterclassShell,
} from "../../masterclass/MasterclassShell";

export default function MasterclassLessonPage() {
  const params = useParams({ strict: false }) as { lessonId?: string };
  const lessonId = params.lessonId ?? "";
  const { track, USAGE } = useUsageTracking();
  const lesson = getLessonById(lessonId);
  const mod = moduleForLessonId(lessonId);
  const { prev, next } = adjacentLessons(lessonId);
  const [deeperOpen, setDeeperOpen] = useState(false);

  useEffect(() => {
    if (!lesson) return;
    track(
      USAGE.MASTERCLASS.LESSON_VIEW.feature,
      USAGE.MASTERCLASS.LESSON_VIEW.action,
      `lesson:${lesson.id}`,
    );
  }, [lesson, track, USAGE.MASTERCLASS.LESSON_VIEW]);

  if (!lesson) {
    return (
      <MasterclassShell
        badge="IC SPICY Masterclass"
        title="Lesson not found"
        subtitle="That lesson id is not in the catalog yet."
      >
        <div className={`${MC_CARD} p-6 text-center`}>
          <Link
            to="/masterclass"
            className="inline-flex items-center gap-1 text-sm text-orange-300 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to masterclass hub
          </Link>
        </div>
      </MasterclassShell>
    );
  }

  const quizLive = hasLiveQuiz(lesson.id);

  return (
    <>
      <Seo
        title={`${lesson.displayTitle} | IC SPICY Masterclass`}
        description={lesson.outcome || `Masterclass lesson ${lesson.displayTitle}`}
        path={`/masterclass/lesson/${lessonId}`}
      />
      <MasterclassShell
        badge={
          mod
            ? `Module ${lesson.module} · ${mod.tierDisplayName}`
            : `Module ${lesson.module} · Masterclass`
        }
        title={lesson.displayTitle}
        subtitle={lesson.outcome}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/masterclass"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All tracks
          </Link>
          <div className="flex gap-2">
            {prev ? (
              <Button variant="outline" size="sm" asChild className="border-white/10">
                <Link to="/masterclass/lesson/$lessonId" params={{ lessonId: prev.id }}>
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Prev
                </Link>
              </Button>
            ) : null}
            {next ? (
              <Button variant="outline" size="sm" asChild className="border-white/10">
                <Link to="/masterclass/lesson/$lessonId" params={{ lessonId: next.id }}>
                  Next
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {lesson.intro ? (
          <div className={`${MC_CARD} mb-6 p-5`}>
            <LessonMarkdown content={lesson.intro} />
          </div>
        ) : null}

        {lesson.sections.core ? (
          <section className={`${MC_CARD} mb-6 p-5`} data-ocid="lesson-core">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <h2 className="font-display text-lg font-semibold text-foreground">Core</h2>
            </div>
            <LessonMarkdown content={lesson.sections.core} />
          </section>
        ) : null}

        {lesson.sections.deeperHeat ? (
          <Collapsible
            open={deeperOpen}
            onOpenChange={setDeeperOpen}
            className={`${MC_CARD_ACCENT} mb-6 overflow-hidden`}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left transition hover:bg-orange-500/5">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" />
                <h2 className="font-display text-lg font-semibold text-orange-100">
                  Deeper Heat
                </h2>
                <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
                  Advanced
                </span>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-orange-300 transition-transform ${deeperOpen ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-orange-500/15 px-5 pb-5 pt-4">
              <LessonMarkdown content={lesson.sections.deeperHeat} />
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        {lesson.sections.growItLive ? (
          <section className={`${MC_CARD_EMERALD} mb-6 p-5`} data-ocid="lesson-grow-it-live">
            <div className="mb-4 flex items-center gap-2">
              <Sprout className="h-4 w-4 text-emerald-400" />
              <h2 className="font-display text-lg font-semibold text-emerald-100">
                Grow It Live
              </h2>
            </div>
            <LessonMarkdown content={lesson.sections.growItLive} />
            {(lesson.cookbookSlugs.length > 0 ||
              lesson.pepperpediaVarietyIds.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-emerald-500/15 pt-4">
                {lesson.cookbookSlugs.map((slug) => (
                  <Link
                    key={slug}
                    to="/cookbook/$slug"
                    params={{ slug }}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                  >
                    <BookOpen className="h-3 w-3" />
                    {slug}
                  </Link>
                ))}
                {lesson.pepperpediaVarietyIds.map((id) => (
                  <Link
                    key={id}
                    to="/variety/$varietyId/guide"
                    params={{ varietyId: String(id) }}
                    className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-200 hover:bg-orange-500/20"
                  >
                    <Sprout className="h-3 w-3" />
                    Variety #{id}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {lesson.gamePracticum ? (
          <div className={`${MC_CARD} mb-6 border-dashed p-4 text-sm text-muted-foreground`}>
            <span className="font-semibold text-orange-200">In-game practicum: </span>
            {lesson.gamePracticum}
          </div>
        ) : null}

        {lesson.sections.furtherReading ? (
          <section className={`${MC_CARD} mb-8 p-5 opacity-90`}>
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Further Reading
            </h2>
            <LessonMarkdown content={lesson.sections.furtherReading} />
          </section>
        ) : null}

        <section
          className={`${MC_CARD_ACCENT} mb-8 p-6 text-center`}
          data-ocid="lesson-checkpoint-cta"
        >
          <Target className="mx-auto mb-2 h-6 w-6 text-orange-400" />
          <h2 className="font-display text-lg font-semibold text-foreground">
            Ready for the checkpoint?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Read first, quiz when you want. Passing all Module 1 checkpoints earns your
            soulbound badge — free learning never requires a quiz.
          </p>
          {quizLive ? (
            <Button asChild className="mt-4 gap-2 bg-primary hover:bg-primary/90">
              <Link to="/masterclass/quiz/$lessonId" params={{ lessonId: lesson.id }}>
                <Flame className="h-4 w-4" />
                Take the checkpoint
              </Link>
            </Button>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Checkpoint quiz for this module is coming soon — keep reading.
            </p>
          )}
          <p className="mt-3">
            <Link
              to="/masterclass/lesson/$lessonId"
              params={{ lessonId: lesson.id }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {lessonPath(lesson.id)}
            </Link>
          </p>
        </section>

        <DeepDivePanel
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          moduleTitle={mod?.title ?? "Masterclass"}
        />
      </MasterclassShell>
    </>
  );
}
