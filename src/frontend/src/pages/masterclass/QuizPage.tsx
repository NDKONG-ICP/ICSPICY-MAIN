/**
 * /masterclass/quiz/$lessonId — checkpoint quiz (server-graded pass for badges).
 */
import { createActor, type Backend } from "@/backend";
import { ConfettiBurst } from "@/components/checkout/ConfettiBurst";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActor } from "@/hooks/useActor";
import { useAuth } from "@/hooks/useAuth";
import { requireBackendRaw } from "@/lib/backend-raw";
import {
  chatErrorToString,
  getSpicyAiActor,
  toSpicyAiMessage,
} from "@/lib/spicyai-idl";
import { Seo } from "@/components/Seo";
import { Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  Flame,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useUsageTracking } from "../../hooks/useUsageTracking";
import { DeepDivePanel } from "../../masterclass/DeepDivePanel";
import { hasLiveQuiz, moduleForLessonId, tierDisplayForBadgeId } from "../../masterclass/curriculum";
import { getLessonById } from "../../masterclass/lesson-data";
import {
  MC_CARD,
  MC_CARD_ACCENT,
  MasterclassShell,
} from "../../masterclass/MasterclassShell";
import {
  M1_LESSONS,
  buildWhyPrompt,
  buildAnswersPayload,
  drawQuestions,
  getCachedExplanation,
  isMc,
  lessonDocPath,
  loadGuestProgress,
  newAttemptSeed,
  parseProgressJson,
  saveGuestProgress,
  setCachedExplanation,
  type ProgressLocal,
  type QuestionPublic,
  type QuizPublic,
} from "../../masterclass/quiz-helpers";

type AnswerState = {
  choice?: number;
  text?: string;
};

type GradedRow = {
  q: QuestionPublic;
  correct: boolean;
  explanation?: string;
  explaining?: boolean;
};

function correctHintForUx(q: QuestionPublic): string {
  if (isMc(q.kind) && q.choices.length > 0) {
    return `One of the four choices is correct (server holds the key). Re-read: ${q.prompt.slice(0, 80)}…`;
  }
  return "Use the key vocabulary from the lesson (whole words).";
}

