/**
 * /masterclass — track hub: read lessons first, quiz optional for badges.
 */
import { createActor, type Backend } from "@/backend";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { useActor } from "@/hooks/useActor";
import { useAuth } from "@/hooks/useAuth";
import { requireBackendRaw } from "@/lib/backend-raw";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  ChevronRight,
  Flame,
  Loader2,
  Target,
} from "lucide-react";
import {
  MASTERCLASS_MODULES,
  hasLiveQuiz,
  tierDisplayForBadgeId,
  type MasterclassModule,
} from "../../masterclass/curriculum";
import {
  LESSONS,
  lessonPath,
  lessonsForModule,
  quizPath,
} from "../../masterclass/lesson-data";
import {
  loadGuestProgress,
  parseProgressJson,
} from "../../masterclass/quiz-helpers";
import {
  MC_CARD,
  MC_CARD_ACCENT,
  MasterclassShell,
} from "../../masterclass/MasterclassShell";

function ModuleCard({
  mod,
  passedInModule,
  totalQuizzable,
}: {
  mod: MasterclassModule;
  passedInModule: number;
  totalQuizzable: number;
}) {
  const moduleLessons = lessonsForModule(mod.number);

  return (
    <article
      className={`${MC_CARD} overflow-hidden`}
      data-ocid={`masterclass-module-${mod.number}`}
    >
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-red-950/40 to-transparent px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400/90">
              Module {mod.number}
            </p>
            <h2 className="font-display text-lg font-bold text-foreground">
              {mod.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{mod.summary}</p>
          </div>
          <div className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-[10px] font-semibold text-orange-200">
            {mod.tierDisplayName}
          </div>
        </div>
        {mod.quizLive ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Checkpoint progress:{" "}
            <strong className="text-foreground">
              {passedInModule}/{totalQuizzable}
            </strong>{" "}
            passed · <span className="text-orange-200">{mod.tierDisplayName}</span> badge{" "}
            <code className="text-[10px] text-orange-300/80">{mod.badgeId}</code>
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            {moduleLessons.length} lessons · read free · quizzes coming soon
          </p>
        )}
      </div>

      <ul className="divide-y divide-white/[0.04]">
        {moduleLessons.map((lesson) => {
          const quizReady = hasLiveQuiz(lesson.id);
          return (
            <li key={lesson.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-white/[0.02]">
                <Link
                  to="/masterclass/lesson/$lessonId"
                  params={{ lessonId: lesson.id }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-foreground hover:text-orange-200"
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-emerald-400/80" />
                  <span className="truncate">{lesson.displayTitle}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
                {quizReady ? (
                  <Link
                    to="/masterclass/quiz/$lessonId"
                    params={{ lessonId: lesson.id }}
                    className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[10px] font-semibold text-orange-200 hover:bg-orange-500/20"
                  >
                    <Target className="h-3 w-3" />
                    Checkpoint
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default function MasterclassHubPage() {
  const { actor } = useActor<Backend>(createActor);
  const { isAuthenticated, login } = useAuth();

  const progressQuery = useQuery({
    queryKey: ["masterclass", "progress", isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated) return loadGuestProgress();
      const raw = requireBackendRaw(actor);
      return parseProgressJson(await raw.getMyMasterclassProgress());
    },
    enabled: !!actor || !isAuthenticated,
  });

  const badgesQuery = useQuery({
    queryKey: ["achievements", "myBadges", isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      const raw = requireBackendRaw(actor);
      const all = await raw.getMyBadges();
      return all.filter((b) => b.badgeType.startsWith("masterclass-"));
    },
    enabled: !!actor && isAuthenticated,
  });

  const progress = progressQuery.data;
  const m1 = MASTERCLASS_MODULES[0]!;
  const m1Lessons = lessonsForModule(1).filter((l) => hasLiveQuiz(l.id));
  const passedCount = m1Lessons.filter(
    (l) => progress?.lessons[l.id]?.passed,
  ).length;

  return (
    <>
      <Seo
        title="IC SPICY Masterclass"
        description="Soil-first grower masterclass — read 25 lessons free, checkpoint quizzes optional for soulbound badges."
        path="/masterclass"
      />
      <MasterclassShell
        badge="IC SPICY Masterclass"
        title="Grow the Heat, Soil First"
        subtitle="Twenty-five lessons across six tracks. Read every module for free — checkpoint quizzes are optional proof for soulbound badges."
      >
        {!isAuthenticated ? (
          <div className={`${MC_CARD_ACCENT} mb-6 flex flex-wrap items-center gap-3 px-4 py-3 text-sm`}>
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="flex-1 text-muted-foreground">
              Sign in to record checkpoint passes and earn soulbound badges.
            </span>
            <Button size="sm" onClick={() => void login()}>
              Sign in
            </Button>
          </div>
        ) : null}

        <div className={`${MC_CARD} mb-8 px-4 py-3 text-sm`}>
          <span className="text-muted-foreground">
            {LESSONS.length} lessons ready to read
          </span>
          {m1.quizLive ? (
            <>
              {" "}
              · Soil Keeper track:{" "}
              <strong className="text-orange-200">
                {passedCount}/{m1Lessons.length}
              </strong>{" "}
              passed
            </>
          ) : null}
          {progressQuery.isFetching ? (
            <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />
          ) : null}
        </div>

        {badgesQuery.data && badgesQuery.data.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
              <Award className="h-4 w-4 text-orange-400" />
              Earned masterclass badges
            </h2>
            <ul className="space-y-2">
              {badgesQuery.data.map((b) => (
                <li
                  key={b.tokenId.toString()}
                  className={`${MC_CARD_ACCENT} px-4 py-2.5 text-sm`}
                >
                  {tierDisplayForBadgeId(b.badgeType) ?? b.tier} ·{" "}
                  <code className="text-[10px] text-orange-300/70">{b.badgeType}</code> · #
                  {b.tokenId.toString()}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-6">
          {MASTERCLASS_MODULES.map((mod) => {
            const quizzable = lessonsForModule(mod.number).filter((l) =>
              hasLiveQuiz(l.id),
            );
            const passedInModule = quizzable.filter(
              (l) => progress?.lessons[l.id]?.passed,
            ).length;
            return (
              <ModuleCard
                key={mod.id}
                mod={mod}
                passedInModule={passedInModule}
                totalQuizzable={quizzable.length}
              />
            );
          })}
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Start with{" "}
          <Link
            to="/masterclass/lesson/$lessonId"
            params={{ lessonId: "m1-l1" }}
            className="text-orange-300 hover:underline"
          >
            {lessonPath("m1-l1")}
          </Link>
          {" · "}
          Module 1 checkpoint:{" "}
          <Link
            to="/masterclass/quiz/$lessonId"
            params={{ lessonId: "m1-l1" }}
            className="text-orange-300 hover:underline"
          >
            {quizPath("m1-l1")}
          </Link>
        </p>
      </MasterclassShell>
    </>
  );
}
