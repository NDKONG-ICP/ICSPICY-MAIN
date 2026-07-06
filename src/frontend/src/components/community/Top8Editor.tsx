/**
 * MySpace-style Top 8 picker — choose up to 8 people you follow and
 * drag to reorder. Saves via setTop8 (backend validates follows + max 8).
 */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActorSubclass } from "@dfinity/agent";
import { Principal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import { GripVertical, Loader2, Plus, Users, X } from "lucide-react";
import { Reorder } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Backend } from "../../backend";
import { createActor } from "../../backend";
import type {
  UserProfilePublic,
  _SERVICE,
} from "../../declarations/backend.did";
import { useActor } from "../../hooks/useActor";
import { useActorReady } from "../../hooks/useActorReady";
import { useSetTop8 } from "../../hooks/usePublicProfilePage";
import { CommunityAvatar } from "./CommunityAvatar";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function useMyFollowing(me: Principal | undefined) {
  const { actor } = useActor<Backend>(createActor);
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["community", "following", me?.toText()],
    queryFn: async (): Promise<UserProfilePublic[]> => {
      if (!svc || !me) return [];
      return svc.getFollowing(me, 0n, 200n);
    },
    enabled: !!svc && actorReady && !!me,
  });
}

function displayName(p: UserProfilePublic): string {
  return p.username.trim().length > 0
    ? p.username
    : `…${p.principal_id.toText().slice(-5)}`;
}

export function Top8Editor({
  me,
  currentTop8,
}: {
  me: Principal;
  currentTop8: Principal[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const { data: following = [], isPending } = useMyFollowing(open ? me : undefined);
  const setTop8 = useSetTop8();

  // Seed the working list each time the dialog opens.
  useEffect(() => {
    if (open) setSelected(currentTop8.map((p) => p.toText()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const byPid = new Map(following.map((f) => [f.principal_id.toText(), f]));
  const available = following.filter(
    (f) => !selected.includes(f.principal_id.toText()),
  );

  const handleSave = () => {
    setTop8.mutate(
      selected.map((t) => Principal.fromText(t)),
      {
        onSuccess: () => {
          toast.success("Top 8 saved");
          setOpen(false);
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not save Top 8"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Edit Top 8
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your Top 8</DialogTitle>
          <DialogDescription>
            Pick up to 8 growers you follow. Drag to reorder — #1 shows first
            on your profile.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading people you follow…
          </div>
        ) : following.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground text-center">
            Follow some growers in the Community Garden first — your Top 8 comes from
            people you follow.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Selected ({selected.length}/8)
              </p>
              {selected.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Nobody selected yet.
                </p>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={selected}
                  onReorder={setSelected}
                  className="space-y-1.5"
                >
                  {selected.map((pid, idx) => {
                    const prof = byPid.get(pid);
                    return (
                      <Reorder.Item
                        key={pid}
                        value={pid}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card/70 px-2 py-1.5 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-[10px] font-bold text-primary w-4">
                          {idx + 1}
                        </span>
                        <CommunityAvatar
                          principalText={pid}
                          username={prof ? displayName(prof) : undefined}
                          avatarKey={
                            prof?.avatar_key.length === 1
                              ? prof.avatar_key[0]
                              : undefined
                          }
                          size="sm"
                        />
                        <span className="text-sm truncate flex-1">
                          {prof ? displayName(prof) : `…${pid.slice(-5)}`}
                        </span>
                        <button
                          type="button"
                          aria-label="Remove from Top 8"
                          className="text-muted-foreground hover:text-destructive p-1"
                          onClick={() =>
                            setSelected((s) => s.filter((x) => x !== pid))
                          }
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              )}
            </div>

            {available.length > 0 && selected.length < 8 ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Following
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {available.map((f) => {
                    const pid = f.principal_id.toText();
                    return (
                      <div
                        key={pid}
                        className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                      >
                        <CommunityAvatar
                          principalText={pid}
                          username={displayName(f)}
                          avatarKey={
                            f.avatar_key.length === 1
                              ? f.avatar_key[0]
                              : undefined
                          }
                          size="sm"
                        />
                        <span className="text-sm truncate flex-1">
                          {displayName(f)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => setSelected((s) => [...s, pid])}
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={setTop8.isPending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={setTop8.isPending}>
            {setTop8.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                Saving…
              </>
            ) : (
              "Save Top 8"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
