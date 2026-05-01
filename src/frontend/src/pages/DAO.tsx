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
import { ProposalType } from "../backend";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin } from "../hooks/useBackend";
import {
  useCreateProposal,
  useDAOStats,
  useHasDAOAccess,
  useProposals,
  useVoteOnProposal,
} from "../hooks/useDAO";
import type { CreateProposalInput, Proposal, ProposalId } from "../types/index";

// ─── Type configs ─────────────────────────────────────────────────────────────

type FilterType = "all" | ProposalType;

const TYPE_CONFIG: Record<ProposalType, { label: string; className: string }> =
  {
    [ProposalType.PlantVariety]: {
      label: "🌶️ Plant Variety",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    },
    [ProposalType.Seasoning]: {
      label: "🧂 Seasoning",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    },
    [ProposalType.General]: {
      label: "📋 General",
      className: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    },
  };

const FILTER_TABS: Array<{ key: FilterType; label: string }> = [
  { key: "all", label: "All" },
  { key: ProposalType.PlantVariety, label: "🌶️ Plant Variety" },
  { key: ProposalType.Seasoning, label: "🧂 Seasoning" },
  { key: ProposalType.General, label: "📋 General" },
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

function getWinningOption(proposal: Proposal): number | null {
  if (proposal.vote_counts.length === 0) return null;
  let maxIdx = 0;
  for (let i = 1; i < proposal.vote_counts.length; i++) {
    if (proposal.vote_counts[i] > proposal.vote_counts[maxIdx]) maxIdx = i;
  }
  return proposal.vote_counts[maxIdx] > BigInt(0) ? maxIdx : null;
}

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  canVote,
}: { proposal: Proposal; canVote: boolean }) {
  const vote = useVoteOnProposal();
  const { isAuthenticated } = useAuth();

  const totalVotes = proposal.vote_counts.reduce((a, b) => a + b, BigInt(0));
  const isExpired = Date.now() > Number(proposal.ends_at) / 1_000_000;
  const hasVoted =
    proposal.caller_vote !== undefined && proposal.caller_vote !== null;
  const winningIdx = isExpired ? getWinningOption(proposal) : null;
  const typeConfig = TYPE_CONFIG[proposal.proposal_type];
  const timeRemaining = getTimeRemaining(proposal.ends_at);

  const handleVote = async (index: number) => {
    if (!isAuthenticated) {
      toast.error("Sign in to vote.");
      return;
    }
    if (!canVote) {
      toast.error("You need a plant NFT or membership NFT to vote.");
      return;
    }
    try {
      await vote.mutateAsync({
        proposalId: proposal.id as ProposalId,
        optionIndex: BigInt(index),
      });
      toast.success("Vote cast! 🗳️");
    } catch {
      toast.error("Failed to cast vote. Try again.");
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
          {proposal.voter_count.toString()} voter
          {proposal.voter_count !== BigInt(1) ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {timeRemaining}
        </span>
        {hasVoted && (
          <span className="flex items-center gap-1.5 text-primary font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            You voted
          </span>
        )}
      </div>

      {/* Options + vote bars */}
      <div className="space-y-3">
        {proposal.options.map((opt, i) => {
          const votes = proposal.vote_counts[i] ?? BigInt(0);
          const pct =
            totalVotes > BigInt(0)
              ? Number((votes * BigInt(100)) / totalVotes)
              : 0;
          const isMyVote = hasVoted && Number(proposal.caller_vote) === i;
          const isWinner = winningIdx === i;
          const showVoteBtn = !isExpired && !hasVoted && canVote;

          return (
            <div key={`${proposal.id}-${i}`} className="space-y-1.5">
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
                  <span className="truncate">{opt}</span>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                  {votes.toString()} ({pct}%)
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
                    onClick={() => handleVote(i)}
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
              {proposal.options[winningIdx]}
            </span>{" "}
            won with {proposal.vote_counts[winningIdx]?.toString() ?? "0"} votes
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
  const [proposalType, setProposalType] = useState<ProposalType>(
    ProposalType.General,
  );
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

    const input: CreateProposalInput = {
      title: title.trim(),
      description: description.trim(),
      proposal_type: proposalType,
      options: validOptions,
      ends_at: BigInt(endsAtMs) * BigInt(1_000_000),
    };

    try {
      await createProposal.mutateAsync(input);
      toast.success("Proposal created! 🗳️");
      onClose();
      setTitle("");
      setDescription("");
      setProposalType(ProposalType.General);
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
              value={proposalType}
              onValueChange={(v) => setProposalType(v as ProposalType)}
            >
              <SelectTrigger
                className="bg-background border-input text-foreground"
                data-ocid="proposal-type-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value={ProposalType.PlantVariety}>
                  🌶️ Plant Variety
                </SelectItem>
                <SelectItem value={ProposalType.Seasoning}>
                  🧂 Seasoning
                </SelectItem>
                <SelectItem value={ProposalType.General}>📋 General</SelectItem>
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
      label: "Total Proposals",
      value: stats?.totalProposals ?? BigInt(0),
      icon: <Vote className="w-4 h-4" />,
    },
    {
      label: "Active",
      value: stats?.activeProposals ?? BigInt(0),
      icon: <Flame className="w-4 h-4 text-primary" />,
    },
    {
      label: "Total Votes",
      value: stats?.totalVotes ?? BigInt(0),
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
  const { isAuthenticated, login } = useAuth();
  const { data: hasAccess, isLoading: accessLoading } = useHasDAOAccess();
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: isAdmin } = useIsAdmin();

  const [filter, setFilter] = useState<FilterType>("all");
  const [createOpen, setCreateOpen] = useState(false);

  if (!isAuthenticated) {
    return <DAOGateBanner onLogin={login} />;
  }

  const canVote = Boolean(hasAccess);

  const filtered =
    proposals?.filter((p) =>
      filter === "all" ? true : p.proposal_type === filter,
    ) ?? [];

  const activeProposals = filtered.filter(
    (p) => Date.now() <= Number(p.ends_at) / 1_000_000,
  );
  const closedProposals = filtered.filter(
    (p) => Date.now() > Number(p.ends_at) / 1_000_000,
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

      {/* Member badge */}
      {canVote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-5 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30"
          data-ocid="dao-member-badge"
        >
          <Crown className="w-3.5 h-3.5" />
          DAO Member — voting enabled
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
