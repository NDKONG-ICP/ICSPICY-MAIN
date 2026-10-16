import {
  IconLargestPepper,
  IconLargestPlant,
  IconMostPeppers,
  IconTotalWeight,
} from "@/components/challenge/ChallengeCategoryIcons";
import { ChallengePostComposer } from "@/components/challenge/ChallengePostComposer";
import { AvatarUpload } from "@/components/community/AvatarUpload";
import { FeedSkeleton, PostCard } from "@/components/community";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  flattenChallengeFeedPages,
  useChallenge,
  useChallengeFeed,
  useChallengeLeaderboard,
  useJoinChallenge,
  useMyChallengeMembership,
  useMyChallengeMetrics,
  useSubmitChallengeMetrics,
  WINTER_GROW_ID,
} from "@/hooks/useChallenge";
import {
  useMyCommunityProfile,
  useSaveCommunityProfile,
} from "@/hooks/useProfile";
import type { CompeteCategory } from "@/declarations/backend.did";
import { Camera, Scale, LineChart, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { OnboardingHelpLinks } from "@/components/onboarding/OnboardingHost";
import { staticRouteSeo } from "../../lib/seo-routes.mjs";
import "./winter-grow.css";

type Tab = "home" | "feed" | "compete";

const WG_SEO = staticRouteSeo("/challenge/winter-grow");

const CATEGORIES: {
  key: CompeteCategory;
  label: string;
  unit: string;
  Icon: ComponentType<{ className?: string }>;
  short: string;
}[] = [
  {
    key: { mostPeppers: null },
    label: "Most Peppers Produced",
    unit: "count",
    short: "Most",
    Icon: IconMostPeppers,
  },
  {
    key: { largestPepper: null },
    label: "Largest Individual Pepper",
    unit: "mm",
    short: "Largest",
    Icon: IconLargestPepper,
  },
  {
    key: { totalWeight: null },
    label: "Total Weight of Peppers",
    unit: "g",
    short: "Weight",
    Icon: IconTotalWeight,
  },
  {
    key: { largestPlant: null },
    label: "Largest Plant",
    unit: "cm",
    short: "Plant",
    Icon: IconLargestPlant,
  },
];

function formatEtDeadline(nanos: bigint): string {
  const d = new Date(Number(nanos / 1_000_000n));
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function countdownLabel(closesAt: bigint): string {
  const ms = Number(closesAt / 1_000_000n) - Date.now();
  if (ms <= 0) return "Registration closed (Eastern)";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return `${days}d ${hours}h left to register · Eastern`;
}

export default function WinterGrowPage() {
  const { isAuthenticated, login, principal } = useAuth();
  const { data: challenge, isPending: challengePending } = useChallenge();
  const { data: membership, isPending: membershipPending } =
    useMyChallengeMembership();
  const { data: profile, isPending: profilePending } = useMyCommunityProfile();
  const saveProfile = useSaveCommunityProfile();
  const join = useJoinChallenge();
  const feed = useChallengeFeed();
  const submitMetrics = useSubmitChallengeMetrics();
  const { data: myMetrics } = useMyChallengeMetrics();

  const [tab, setTab] = useState<Tab>("home");
  const [displayName, setDisplayName] = useState("");
  const [avatarKey, setAvatarKey] = useState<string | undefined>();
  const [agreedRules, setAgreedRules] = useState(false);
  const [sameVariety, setSameVariety] = useState(false);
  const [onePlant, setOnePlant] = useState(false);
  const [catIdx, setCatIdx] = useState(0);
  const [pepperCount, setPepperCount] = useState("");
  const [largestMm, setLargestMm] = useState("");
  const [weightG, setWeightG] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [note, setNote] = useState("");

  const activeCat = CATEGORIES[catIdx]!;
  const leaderboard = useChallengeLeaderboard(activeCat.key);

  const posts = flattenChallengeFeedPages(feed.data);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const needsProfile =
    isAuthenticated &&
    !profilePending &&
    (!profile || !profile.username || profile.username.length === 0);

  const isMember = !!membership && !membership.suspended;
  const registrationOpen = challenge?.registrationOpen ?? false;

  useEffect(() => {
    if (!feed.hasNextPage || feed.isFetchingNextPage) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void feed.fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [feed.hasNextPage, feed.isFetchingNextPage, feed.fetchNextPage]);

  useEffect(() => {
    if (!myMetrics) return;
    setPepperCount(myMetrics.pepperCount.toString());
    setLargestMm(myMetrics.largestPepperMm.toString());
    setWeightG(myMetrics.totalWeightG.toString());
    setHeightCm(myMetrics.plantHeightCm.toString());
    setNote(myMetrics.note);
  }, [myMetrics]);

  const saveAndJoin = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    try {
      if (needsProfile) {
        if (!displayName.trim()) {
          toast.error("Display name required");
          return;
        }
        await saveProfile.mutateAsync({
          username: displayName.trim(),
          bio: "Winter Grow Challenge contestant",
          avatar_key: avatarKey ? [avatarKey] : [],
          location: [],
        });
      }
      if (!agreedRules || !sameVariety || !onePlant) {
        toast.error("Confirm same variety, one plant, and the rules");
        return;
      }
      await join.mutateAsync({
        challengeId: WINTER_GROW_ID,
        agreedRules: true,
        indoorOnly: true,
        onePlant: true,
      });
      toast.success("You’re in — welcome to Winter Grow");
      setTab("feed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join");
    }
  };

  const onSubmitMetrics = async () => {
    try {
      await submitMetrics.mutateAsync({
        pepperCount: BigInt(Math.max(0, Number(pepperCount) || 0)),
        largestPepperMm: BigInt(Math.max(0, Number(largestMm) || 0)),
        totalWeightG: BigInt(Math.max(0, Number(weightG) || 0)),
        plantHeightCm: BigInt(Math.max(0, Number(heightCm) || 0)),
        photoKeys: myMetrics?.photoKeys ?? [],
        note: note.trim(),
      });
      toast.success("Metrics saved (best values kept)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save metrics");
    }
  };

  return (
    <div className="wg-page" data-ocid="winter-grow-challenge">
      <Seo
        title={WG_SEO.title}
        description={WG_SEO.description}
        path="/challenge/winter-grow"
        ogImage={
          WG_SEO.ogImage ??
          "https://www.icspicy.app/og/winter-grow.png"
        }
      />

      <div className="wg-poster-wrap">
        <img
          className="wg-poster"
          src="/challenge/winter-grow-hero.png"
          alt="Winter Grow Challenge official poster — Plant Some Kindness, IC SPICY, hosted by Bobby Peppers"
          width={1200}
          height={1500}
          decoding="async"
          fetchPriority="high"
        />
        <div className="wg-poster-glow" aria-hidden />
      </div>

      <div className="wg-shell">
        <p className="wg-kicker">🌶️❄️ Welcome to the Winter Grow Challenge</p>
        <motion.div
          className="wg-display-block"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="wg-title-winter">
            WINTER
            <span className="wg-title-grow">Grow Challenge</span>
          </h1>
        </motion.div>
        <p className="wg-welcome">
          Think you can grow the best pepper plant?
        </p>
        <p className="wg-tagline">Real growers. Real rewards.</p>
        <p className="wg-lede">
          Everyone starts with the <strong>exact same pepper variety</strong>,
          the <strong>same start date</strong>, and{" "}
          <strong>one plant</strong> per participant. From there, it’s up to
          you.
        </p>

        <div className="wg-pill-row">
          <span className="wg-pill lime">Starts Nov 1</span>
          <span className="wg-pill ice">Seeds · Plant Some Kindness</span>
          <span className="wg-pill">Prizes · IC SPICY · TBD</span>
        </div>

        {challenge ? (
          <p className="wg-countdown">
            {countdownLabel(challenge.registrationClosesAt)}
            <br />
            <span className="normal-case tracking-normal text-white/45">
              Register by {formatEtDeadline(challenge.registrationClosesAt)}
            </span>
          </p>
        ) : null}

        <div className="wg-host-card">
          <span className="wg-host-name">Bobby Peppers</span>
          <span className="wg-host-tag">Host · Built to Burn</span>
        </div>
        <div className="mb-4 flex justify-center">
          <OnboardingHelpLinks className="justify-center text-[0.7rem] text-white/55 [&_button]:text-white/60 [&_button:hover]:text-[var(--wg-lime)]" />
        </div>

        {!isMember ? (
          <div className="wg-cta-row">
            {!isAuthenticated ? (
              <Button
                className="wg-btn-fire bg-[var(--wg-crimson)] text-white w-full sm:w-auto font-bold"
                onClick={login}
              >
                Sign in to enter
              </Button>
            ) : registrationOpen ? (
              <Button
                className="wg-btn-fire bg-[var(--wg-crimson)] text-white w-full sm:w-auto font-bold"
                onClick={() =>
                  document
                    .getElementById("wg-register")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Register now
              </Button>
            ) : (
              <Button disabled variant="outline" className="w-full sm:w-auto">
                Registration closed
              </Button>
            )}
          </div>
        ) : null}

        {isMember ? (
          <>
            <div className="wg-actions">
              <button
                type="button"
                className="wg-action"
                onClick={() => setTab("feed")}
              >
                <Camera />
                Record
              </button>
              <button
                type="button"
                className="wg-action"
                onClick={() => setTab("compete")}
              >
                <Scale />
                Weigh
              </button>
              <button
                type="button"
                className="wg-action"
                onClick={() => setTab("compete")}
              >
                <LineChart />
                Track
              </button>
              <button
                type="button"
                className="wg-action"
                onClick={() => setTab("compete")}
              >
                <Trophy />
                Compete
              </button>
            </div>
            <div className="wg-tabs" role="tablist">
              {(
                [
                  ["home", "Rules"],
                  ["feed", "Feed"],
                  ["compete", "Compete"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  className="wg-tab"
                  data-active={tab === id}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {(tab === "home" || !isMember) && (
          <>
            <section className="wg-panel">
              <h2>Categories to be judged</h2>
              <div className="wg-cats">
                {CATEGORIES.map((c, i) => (
                  <motion.div
                    key={c.label}
                    className="wg-cat"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.35 }}
                  >
                    <c.Icon />
                    <strong>{c.label}</strong>
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="wg-panel wg-prize">
              <h2 className="crimson">Prize pool</h2>
              <div className="wg-prize-amount">CRYPTO PRIZES · TBD</div>
              <p>
                IC SPICY is the prize sponsor. Exact cryptocurrency amounts are{" "}
                <strong>TBD</strong>. A transparent on-app{" "}
                <strong>Prize Pool</strong> (tokens + NFTs loaded from
                treasury) is planned next — this page will show what’s in the
                pot when it’s live.
              </p>
            </section>

            <section className="wg-panel">
              <h2 className="ice">How it works</h2>
              <ul className="wg-rules">
                <li>
                  <strong>Challenge starts November 1st</strong> — seeds started
                  together for a level playing field.
                </li>
                <li>
                  <strong>Seeds sponsored by Plant Some Kindness</strong> —
                  every participant gets the same variety.
                </li>
                <li>
                  <strong>One seed. One plant. Same variety.</strong> Cull to a
                  single plant and grow it best.
                </li>
                <li>
                  <strong>Weekly check-ins on IC SPICY</strong> — share progress
                  photos, measurements, tips, and struggles in this group.
                  Official competition photos and pepper weights are recorded
                  here for fairness.
                </li>
                <li>
                  Not just winning — learn, share knowledge, help other growers,
                  and have fun through the winter.
                </li>
              </ul>
              {challengePending ? (
                <p className="text-sm text-white/50 mt-3">Loading…</p>
              ) : challenge ? (
                <p className="text-sm text-white/50 mt-3">
                  {challenge.rulesSummary}
                </p>
              ) : null}
            </section>

            {!isMember && registrationOpen ? (
              <section
                id="wg-register"
                className="wg-panel"
              >
                <h2>Fast entry</h2>
                {!isAuthenticated ? (
                  <Button
                    className="mt-1 w-full bg-[var(--wg-crimson)]"
                    onClick={login}
                  >
                    Sign in with Internet Identity
                  </Button>
                ) : membershipPending || profilePending ? (
                  <p className="text-sm text-white/50">Checking your profile…</p>
                ) : (
                  <div className="space-y-3 mt-1">
                    {needsProfile ? (
                      <>
                        {principal ? (
                          <AvatarUpload
                            principalText={principal.toText()}
                            username={displayName}
                            avatarKey={avatarKey}
                            onAvatarKey={setAvatarKey}
                          />
                        ) : null}
                        <div className="space-y-1">
                          <Label className="text-white/70">Display name *</Label>
                          <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            maxLength={64}
                            className="bg-black/40 border-white/15 text-white"
                            placeholder="PepperGrower42"
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-white/70">
                        Profile ready as{" "}
                        <span className="text-[var(--wg-lime)]">
                          @{profile?.username}
                        </span>
                      </p>
                    )}
                    <label className="wg-check">
                      <Checkbox
                        checked={sameVariety}
                        onCheckedChange={(v) => setSameVariety(v === true)}
                      />
                      I’ll grow the official sponsored variety only
                    </label>
                    <label className="wg-check">
                      <Checkbox
                        checked={onePlant}
                        onCheckedChange={(v) => setOnePlant(v === true)}
                      />
                      One plant only (cull to a single plant)
                    </label>
                    <label className="wg-check">
                      <Checkbox
                        checked={agreedRules}
                        onCheckedChange={(v) => setAgreedRules(v === true)}
                      />
                      I agree to the challenge rules & weekly check-ins
                    </label>
                    <Button
                      className="wg-btn-fire w-full bg-[var(--wg-lime)] text-black font-bold"
                      disabled={join.isPending || saveProfile.isPending}
                      onClick={() => void saveAndJoin()}
                    >
                      {join.isPending || saveProfile.isPending
                        ? "Entering…"
                        : "Join Winter Grow"}
                    </Button>
                  </div>
                )}
              </section>
            ) : null}

            <p className="wg-motto">Grow · Share · Learn · Compete</p>
          </>
        )}

        {isMember && tab === "feed" ? (
          <section>
            <p className="wg-social-note">
              Same tools as Community Garden: upload weekly check-in photos,
              post updates, comment, like, tip, and share. This feed is private
              to Winter Grow members.
            </p>
            <ChallengePostComposer
              challengeId={WINTER_GROW_ID}
              onPublished={() => void feed.refetch()}
            />
            <div className="wg-feed">
              {feed.isPending ? <FeedSkeleton /> : null}
              {!feed.isPending && posts.length === 0 ? (
                <p className="text-center text-white/50 text-sm py-8">
                  No check-ins yet — tap Record and share your first photo.
                </p>
              ) : null}
              {posts.map((post) => (
                <PostCard key={post.id.toString()} post={post} />
              ))}
              <div ref={loadMoreRef} />
            </div>
          </section>
        ) : null}

        {isMember && tab === "compete" ? (
          <section className="wg-panel space-y-3">
            <h2>Weigh · Track · Compete</h2>
            <p className="wg-honor">
              Self-reported for v1 (honor + photos). Best submitted value per
              category is kept. Post proof in the feed — official photos &
              weights live on IC SPICY.
            </p>
            <div className="wg-metric-grid">
              <label>
                Most peppers (count)
                <input
                  inputMode="numeric"
                  value={pepperCount}
                  onChange={(e) => setPepperCount(e.target.value)}
                />
              </label>
              <label>
                Largest pepper (mm)
                <input
                  inputMode="numeric"
                  value={largestMm}
                  onChange={(e) => setLargestMm(e.target.value)}
                />
              </label>
              <label>
                Total weight (g)
                <input
                  inputMode="numeric"
                  value={weightG}
                  onChange={(e) => setWeightG(e.target.value)}
                />
              </label>
              <label>
                Largest plant (cm)
                <input
                  inputMode="numeric"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </label>
            </div>
            <label className="grid gap-1 text-xs uppercase tracking-wide text-white/50">
              Note
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-md border border-white/15 bg-black/45 text-white p-2 text-sm normal-case tracking-normal"
              />
            </label>
            <Button
              className="w-full bg-[var(--wg-lime)] text-black font-bold"
              disabled={submitMetrics.isPending}
              onClick={() => void onSubmitMetrics()}
            >
              {submitMetrics.isPending ? "Saving…" : "Update metrics"}
            </Button>

            <div className="pt-2">
              <div className="flex flex-wrap gap-1 mb-2">
                {CATEGORIES.map((c, i) => (
                  <button
                    key={c.label}
                    type="button"
                    className="wg-tab"
                    style={{ flex: "unset", paddingInline: "0.65rem" }}
                    data-active={catIdx === i}
                    onClick={() => setCatIdx(i)}
                  >
                    {c.short}
                  </button>
                ))}
              </div>
              <ul className="wg-leaderboard">
                {(leaderboard.data ?? []).map((row, i) => (
                  <li key={row.principal.toText()}>
                    <span>
                      <span className="rank">#{i + 1}</span>
                      {row.username.length === 1
                        ? `@${row.username[0]}`
                        : `${row.principal.toText().slice(0, 12)}…`}
                    </span>
                    <span className="text-[var(--wg-lime)] font-bold">
                      {row.value.toString()} {activeCat.unit}
                    </span>
                  </li>
                ))}
                {(leaderboard.data ?? []).length === 0 ? (
                  <li className="text-white/45">No entries yet</li>
                ) : null}
              </ul>
            </div>

            <div className="wg-panel wg-prize !mb-0 mt-2">
              <h2 className="crimson">Prize pool</h2>
              <div className="wg-prize-amount">TBD</div>
              <p>
                Transparent treasury prize pool (tokens + NFTs) coming — amounts
                not set yet.
              </p>
            </div>
          </section>
        ) : null}

        {!isMember && registrationOpen && isAuthenticated ? (
          <div className="wg-sticky-cta sm:hidden">
            <Button
              className="w-full bg-[var(--wg-crimson)] text-white font-bold"
              onClick={() =>
                document
                  .getElementById("wg-register")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Register for Winter Grow
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