export default function MasterclassQuizPage() {
  const params = useParams({ strict: false }) as { lessonId?: string };
  const lessonId = params.lessonId ?? "m1-l1";
  const { actor } = useActor<Backend>(createActor);
  const { isAuthenticated, login } = useAuth();
  const { track, USAGE } = useUsageTracking();
  const qc = useQueryClient();

  const quizQuery = useQuery({
    queryKey: ["masterclass", "quiz", lessonId],
    queryFn: async (): Promise<QuizPublic | null> => {
      const raw = requireBackendRaw(actor);
      const q = await raw.getLessonQuiz(lessonId);
      // Candid opt: [] | [QuizPublic]
      if (Array.isArray(q) && q.length === 1) return q[0] as QuizPublic;
      if (q && !Array.isArray(q)) return q as QuizPublic;
      return null;
    },
    enabled: !!actor,
  });

  const progressQuery = useQuery({
    queryKey: ["masterclass", "progress", isAuthenticated],
    queryFn: async (): Promise<ProgressLocal> => {
      if (!isAuthenticated) return loadGuestProgress();
      const raw = requireBackendRaw(actor);
      const json = await raw.getMyMasterclassProgress();
      return parseProgressJson(json);
    },
    enabled: !!actor || !isAuthenticated,
  });

  const badgesQuery = useQuery({
    queryKey: ["achievements", "myBadges", isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      const raw = requireBackendRaw(actor);
      return raw.getMyBadges();
    },
    enabled: !!actor && isAuthenticated,
  });

  const quiz = quizQuery.data;
  const attemptSeedRef = useRef<string>(newAttemptSeed());
  const [drawn, setDrawn] = useState<QuestionPublic[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [graded, setGraded] = useState<GradedRow[] | null>(null);
  const [serverResult, setServerResult] = useState<{
    correct: number;
    total: number;
    scorePct: number;
    passed: boolean;
    moduleBadgeMinted?: bigint;
    recorded: boolean;
  } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const quizStartTrackedRef = useRef(false);

  const lessonMeta = getLessonById(lessonId);
  const modMeta = moduleForLessonId(lessonId);

  const startAttempt = () => {
    if (!quiz) return;
    attemptSeedRef.current = newAttemptSeed();
    const d = drawQuestions(quiz, attemptSeedRef.current);
    quizStartTrackedRef.current = false;
    setDrawn(d);
    setAnswers({});
    setGraded(null);
    setServerResult(null);
    setCelebrate(false);
  };

  // Auto-start when quiz loads
  useEffect(() => {
    if (quiz && !drawn && !quizQuery.isFetching) {
      attemptSeedRef.current = newAttemptSeed();
      const d = drawQuestions(quiz, attemptSeedRef.current);
      setDrawn(d);
      setAnswers({});
      setGraded(null);
      setServerResult(null);
      setCelebrate(false);
    }
  }, [quiz, drawn, quizQuery.isFetching]);

  useEffect(() => {
    if (!drawn || quizStartTrackedRef.current) return;
    quizStartTrackedRef.current = true;
    track(
      USAGE.MASTERCLASS.QUIZ_START.feature,
      USAGE.MASTERCLASS.QUIZ_START.action,
      `quiz:${lessonId}`,
    );
  }, [drawn, lessonId, track, USAGE.MASTERCLASS.QUIZ_START]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!quiz || !drawn) throw new Error("No quiz");
      const answersJson = buildAnswersPayload(
        drawn,
        answers,
        attemptSeedRef.current,
      );

      const raw = requireBackendRaw(actor);
      const result = isAuthenticated
        ? await raw.submitQuizResult(lessonId, answersJson)
        : await raw.gradeQuizCheckpoint(lessonId, answersJson);
      if ("err" in result) throw new Error(result.err);
      return { ok: result.ok, drawn };
    },
    onSuccess: async (data) => {
      const ok = data.ok;
      const correctById = new Map(
        ok.questionResults.map((r) => [r.id, r.correct]),
      );

      if (!isAuthenticated) {
        const guest = loadGuestProgress();
        const prev = guest.lessons[lessonId];
        const scorePct = Number(ok.scorePct);
        guest.lessons[lessonId] = {
          attempts: (prev?.attempts ?? 0) + 1,
          bestScorePct: Math.max(prev?.bestScorePct ?? 0, scorePct),
          passed: (prev?.passed ?? false) || ok.passed,
          passedAt: prev?.passedAt ?? 0,
          quizVersion: Number(quiz?.quizVersion ?? 0),
        };
        saveGuestProgress(guest);
      }

      setServerResult({
        correct: Number(ok.correct),
        total: Number(ok.total),
        scorePct: Number(ok.scorePct),
        passed: ok.passed,
        moduleBadgeMinted: ok.moduleBadgeMinted[0],
        recorded: ok.recorded,
      });

      if (ok.moduleBadgeMinted.length === 1) {
        track(
          USAGE.MASTERCLASS.MODULE_BADGE_EARNED.feature,
          USAGE.MASTERCLASS.MODULE_BADGE_EARNED.action,
          `badge:${lessonId}`,
        );
        setCelebrate(true);
        toast.success("Module badge minted: Soil Keeper");
      } else if (ok.passed && ok.recorded) {
        track(
          USAGE.MASTERCLASS.QUIZ_PASS.feature,
          USAGE.MASTERCLASS.QUIZ_PASS.action,
          `quiz-pass:${lessonId}`,
        );
        toast.success("Lesson passed!");
      } else if (ok.passed) {
        track(
          USAGE.MASTERCLASS.QUIZ_PASS.feature,
          USAGE.MASTERCLASS.QUIZ_PASS.action,
          `quiz-pass:${lessonId}`,
        );
        toast.success(`Passed — ${ok.correct}/${ok.total}`);
      } else {
        toast.message(
          `Score ${ok.correct}/${ok.total} — need ${quiz?.passCorrect ?? 5} to pass.`,
        );
      }

      if (ok.recorded) {
        void qc.invalidateQueries({ queryKey: ["masterclass", "progress"] });
        void qc.invalidateQueries({ queryKey: ["achievements", "myBadges"] });
      } else {
        void qc.invalidateQueries({ queryKey: ["masterclass", "progress"] });
      }

      const rows: GradedRow[] = data.drawn.map((q) => ({
        q,
        correct: correctById.get(q.id) ?? false,
        explanation: undefined,
      }));
      setGraded(rows);

      const missed = data.drawn.filter((q) => !correctById.get(q.id));
      if (missed.length > 0) {
        void explainMisses(missed);
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Submit failed"),
  });

  async function explainMisses(qs: QuestionPublic[]) {
    const spicy = getSpicyAiActor();
    for (const q of qs) {
      const cached = getCachedExplanation(q.id);
      if (cached) {
        setGraded((prev) =>
          prev
            ? prev.map((r) =>
                r.q.id === q.id ? { ...r, explanation: cached } : r,
              )
            : prev,
        );
        continue;
      }
      setGraded((prev) =>
        prev
          ? prev.map((r) =>
              r.q.id === q.id ? { ...r, explaining: true } : r,
            )
          : prev,
      );
      if (!spicy) {
        setGraded((prev) =>
          prev
            ? prev.map((r) =>
                r.q.id === q.id
                  ? {
                      ...r,
                      explaining: false,
                      explanation: `SpicyAI unavailable. Review the lesson: ${q.explanationSlug}`,
                    }
                  : r,
              )
            : prev,
        );
        continue;
      }
      try {
        const prompt = buildWhyPrompt(
          q.prompt,
          correctHintForUx(q),
          q.explanationSlug,
        );
        const res = await spicy.chatWithLlm({
          messages: [toSpicyAiMessage({ role: "user", content: prompt })],
        });
        if (res.ok) {
          const text = res.ok.response;
          setCachedExplanation(q.id, text);
          setGraded((prev) =>
            prev
              ? prev.map((r) =>
                  r.q.id === q.id
                    ? { ...r, explaining: false, explanation: text }
                    : r,
                )
              : prev,
          );
        } else if (res.err) {
          const err = chatErrorToString(res.err);
          setGraded((prev) =>
            prev
              ? prev.map((r) =>
                  r.q.id === q.id
                    ? {
                        ...r,
                        explaining: false,
                        explanation: `Could not load AI explanation (${err}). Open the lesson instead.`,
                      }
                    : r,
                )
              : prev,
          );
        }
      } catch {
        setGraded((prev) =>
          prev
            ? prev.map((r) =>
                r.q.id === q.id
                  ? {
                      ...r,
                      explaining: false,
                      explanation:
                        "AI hiccup — use the lesson link below. Quiz grading is unaffected.",
                    }
                  : r,
              )
            : prev,
        );
      }
    }
  }

  const progress = progressQuery.data;
  const soilBadge = badgesQuery.data?.find(
    (b) => b.badgeType === "masterclass-soil-biology",
  );

  const lessonTitle =
    lessonMeta?.displayTitle ??
    M1_LESSONS.find((l) => l.id === lessonId)?.title ??
    lessonId;

  const answeredCount = useMemo(() => {
    if (!drawn) return 0;
    return drawn.filter((q) => {
      const a = answers[q.id];
      if (isMc(q.kind)) return a?.choice != null && a.choice >= 0;
      return Boolean(a?.text?.trim());
    }).length;
  }, [drawn, answers]);

  const heatPct = drawn?.length
    ? Math.round((answeredCount / drawn.length) * 100)
    : 0;

  return (
    <>
      {celebrate ? <ConfettiBurst /> : null}
      <Seo
        title={`${lessonTitle} Checkpoint | IC SPICY Masterclass`}
        description="Deterministic checkpoint quiz — read the lesson first; SpicyAI tutors misses; badges mint only on server-validated pass."
        path={`/masterclass/quiz/${lessonId}`}
      />
      <MasterclassShell
        badge={
          modMeta
            ? `${modMeta.tierDisplayName} · Checkpoint`
            : "Checkpoint Quiz"
        }
        title={quiz?.title ?? lessonTitle}
        subtitle={
          quiz
            ? `Draw ${Number(quiz.drawCount)} questions · pass ≥ ${Number(quiz.passCorrect)} correct`
            : "Loading checkpoint…"
        }
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/masterclass/lesson/$lessonId"
            params={{ lessonId }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read lesson first
          </Link>
          <Link
            to="/masterclass"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Hub
          </Link>
        </div>

        {soilBadge ? (
          <p className={`${MC_CARD_ACCENT} mb-4 flex items-center gap-2 px-4 py-2.5 text-xs text-orange-200`}>
            <Award className="h-3.5 w-3.5" />
            You hold the Soil Keeper badge (
            <code className="text-[10px]">masterclass-soil-biology</code> #
            {soilBadge.tokenId.toString()})
          </p>
        ) : null}

        {!isAuthenticated ? (
          <div className={`${MC_CARD} mb-4 px-4 py-3 text-sm text-muted-foreground`}>
            Guests get full server grading and SpicyAI tutoring.{" "}
            <button
              type="button"
              className="font-medium text-orange-300 underline"
              onClick={() => void login()}
            >
              Sign in with Internet Identity
            </button>{" "}
            to record progress and earn badges.
          </div>
        ) : null}

        {quizQuery.isPending ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !quiz ? (
          <p className={`${MC_CARD} p-6 text-sm text-muted-foreground`}>
            Quiz not loaded for this lesson yet (M2–M6 deferred).{" "}
            <Link
              to="/masterclass/lesson/$lessonId"
              params={{ lessonId }}
              className="text-orange-300 hover:underline"
            >
              Read the lesson
            </Link>
          </p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {M1_LESSONS.map((l) => {
                const p = progress?.lessons[l.id];
                return (
                  <Link
                    key={l.id}
                    to="/masterclass/quiz/$lessonId"
                    params={{ lessonId: l.id }}
                    className={`rounded-xl border px-2.5 py-2 text-[11px] backdrop-blur transition ${
                      l.id === lessonId
                        ? "border-orange-500/50 bg-orange-500/15"
                        : "border-white/[0.06] bg-black/25 hover:border-orange-500/25"
                    }`}
                  >
                    <div className="truncate font-medium">{l.title}</div>
                    <div className="text-muted-foreground">
                      {p?.passed
                        ? "Passed"
                        : p
                          ? `${p.bestScorePct}% best`
                          : "Not started"}
                    </div>
                  </Link>
                );
              })}
            </div>

            {drawn && !graded ? (
              <div className="space-y-6">
                <div className={`${MC_CARD} p-4`}>
                  <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1 text-orange-300">
                      <Flame className="h-3.5 w-3.5" />
                      Heat meter
                    </span>
                    <span>
                      {answeredCount}/{drawn.length} answered
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-300"
                      style={{ width: `${heatPct}%` }}
                    />
                  </div>
                </div>

                {drawn.map((q, idx) => (
                  <div key={q.id} className={`${MC_CARD} p-5`}>
                    <p className="mb-1 text-xs text-muted-foreground">
                      Q{idx + 1} · {isMc(q.kind) ? "Multiple choice" : "Short answer"}
                    </p>
                    <p className="text-sm font-medium leading-relaxed text-foreground">
                      {q.prompt}
                    </p>
                    {isMc(q.kind) ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {q.choices.map((c, i) => {
                          const selected = answers[q.id]?.choice === i;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                setAnswers((a) => ({
                                  ...a,
                                  [q.id]: { choice: i },
                                }))
                              }
                              className={[
                                "flex items-start gap-2 rounded-xl border px-3 py-3 text-left text-sm transition",
                                selected
                                  ? "border-orange-500/60 bg-orange-500/15 text-orange-50 shadow-[0_0_20px_rgba(234,88,12,0.15)]"
                                  : "border-white/[0.08] bg-black/25 text-muted-foreground hover:border-orange-500/30 hover:bg-orange-500/5",
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                                  selected
                                    ? "border-orange-400 bg-orange-500 text-white"
                                    : "border-white/20 bg-black/40",
                                ].join(" ")}
                              >
                                {selected ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  String.fromCharCode(65 + i)
                                )}
                              </span>
                              <span>{c}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <Input
                        className="mt-4 border-white/10 bg-black/30"
                        placeholder="Your answer…"
                        value={answers[q.id]?.text ?? ""}
                        onChange={(e) =>
                          setAnswers((a) => ({
                            ...a,
                            [q.id]: { text: e.target.value },
                          }))
                        }
                      />
                    )}
                  </div>
                ))}
                <Button
                  className="w-full gap-2 bg-primary hover:bg-primary/90"
                  disabled={submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  {submit.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Submit for grading
                </Button>
              </div>
            ) : null}

            {graded && serverResult ? (
              <div className="mb-6 space-y-4">
                <div className={`${MC_CARD_ACCENT} px-4 py-3`}>
                  <p className="font-display font-semibold text-foreground">
                    {serverResult.passed ? "Passed" : "Not yet"} —{" "}
                    {serverResult.correct}/{serverResult.total} (
                    {serverResult.scorePct}%)
                  </p>
                  {serverResult.moduleBadgeMinted != null ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Module badge minted as token #
                      {serverResult.moduleBadgeMinted.toString()}
                    </p>
                  ) : null}
                  {!serverResult.recorded ? (
                    <p className="mt-2 text-sm text-orange-100/90">
                      You scored {serverResult.correct}/{serverResult.total}.{" "}
                      <button
                        type="button"
                        className="font-medium text-orange-300 underline"
                        onClick={() => void login()}
                      >
                        Sign in with Internet Identity
                      </button>{" "}
                      to record your progress and earn the{" "}
                      {tierDisplayForBadgeId(quiz?.badgeId ?? "") ??
                        modMeta?.tierDisplayName ??
                        "module"}{" "}
                      badge.
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  className="gap-2 border-white/10"
                  onClick={startAttempt}
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry (new draw)
                </Button>
              </div>
            ) : null}

            {graded ? (
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 font-display font-semibold">
                  <MessageCircle className="h-4 w-4 text-orange-400" />
                  Results
                </h2>
                {graded.map((r) => (
                  <div
                    key={r.q.id}
                    className={`${MC_CARD} p-4 text-sm ${
                      r.correct
                        ? "border-emerald-500/25"
                        : "border-orange-500/25"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          r.correct
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-orange-500/20 text-orange-400"
                        }`}
                      >
                        {r.correct ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </span>
                      <p className="font-medium text-foreground">{r.q.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {graded && graded.some((r) => !r.correct) ? (
              <div className="mt-8 space-y-4">
                <h2 className="flex items-center gap-2 font-display font-semibold">
                  <MessageCircle className="h-4 w-4 text-orange-400" />
                  Why? (tutoring on misses)
                </h2>
                {graded
                  .filter((r) => !r.correct)
                  .map((r) => (
                    <div key={r.q.id} className={`${MC_CARD} p-4 text-sm`}>
                      <p className="font-medium text-foreground">{r.q.prompt}</p>
                      {r.explaining ? (
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          SpicyAI explaining…
                        </p>
                      ) : r.explanation ? (
                        <p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                          {r.explanation}
                        </p>
                      ) : null}
                      <Link
                        to={lessonDocPath(r.q.explanationSlug)}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-orange-300 hover:underline"
                      >
                        <BookOpen className="h-3 w-3" />
                        Back to lesson
                      </Link>
                    </div>
                  ))}
              </div>
            ) : null}

            <div className="mt-10">
              <DeepDivePanel
                lessonId={lessonId}
                lessonTitle={lessonMeta?.title ?? lessonTitle}
                moduleTitle={modMeta?.title ?? "Masterclass"}
              />
            </div>
          </>
        )}
      </MasterclassShell>
    </>
  );
}
