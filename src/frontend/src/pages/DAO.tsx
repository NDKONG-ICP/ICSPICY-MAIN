import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Lock,
  Plus,
  PlusCircle,
  ShoppingBag,
  Sprout,
  Trash2,
  Users,
  Vote,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  CreateProposalInput,
  ProposalCategory,
  ProposalPublic,
} from "../declarations/backend.did";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin } from "../hooks/useBackend";
import {
  useCreateProposal,
  useDAOStats,
  useHasDAOAccess,
  useHasVoted,
  useProposals,
  useVoteOnProposal,
} from "../hooks/useDAO";
import { useMyNftTokenIds, useNftTokenIdsForPrincipal } from "../hooks/useMyNftIds";
import { usePageTitle } from "../hooks/usePageTitle";
import { useOisyWallet } from "../providers/OisyWalletProvider";

type FilterType = "all" | string;

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  VarietyVote: {
    label: "🌶️ Variety Vote",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  ProductVote: {
    label: "🧂 Product Vote",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  CommunityDecision: {
    label: "📋 Community",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  TreasurySpend: {
    label: "💰 Treasury",
    className: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  },
  FeatureRequest: {
    label: "✨ Feature",
    className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  },
};

function categoryKey(c: ProposalCategory): string {
  return Object.keys(c)[0] ?? "CommunityDecision";
}

const FILTER_TABS: Array<{ key: FilterType; label: string }> = [
  { key: "all", label: "All" },
  { key: "VarietyVote", label: "🌶️ Variety" },
  { key: "ProductVote", label: "🧂 Product" },
  { key: "CommunityDecision", label: "📋 General" },
];

function getTimeRemaining(endsAt: bigint): string {
  const ms = Number(endsAt) / 1_000_000;
  const diff = ms - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m left`;
}

function getWinningOption(proposal: ProposalPublic): number | null {
  if (proposal.options.length === 0) return null;
  let maxIdx = 0;
  for (let i = 1; i < proposal.options.length; i++) {
    if (
      proposal.options[i]!.vote_count > proposal.options[maxIdx]!.vote_count
    ) {
      maxIdx = i;
    }
  }
  return proposal.options[maxIdx]!.vote_count > 0n ? maxIdx : null;
}

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  canVote,
}: { proposal: ProposalPublic; canVote: boolean }) {
  const vote = useVoteOnProposal();
  const { isAuthenticated } = useAuth();
  const { data: voteInfo } = useHasVoted(proposal.id);

  const totalVotes = proposal.total_votes;
  const isExpired =
    "Closed" in proposal.status ||
    "Cancelled" in proposal.status ||
    Date.now() > Number(proposal.voting_ends_at) / 1_000_000;
  const hasVoted = proposal.caller_vote.length === 1;
  const nftUsedForVote = voteInfo?.nft_token_id;
  const winningIdx = isExpired ? getWinningOption(proposal) : null;
  const catKey = categoryKey(proposal.category);
  const typeConfig =
    CATEGORY_CONFIG[catKey] ?? CATEGORY_CONFIG.CommunityDecision!;
  const timeRemaining = getTimeRemaining(proposal.voting_ends_at);

  const handleVote = async (optionId: bigint) => {
    if (!isAuthenticated) {
      toast.error("Sign in to vote.");
      return;
    }
    if (!canVote) {
      toast.error("You need an IC SPICY NFT to vote.");
      return;
    }
    try {
      await vote.mutateAsync({
        proposalId: proposal.id,
        optionIndex: optionId,
      });
      toast.success("Your vote has been cast ✅");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already voted")) {
        toast.error("You have already voted on this proposal.");
      } else if (msg.includes("already been used")) {
        // Extract NFT ID from the backend error message if present.
        const m = msg.match(/#(\d+)/);
        toast.error(
          m
            ? `NFT #${m[1]} has already been used to vote on this proposal.`
            : "This NFT has already been used to vote on this proposal.",
        );
      } else if (msg.includes("No eligible NFT")) {
        toast.error(
          "No eligible NFT found. You need an IC SPICY NFT that hasn't already voted.",
        );
      } else {
        toast.error("Failed to cast vote. Try again.");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors duration-200"
      data-ocid="proposal-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-foreground text-base leading-snug">
            {proposal.title}
          </h3>
          {proposal.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {proposal.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span
            className={`text-xs px-2 py-0.5 rounded-md border font-medium ${typeConfig.className}`}
          >
            {typeConfig.label}
          </span>
          {isExpired ? (
            <Badge variant="secondary" className="text-xs">
              Closed
            </Badge>
          ) : (
            <Badge className="text-xs bg-primary/10 text-primary border border-primary/30">
              Active
            </Badge>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {proposal.total_votes.toString()} voter
          {proposal.total_votes !== 1n ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {timeRemaining}
        </span>
        {hasVoted && (
          <span className="flex items-center gap-1.5 text-primary font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {nftUsedForVote !== undefined
              ? `Voted with NFT #${nftUsedForVote.toString()} ✅`
              : "Your vote has been cast ✅"}
          </span>
        )}
      </div>

      {/* Options + vote bars */}
      <div className="space-y-3">
        {proposal.options.map((opt, i) => {
          const votes = opt.vote_count;
          const pct = totalVotes > 0n ? Number((votes * 100n) / totalVotes) : 0;
          const isMyVote = hasVoted && proposal.caller_vote[0] === opt.id;
          const isWinner = winningIdx === i;
          const showVoteBtn = !isExpired && !hasVoted && canVote;

          return (
            <div key={`${proposal.id}-${opt.id}`} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm gap-2">
                <span
                  className={`flex items-center gap-1.5 font-medium min-w-0 ${
                    isMyVote
                      ? "text-primary"
                      : isWinner && isExpired
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {isWinner && isExpired && (
                    <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  )}
                  {isMyVote && (
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="truncate">{opt.option_label}</span>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                  {votes.toString()} voter{votes !== 1n ? "s" : ""} ({pct}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress
                  value={pct}
                  className={`flex-1 h-1.5 ${
                    isMyVote
                      ? "[&>div]:bg-primary"
                      : isWinner && isExpired
                        ? "[&>div]:bg-amber-400"
                        : "[&>div]:bg-muted-foreground/40"
                  }`}
                />
                {showVoteBtn && (
                  <button
                    type="button"
                    onClick={() => handleVote(opt.id)}
                    disabled={vote.isPending}
                    className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 hover:border-primary/40 transition-all duration-200 flex-shrink-0 font-medium disabled:opacity-50"
                    data-ocid="vote-btn"
                  >
                    {vote.isPending ? "…" : "Vote"}
                  </button>
                )}
                {!showVoteBtn && !isExpired && !hasVoted && (
                  <span className="text-xs text-muted-foreground/50 flex-shrink-0 w-[52px]" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Winner callout */}
      {isExpired && winningIdx !== null && (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Final result:{" "}
            <span className="font-semibold text-foreground">
              {proposal.options[winningIdx]?.option_label}
            </span>{" "}
            won with{" "}
            {proposal.options[winningIdx]?.vote_count.toString() ?? "0"} votes
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Create Proposal Modal ────────────────────────────────────────────────────

function CreateProposalModal({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const createProposal = useCreateProposal();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryKeyState, setCategoryKeyState] =
    useState<string>("CommunityDecision");
  const [options, setOptions] = useState<Array<{ id: string; value: string }>>([
    { id: "opt-0", value: "" },
    { id: "opt-1", value: "" },
  ]);
  const [endsAt, setEndsAt] = useState("");

  const addOption = () =>
    setOptions((prev) => [...prev, { id: `opt-${Date.now()}`, value: "" }]);
  const removeOption = (id: string) =>
    setOptions((prev) => prev.filter((o) => o.id !== id));
  const setOption = (id: string, val: string) =>
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, value: val } : o)),
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map((o) => o.value.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      toast.error("Please add at least 2 options.");
      return;
    }
    if (!endsAt) {
      toast.error("Please set an end date.");
      return;
    }
    const endsAtMs = new Date(endsAt).getTime();
    if (endsAtMs <= Date.now()) {
      toast.error("End date must be in the future.");
      return;
    }

    const categoryMap: Record<string, ProposalCategory> = {
      VarietyVote: { VarietyVote: null },
      ProductVote: { ProductVote: null },
      CommunityDecision: { CommunityDecision: null },
      TreasurySpend: { TreasurySpend: null },
      FeatureRequest: { FeatureRequest: null },
    };
    const startsAt = BigInt(Date.now()) * 1_000_000n;
    const input: CreateProposalInput = {
      title: title.trim(),
      description: description.trim(),
      category: categoryMap[categoryKeyState] ?? { CommunityDecision: null },
      options: validOptions.map((label) => ({
        option_label: label,
        description: [],
      })),
      voting_starts_at: startsAt,
      voting_ends_at: BigInt(endsAtMs) * 1_000_000n,
      publish_now: true,
    };

    try {
      await createProposal.mutateAsync(input);
      toast.success("Proposal created! 🗳️");
      onClose();
      setTitle("");
      setDescription("");
      setCategoryKeyState("CommunityDecision");
      setOptions([
        { id: "opt-0", value: "" },
        { id: "opt-1", value: "" },
      ]);
      setEndsAt("");
    } catch {
      toast.error("Failed to create proposal. Try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="create-proposal-modal"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-foreground flex items-center gap-2">
            <Vote className="w-5 h-5 text-primary" />
            Create Proposal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label
              htmlFor="proposal-title"
              className="text-sm text-foreground font-medium"
            >
              Title <span className="text-primary">*</span>
            </Label>
            <Input
              id="proposal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What should the community vote on?"
              required
              className="bg-background border-input text-foreground"
              data-ocid="proposal-title-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="proposal-desc"
              className="text-sm text-foreground font-medium"
            >
              Description
            </Label>
            <Textarea
              id="proposal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the proposal in more detail…"
              rows={3}
              className="bg-background border-input text-foreground resize-none"
              data-ocid="proposal-desc-input"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-sm text-foreground font-medium">
              Proposal Type <span className="text-primary">*</span>
            </Label>
            <Select
              value={categoryKeyState}
              onValueChange={setCategoryKeyState}
            >
              <SelectTrigger
                className="bg-background border-input text-foreground"
                data-ocid="proposal-type-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="VarietyVote">🌶️ Variety Vote</SelectItem>
                <SelectItem value="ProductVote">🧂 Product Vote</SelectItem>
                <SelectItem value="CommunityDecision">📋 General</SelectItem>
                <SelectItem value="FeatureRequest">
                  ✨ Feature Request
                </SelectItem>
                <SelectItem value="TreasurySpend">💰 Treasury Spend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground font-medium">
              Vote Options <span className="text-primary">*</span>
              <span className="text-muted-foreground font-normal ml-1">
                (min. 2)
              </span>
            </Label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Input
                    value={opt.value}
                    onChange={(e) => setOption(opt.id, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="bg-background border-input text-foreground flex-1"
                    data-ocid={`proposal-option-${i}`}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(opt.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 8 && (
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
                data-ocid="add-option-btn"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add option
              </button>
            )}
          </div>

          {/* End date */}
          <div className="space-y-1.5">
            <Label
              htmlFor="proposal-ends"
              className="text-sm text-foreground font-medium"
            >
              Voting Ends <span className="text-primary">*</span>
            </Label>
            <Input
              id="proposal-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
              className="bg-background border-input text-foreground"
              data-ocid="proposal-ends-input"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border"
              data-ocid="cancel-proposal-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProposal.isPending || !title.trim()}
              className="flex-1 bg-primary text-primary-foreground"
              data-ocid="submit-proposal-btn"
            >
              {createProposal.isPending ? "Creating…" : "Create Proposal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function DAOStatsBar() {
  const { data: stats, isLoading } = useDAOStats();

  const items = [
    {
      label: "Proposals Voted",
      value: stats?.callerVotes ?? 0n,
      icon: <Vote className="w-4 h-4" />,
    },
    {
      label: "Active",
      value: stats?.activeProposals ?? BigInt(0),
      icon: <Flame className="w-4 h-4 text-primary" />,
    },
    {
      label: "Total Voters",
      value: stats?.uniqueVoters ?? stats?.totalVotes ?? BigInt(0),
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-3 gap-3 mb-6"
      data-ocid="dao-stats-bar"
    >
      {items.map(({ label, value, icon }) => (
        <div
          key={label}
          className="p-3 rounded-xl bg-card border border-border text-center"
        >
          {isLoading ? (
            <Skeleton className="h-7 w-12 mx-auto mb-1" />
          ) : (
            <p className="text-2xl font-display font-bold text-foreground">
              {value.toString()}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            {icon}
            {label}
          </p>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Eligibility Banner ───────────────────────────────────────────────────────

function DAOEligibilityBanner({ nftCount }: { nftCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="mb-5 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-start gap-2"
      data-ocid="dao-eligibility-banner"
    >
      <Crown className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          You hold {nftCount} NFT{nftCount !== 1 ? "s" : ""} — eligible to vote
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          One person, one vote per proposal — extra NFTs do not add votes.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Access Gate Banner ───────────────────────────────────────────────────────

function DAOGateBanner({ onLogin }: { onLogin: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 text-center"
      data-ocid="dao-unauthenticated"
    >
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-2">
        DAO Access Required
      </h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        Sign in and hold any IC SPICY plant NFT or Membership NFT to participate
        in community governance.
      </p>
      <Button
        onClick={onLogin}
        className="bg-primary text-primary-foreground"
        data-ocid="dao-login-btn"
      >
        Connect with Internet Identity
      </Button>
    </div>
  );
}

// ─── No Access Banner ─────────────────────────────────────────────────────────

function NoAccessBanner() {
  return (
    <div
      className="mb-6 p-4 rounded-xl bg-card border border-primary/20 flex items-start gap-3"
      data-ocid="dao-no-access-banner"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sprout className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Join the DAO</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          You need a plant NFT or membership NFT to vote on proposals. Browse
          the marketplace to get yours!
        </p>
      </div>
      <a href="/marketplace">
        <Button
          size="sm"
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10 flex-shrink-0"
          data-ocid="dao-marketplace-cta"
        >
          <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
          Shop
        </Button>
      </a>
    </div>
  );
}

// ─── Main DAO Page ────────────────────────────────────────────────────────────

export default function DAOPage() {
  usePageTitle("DAO");

  const { isAuthenticated, login } = useAuth();
  const { isOisyConnected, oisyPrincipal } = useOisyWallet();
  const { data: hasAccess, isLoading: accessLoading } = useHasDAOAccess();
  const { data: myNftIds } = useMyNftTokenIds();
  // Direct public query for OISY-held NFTs — no II session needed
  const { data: oisyNftIds } = useNftTokenIdsForPrincipal(
    oisyPrincipal as import("@dfinity/principal").Principal | undefined,
  );
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: isAdmin } = useIsAdmin();

  const [filter, setFilter] = useState<FilterType>("all");
  const [createOpen, setCreateOpen] = useState(false);

  // Neither II nor OISY is connected — show gate
  if (!isAuthenticated && !isOisyConnected) {
    return <DAOGateBanner onLogin={login} />;
  }

  const oisyNftCount = oisyNftIds?.length ?? 0;
  const iiNftCount = myNftIds?.length ?? 0;

  // canVote: true if II says so (backend checks linked wallets), OR if OISY-only but holds NFTs
  // For OISY-only users: they can see the DAO but must sign in with II to cast votes
  const canVote = Boolean(hasAccess) || (isOisyConnected && !isAuthenticated && oisyNftCount > 0);

  const filtered =
    proposals?.filter((p) =>
      filter === "all" ? true : categoryKey(p.category) === filter,
    ) ?? [];

  const activeProposals = filtered.filter(
    (p) =>
      "Active" in p.status &&
      Date.now() <= Number(p.voting_ends_at) / 1_000_000,
  );
  const closedProposals = filtered.filter(
    (p) =>
      "Closed" in p.status ||
      "Cancelled" in p.status ||
      Date.now() > Number(p.voting_ends_at) / 1_000_000,
  );
  const isLoading = proposalsLoading || accessLoading;

  return (
    <div data-ocid="dao-page">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground mb-1">
            🗳️ IC SPICY <span className="text-fire">DAO</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Community governance — vote on new varieties, seasonings, and farm
            proposals.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary text-primary-foreground flex-shrink-0"
            data-ocid="create-proposal-btn"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Proposal
          </Button>
        )}
      </motion.div>

      {/* Stats bar */}
      <DAOStatsBar />

      {/* Access notice */}
      {!canVote && !accessLoading && <NoAccessBanner />}

      {/* Eligibility — show combined NFT count (II + OISY) */}
      {canVote && isAuthenticated && (
        <DAOEligibilityBanner nftCount={iiNftCount + oisyNftCount} />
      )}

      {/* OISY-only: eligible but needs II to vote */}
      {canVote && !isAuthenticated && isOisyConnected && oisyNftCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-2"
          data-ocid="dao-oisy-eligible-banner"
        >
          <Crown className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Eligible via OISY Wallet — {oisyNftCount} NFT{oisyNftCount !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your OISY-held NFTs qualify you to vote. Sign in with Internet Identity to cast your vote.
            </p>
            <Button size="sm" className="mt-2 h-7 text-xs" onClick={login}>
              Sign in with Internet Identity to Vote
            </Button>
          </div>
        </motion.div>
      )}

      {/* Filter tabs */}
      <div
        className="flex items-center gap-2 mb-6 overflow-x-auto pb-1"
        data-ocid="dao-filter-tabs"
      >
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 flex-shrink-0 font-medium ${
              filter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
            data-ocid={`filter-tab-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          data-ocid="dao-empty"
        >
          <Vote className="w-14 h-14 text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-foreground text-lg mb-2">
            No proposals yet
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            {filter === "all"
              ? "Governance is just getting started — check back soon!"
              : "No proposals in this category yet."}
          </p>
          {filter !== "all" && (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-4 text-xs text-primary hover:underline"
            >
              View all proposals
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {activeProposals.length > 0 && (
            <section>
              <h2
                className="font-display font-semibold text-foreground text-lg mb-4 flex items-center gap-2"
                data-ocid="active-proposals-heading"
              >
                <Vote className="w-5 h-5 text-primary" />
                Active Proposals
                <span className="text-sm font-normal text-muted-foreground">
                  ({activeProposals.length})
                </span>
              </h2>
              <div className="space-y-4" data-ocid="active-proposal-list">
                {activeProposals.map((p, i) => (
                  <motion.div
                    key={p.id.toString()}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <ProposalCard proposal={p} canVote={canVote} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {closedProposals.length > 0 && (
            <section>
              <h2
                className="font-display font-semibold text-foreground text-lg mb-4 flex items-center gap-2"
                data-ocid="closed-proposals-heading"
              >
                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                Closed Proposals
                <span className="text-sm font-normal text-muted-foreground">
                  ({closedProposals.length})
                </span>
              </h2>
              <div
                className="space-y-4 opacity-80"
                data-ocid="closed-proposal-list"
              >
                {closedProposals.map((p) => (
                  <ProposalCard
                    key={p.id.toString()}
                    proposal={p}
                    canVote={false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create Proposal Modal */}
      <CreateProposalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
