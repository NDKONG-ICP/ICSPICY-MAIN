/**
 * Admin → Users tab — searchable directory with profile view, tip, NFT
 * airdrop, and direct inbox messages (#airdrop).
 */
import { TipDialog } from "@/components/community/TipDialog";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { AdminUserRow, PostPublic } from "@/declarations/backend.did";
import {
  useAdminListUsers,
  useAdminSendNotification,
} from "@/hooks/useNotifications";
import {
  useAdminTransferFromPool,
  useIcrc7PoolTokensAdmin,
} from "@/hooks/useAdminShop";
import { createActor, type Backend } from "@/backend";
import { useActor } from "@/hooks/useActor";
import { exportRowsToCsv, datedCsvFilename } from "@/lib/nims-csv-export";
import type { ActorSubclass } from "@dfinity/agent";
import { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Gift,
  Loader2,
  MessageSquare,
  Search,
  UserCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { _SERVICE } from "@/declarations/backend.did";

const PAGE_SIZE = 25n;

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function displayName(row: AdminUserRow): string {
  return row.username.trim().length > 0
    ? row.username
    : `…${row.principal_id.toText().slice(-8)}`;
}

function tierBadge(tier: string) {
  if (tier === "pro") {
    return (
      <Badge variant="outline" className="text-purple-300 border-purple-500/40">
        pro
      </Badge>
    );
  }
  if (tier === "member") {
    return (
      <Badge variant="outline" className="text-blue-300 border-blue-500/40">
        member
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      free
    </Badge>
  );
}

function exportAdminUsersCsv(rows: AdminUserRow[]) {
  exportRowsToCsv(
    rows.map((r) => ({
      principal: r.principal_id.toText(),
      username: r.username,
      location: r.location.length === 1 ? r.location[0] : "",
      joined: new Date(Number(r.created_at) / 1_000_000).toISOString(),
      followers: r.follower_count.toString(),
      nfts: r.nft_count.toString(),
      raven_tier: r.raven_tier,
      last_active:
        r.last_active.length === 1
          ? new Date(Number(r.last_active[0]) / 1_000_000).toISOString()
          : "",
    })),
    datedCsvFilename("ic-spicy-users"),
  );
}

function useUserLatestPost(principal: Principal | undefined, enabled: boolean) {
  const { actor } = useActor<Backend>(createActor);
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["admin", "userLatestPost", principal?.toText()],
    queryFn: async (): Promise<PostPublic | null> => {
      if (!svc || !principal) return null;
      const posts = await svc.getUserPosts(principal, 0n, 1n);
      return posts[0] ?? null;
    },
    enabled: !!svc && !!principal && enabled,
  });
}

