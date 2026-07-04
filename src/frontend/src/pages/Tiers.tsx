import { Link } from "@tanstack/react-router";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { Seo } from "../components/Seo";
import { staticRouteSeo } from "../lib/seo-routes.mjs";
import {
  RAVEN_MEMBER_THRESHOLD_UNITS,
  RAVEN_PRO_THRESHOLD_UNITS,
  useRavenPerks,
  type RavenTier,
} from "../hooks/useRavenPerks";

const ICPSWAP_RAVEN_URL =
  "https://app.icpswap.com/swap?input=ryjl3-tyaaa-aaaaa-aaaba-cai&output=4k7jk-vyaaa-aaaam-qcyaa-cai";

const TIER_FEATURES = [
  {
    label: "Browse & Buy",
    free: "✅",
    member: "✅ + 5% discount",
    pro: "✅ + 5% discount",
  },
  {
    label: "Pay with RAVEN",
    free: "✅",
    member: "✅",
    pro: "✅",
  },
  {
    label: "Community Tip with RAVEN",
    free: "✅",
    member: "✅",
    pro: "✅",
  },
  {
    label: "NIMS Plant Tracking",
    free: "Basic",
    member: "Full",
    pro: "Full",
  },
  {
    label: "Advanced NIMS Analytics",
    free: false,
    member: true,
    pro: true,
  },
  {
    label: "CSV Export",
    free: false,
    member: true,
    pro: true,
  },
  {
    label: "Weather History",
    free: "30 days",
    member: "Unlimited",
    pro: "Unlimited",
  },
  {
    label: "Garden Plant Limit",
    free: "20 plants",
    member: "100 plants",
    pro: "Unlimited",
  },
  {
    label: "AI Garden Generation",
    free: false,
    member: false,
    pro: true,
  },
  {
    label: "Profile Tier Badge",
    free: "—",
    member: "🐦‍⬛ Member",
    pro: "🐦‍⬛ Pro",
  },
] as const;

function FeatureCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
    ) : (
      <XCircle className="w-5 h-5 text-zinc-600 mx-auto" />
    );
  }
  return <span className="text-sm text-zinc-200">{value}</span>;
}

interface TierCardProps {
  tier: RavenTier;
  threshold: string;
  label: string;
  badgeClass: string;
  description: string;
  currentTier: RavenTier;
  totalUnits: bigint;
}

function TierCard({
  tier,
  threshold,
  label,
  badgeClass,
  description,
  currentTier,
  totalUnits,
}: TierCardProps) {
  const isCurrent = currentTier === tier;
  const thresholdUnits =
    tier === "member" ? RAVEN_MEMBER_THRESHOLD_UNITS : tier === "pro" ? RAVEN_PRO_THRESHOLD_UNITS : 0n;
  const progressPct =
    tier === "free"
      ? 100
      : Math.min(100, Number((totalUnits * 100n) / (thresholdUnits || 1n)));

  return (
    <div
      className={[
        "rounded-2xl border p-6 flex flex-col gap-4 relative overflow-hidden transition-all",
        isCurrent
          ? "border-indigo-500/50 bg-indigo-900/20 ring-1 ring-indigo-500/30"
          : "border-zinc-700/50 bg-zinc-900/50",
      ].join(" ")}
    >
      {isCurrent && (
        <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Current
        </span>
      )}
      <div>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${badgeClass} mb-2`}>
          {label}
        </span>
        {threshold && (
          <p className="text-xs text-zinc-400">{threshold}</p>
        )}
        <p className="text-sm text-zinc-300 mt-2">{description}</p>
      </div>

      {tier !== "free" && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Progress to {label}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const TIERS_SEO = staticRouteSeo("/tiers");

export default function TiersPage() {
  const ravenPerks = useRavenPerks();

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 pt-8 space-y-10">
      <Seo
        title={TIERS_SEO.title}
        description={TIERS_SEO.description}
        path="/tiers"
      />
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          🐦‍⬛ Membership Tiers
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm">
          Hold $RAVEN to unlock NIMS analytics, CSV export, expanded garden capacity, and shop discounts.
          PepperHead NFT benefits (DAO voting, 5–15% rarity discount) stack with all tiers.
        </p>
      </div>

      {/* Tier summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TierCard
          tier="free"
          threshold=""
          label="Free"
          badgeClass="bg-zinc-700/50 text-zinc-300 border border-zinc-600"
          description="Browse the shop, track plants, and participate in the community."
          currentTier={ravenPerks.tier}
          totalUnits={ravenPerks.totalUnits}
        />
        <TierCard
          tier="member"
          threshold={`Hold ${RAVEN_MEMBER_THRESHOLD_UNITS.toLocaleString()} RAVEN`}
          label="🐦‍⬛ Raven Member"
          badgeClass="bg-blue-600/20 text-blue-300 border border-blue-500/30"
          description="Unlock advanced analytics, CSV export, unlimited weather history, and 100-plant garden with a 5% shop discount."
          currentTier={ravenPerks.tier}
          totalUnits={ravenPerks.totalUnits}
        />
        <TierCard
          tier="pro"
          threshold={`Hold ${RAVEN_PRO_THRESHOLD_UNITS.toLocaleString()} RAVEN`}
          label="🐦‍⬛ Raven Pro"
          badgeClass="bg-purple-600/20 text-purple-300 border border-purple-500/30"
          description="Everything in Member plus AI Garden Generation and unlimited plant slots."
          currentTier={ravenPerks.tier}
          totalUnits={ravenPerks.totalUnits}
        />
      </div>

      {/* Feature comparison table */}
      <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/40 overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-zinc-700/50">
              <th className="text-left px-5 py-3 font-medium text-zinc-400 w-1/2">Feature</th>
              <th className="text-center px-3 py-3 font-medium text-zinc-400">Free</th>
              <th className="text-center px-3 py-3 font-medium text-blue-400">Member</th>
              <th className="text-center px-3 py-3 font-medium text-purple-400">Pro</th>
            </tr>
          </thead>
          <tbody>
            {TIER_FEATURES.map((row, i) => (
              <tr
                key={row.label}
                className={i % 2 === 0 ? "bg-zinc-800/20" : ""}
              >
                <td className="px-5 py-3 text-zinc-300">{row.label}</td>
                <td className="px-3 py-3 text-center">
                  <FeatureCell value={row.free} />
                </td>
                <td className="px-3 py-3 text-center">
                  <FeatureCell value={row.member} />
                </td>
                <td className="px-3 py-3 text-center">
                  <FeatureCell value={row.pro} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PepperHead note */}
      <div className="rounded-xl border border-red-500/20 bg-red-900/10 px-5 py-4 text-sm text-zinc-300">
        <span className="font-semibold text-red-400">🌶️ PepperHead NFT Benefits</span> — DAO voting
        access and rarity-based shop discounts (5–15%) stack with all RAVEN tiers, up to a maximum 20%
        total discount.{" "}
        <Link to="/marketplace" className="text-red-400 hover:underline">
          Buy a PepperHead NFT →
        </Link>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href={ICPSWAP_RAVEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          Get $RAVEN on ICPSwap
          <ExternalLink className="w-4 h-4" />
        </a>
        <Link
          to="/wallet"
          className="inline-flex items-center gap-2 border border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-400 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          View My Wallet
        </Link>
      </div>
    </div>
  );
}
