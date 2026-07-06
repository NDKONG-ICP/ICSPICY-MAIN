/**
 * Header notification bell — polls unread count every 60s, dropdown inbox,
 * auto-mark-read on open, optional browser Notification API for new items.
 */
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationPublic } from "@/declarations/backend.did";
import {
  useMarkNotificationsRead,
  useMyNotifications,
  useUnreadNotificationCount,
} from "@/hooks/useNotifications";
import { timeAgoNanos } from "@/lib/community-utils";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CommunityAvatar } from "./community/CommunityAvatar";

function kindIcon(kind: NotificationPublic["kind"]): string {
  const key = Object.keys(kind)[0] ?? "";
  switch (key) {
    case "like":
      return "❤️";
    case "comment":
      return "💬";
    case "tip":
      return "💰";
    case "follow":
      return "👤";
    case "orderPlaced":
      return "📦";
    case "newUser":
      return "🌱";
    case "airdrop":
      return "📣";
    default:
      return "🔔";
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unread = 0 } = useUnreadNotificationCount();
  const { data: items = [], isPending } = useMyNotifications(open, 40n);
  const markRead = useMarkNotificationsRead();
  const prevUnread = useRef(unread);
  const askedPermission = useRef(false);

  // Browser Notification API — permission-gated, only while tab is open.
  useEffect(() => {
    if (unread <= prevUnread.current) {
      prevUnread.current = unread;
      return;
    }
    const delta = unread - prevUnread.current;
    prevUnread.current = unread;

    if (typeof Notification === "undefined") return;

    const show = (title: string, body: string) => {
      try {
        new Notification(title, { body, icon: "/icon-192.png" });
      } catch {
        // permission revoked or blocked — ignore
      }
    };

    if (Notification.permission === "granted") {
      show(
        "IC SPICY",
        delta === 1 ? "You have a new notification" : `${delta} new notifications`,
      );
      return;
    }

    if (
      Notification.permission === "default" &&
      !askedPermission.current &&
      document.visibilityState === "visible"
    ) {
      askedPermission.current = true;
      void Notification.requestPermission().then((p) => {
        if (p === "granted") {
          show("IC SPICY", "Notifications enabled");
        }
      });
    }
  }, [unread]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
  };

  // Mark all visible notifications read once the inbox loads.
  useEffect(() => {
    if (!open || items.length === 0 || markRead.isPending) return;
    const maxId = items.reduce((m, n) => (n.id > m ? n.id : m), 0n);
    if (maxId > 0n) markRead.mutate(maxId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items]);

  const handleItemClick = (n: NotificationPublic) => {
    setOpen(false);
    const kind = Object.keys(n.kind)[0] ?? "";
    const ref = n.ref_id.length === 1 ? n.ref_id[0] : undefined;

    switch (kind) {
      case "like":
      case "comment":
      case "tip":
        if (ref) {
          void navigate({
            to: "/community/post/$postId",
            params: { postId: ref },
          });
        }
        break;
      case "follow":
        if (n.sender.length === 1) {
          void navigate({
            to: "/u/$user",
            params: { user: n.sender[0]!.toText() },
          });
        }
        break;
      case "orderPlaced":
        void navigate({ to: "/admin" });
        break;
      case "newUser":
        if (ref) {
          void navigate({ to: "/u/$user", params: { user: ref } });
        }
        break;
      default:
        break;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
          data-ocid="header-notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full bg-fire text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-2rem,22rem)] p-0"
        data-ocid="notification-inbox"
      >
        <div className="px-3 py-2 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {unread} unread
            </p>
          ) : null}
        </div>
        <div className="max-h-[min(60vh,24rem)] overflow-y-auto">
          {isPending ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              No notifications yet — likes, comments, tips, and follows show up
              here.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((n) => {
                const senderText =
                  n.sender.length === 1 ? n.sender[0]!.toText() : undefined;
                return (
                  <li key={n.id.toString()}>
                    <button
                      type="button"
                      className={[
                        "w-full flex gap-2.5 items-start px-3 py-2.5 text-left hover:bg-muted/40 transition-colors",
                        n.read ? "opacity-75" : "bg-primary/5",
                      ].join(" ")}
                      onClick={() => handleItemClick(n)}
                      data-ocid={`notification-${n.id.toString()}`}
                    >
                      {senderText ? (
                        <CommunityAvatar
                          principalText={senderText}
                          size="sm"
                          className="w-8 h-8 shrink-0"
                        />
                      ) : (
                        <span className="w-8 h-8 shrink-0 flex items-center justify-center text-lg">
                          {kindIcon(n.kind)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground leading-snug">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {timeAgoNanos(n.created_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {markRead.isPending ? (
          <div className="px-3 py-1.5 border-t border-border flex justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