function AdminUserTipAction({ row }: { row: AdminUserRow }) {
  const [open, setOpen] = useState(false);
  const { data: post, isPending } = useUserLatestPost(row.principal_id, open);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => setOpen(true)}
      >
        Tip
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tip {displayName(row)}</DialogTitle>
            <DialogDescription className="text-xs">
              Tips settle via the author&apos;s latest post on-chain receipt.
            </DialogDescription>
          </DialogHeader>
          {isPending ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : post ? (
            <TipDialog
              postId={post.id}
              recipientPrincipalText={row.principal_id.toText()}
              triggerLabel="Send tip"
            />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              This user has no public posts — tips require a post anchor.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AdminUserAirdropDialog({
  row,
  open,
  onOpenChange,
}: {
  row: AdminUserRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [tokenId, setTokenId] = useState("");
  const transfer = useAdminTransferFromPool();
  const pool = useIcrc7PoolTokensAdmin({ Available: null }, 0n, 50n);

  const handleSend = () => {
    const id = tokenId.trim();
    if (!/^\d+$/.test(id)) {
      toast.error("Enter a valid token ID");
      return;
    }
    transfer.mutate(
      { tokenId: BigInt(id), to: row.principal_id },
      {
        onSuccess: () => {
          toast.success(`NFT #${id} airdropped to ${displayName(row)}`);
          onOpenChange(false);
          setTokenId("");
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Airdrop failed"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Airdrop NFT</DialogTitle>
          <DialogDescription className="text-xs">
            Transfer a pool token to {displayName(row)} via{" "}
            <code className="text-[10px]">adminTransferFromPool</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="airdrop-token-id">Token ID</Label>
            <Input
              id="airdrop-token-id"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="e.g. 7839"
              className="mt-1"
            />
          </div>
          {pool.data && pool.data.length > 0 ? (
            <div className="max-h-32 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                Available in pool
              </p>
              {pool.data.slice(0, 20).map((t) => (
                <button
                  key={t.token_id.toString()}
                  type="button"
                  className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-muted/50"
                  onClick={() => setTokenId(t.token_id.toString())}
                >
                  #{t.token_id.toString()}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={transfer.isPending}
            className="gap-1.5"
          >
            {transfer.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Gift className="w-3.5 h-3.5" />
            )}
            Airdrop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminUserNotifyDialog({
  row,
  open,
  onOpenChange,
}: {
  row: AdminUserRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const send = useAdminSendNotification();

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Message is required");
      return;
    }
    send.mutate(
      { recipient: row.principal_id, message: trimmed },
      {
        onSuccess: () => {
          toast.success("Notification sent");
          onOpenChange(false);
          setMessage("");
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Send failed"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send notification</DialogTitle>
          <DialogDescription className="text-xs">
            Lands in {displayName(row)}&apos;s inbox as an airdrop-style
            message — your promote tool.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Your message…"
        />
        <DialogFooter>
          <Button size="sm" onClick={handleSend} disabled={send.isPending}>
            {send.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserRowActions({ row }: { row: AdminUserRow }) {
  const [airdropOpen, setAirdropOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const pid = row.principal_id.toText();

  return (
    <div className="flex flex-wrap gap-1">
      <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
        <Link to="/u/$user" params={{ user: pid }}>
          View
        </Link>
      </Button>
      <AdminUserTipAction row={row} />
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        onClick={() => setAirdropOpen(true)}
      >
        <Gift className="w-3 h-3" />
        NFT
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        onClick={() => setNotifyOpen(true)}
      >
        <MessageSquare className="w-3 h-3" />
        Notify
      </Button>
      <AdminUserAirdropDialog
        row={row}
        open={airdropOpen}
        onOpenChange={setAirdropOpen}
      />
      <AdminUserNotifyDialog
        row={row}
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
      />
    </div>
  );
}

export function AdminUsersTab() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);

  const offset = BigInt(page) * PAGE_SIZE;
  const { data, isPending, isFetching } = useAdminListUsers(
    debounced,
    offset,
    PAGE_SIZE,
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0n;
  const totalPages = Math.max(1, Math.ceil(Number(total) / Number(PAGE_SIZE)));

  const handleSearch = () => {
    setDebounced(search);
    setPage(0);
  };

  const allRowsForExport = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-4" data-ocid="admin-users-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-primary" />
            User Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total.toString()} community profiles
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          disabled={rows.length === 0}
          onClick={() => {
            exportAdminUsersCsv(allRowsForExport);
            toast.success("Users CSV downloaded (current page)");
          }}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search username or principal…"
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button size="sm" className="h-9" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No users match your search.
        </p>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">User</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>NFTs</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="min-w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const pid = row.principal_id.toText();
                const avatarKey =
                  row.avatar_key.length === 1 ? row.avatar_key[0] : undefined;
                return (
                  <TableRow key={pid}>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <CommunityAvatar
                          principalText={pid}
                          username={row.username}
                          avatarKey={avatarKey}
                          size="sm"
                        />
                        <span className="text-sm font-medium truncate">
                          {displayName(row)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="font-mono text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 max-w-[140px] truncate"
                        title={pid}
                        onClick={() => {
                          void navigator.clipboard.writeText(pid);
                          toast.success("Principal copied");
                        }}
                      >
                        {pid.slice(0, 12)}…
                        <Copy className="w-3 h-3 shrink-0" />
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(
                        Number(row.created_at) / 1_000_000,
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.nft_count.toString()}
                    </TableCell>
                    <TableCell>{tierBadge(row.raven_tier)}</TableCell>
                    <TableCell>
                      <UserRowActions row={row} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0 || isFetching}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-muted-foreground text-xs">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages - 1 || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
