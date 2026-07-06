/// Notification inbox API + admin user directory.
/// Inbox emission happens inside the community/marketplace mixins via
/// NotificationsLib — this mixin only exposes read/mark APIs, the admin
/// message-send tool, and the admin user directory query.
import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import AccessControl "../lib/access-control";
import AdminUserTypes "../types/admin-users";
import CommunityTypes "../types/community";
import Common "../types/common";
import NotificationTypes "../types/notification";
import NotificationsLib "../lib/notifications";
import RateLimit "../lib/rate-limit";
import RateLimits "../lib/rate-limits";
import Sanitize "../lib/sanitize";

mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  notifications : NotificationsLib.Inbox,
  notificationLastRead : NotificationsLib.LastRead,
  nextNotificationId : { var value : Nat },
  profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
  posts : Map.Map<Common.PostId, CommunityTypes.Post>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  ravenBalanceCache : Map.Map<Principal, Nat>,
  linkedWallets : Map.Map<Principal, [Principal]>,
) {

  // ── Inbox ───────────────────────────────────────────────────────────────────

  public query ({ caller }) func getMyNotifications(
    offset : Nat,
    limit : Nat,
  ) : async [NotificationTypes.NotificationPublic] {
    if (caller.isAnonymous()) return [];
    NotificationsLib.getFor(
      notifications, notificationLastRead, caller, offset, Nat.min(limit, 100),
    );
  };

  public query ({ caller }) func getUnreadCount() : async Nat {
    if (caller.isAnonymous()) return 0;
    NotificationsLib.unreadCount(notifications, notificationLastRead, caller);
  };

  public shared ({ caller }) func markNotificationsRead(upToId : Nat) : async () {
    AccessControl.requireAuthenticated(caller);
    NotificationsLib.markRead(notificationLastRead, caller, upToId);
  };

  // ── Admin: direct message (the "promote" tool) ──────────────────────────────

  /// Admin sends a message that lands in a user's inbox as #airdrop kind.
  /// Rate limited to 20/hour per admin.
  public shared ({ caller }) func adminSendNotification(
    recipient : Principal,
    message : Text,
  ) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    RateLimit.trapIfLimited(
      rateLimits.adminNotify, caller,
      "Rate limited: max 20 admin notifications per hour.",
    );
    let clean = Sanitize.sanitizeText(message, 500);
    if (clean.size() == 0) {
      Runtime.trap("Message is required");
    };
    ignore NotificationsLib.emit(
      notifications, nextNotificationId,
      recipient, #airdrop, ?caller, null, clean,
    );
    true;
  };

  // ── Admin: user directory ───────────────────────────────────────────────────

  // Thresholds mirror useRavenPerks.ts (100K / 500K RAVEN at 8 decimals).
  func ravenTier(user : Principal) : Text {
    let MEMBER : Nat = 100_000 * 100_000_000;
    let PRO : Nat = 500_000 * 100_000_000;
    var best : Nat = switch (ravenBalanceCache.get(user)) {
      case (?b) b;
      case null 0;
    };
    switch (linkedWallets.get(user)) {
      case (?wallets) {
        for (wallet in wallets.vals()) {
          switch (ravenBalanceCache.get(wallet)) {
            case (?b) if (b > best) { best := b };
            case null {};
          };
        };
      };
      case null {};
    };
    if (best >= PRO) "pro" else if (best >= MEMBER) "member" else "free";
  };

  public query ({ caller }) func adminListUsers(
    offset : Nat,
    limit : Nat,
    search : Text,
  ) : async AdminUserTypes.AdminUserPage {
    AccessControl.requireAdmin(accessControlState, caller);
    let needle = search.trim(#char ' ').toLower();

    let matching = profiles.values()
      .filter(func(p : CommunityTypes.UserProfile) : Bool {
        if (needle == "") return true;
        Text.contains(p.username.toLower(), #text needle)
          or Text.contains(p.principal_id.toText(), #text needle);
      })
      .toArray();

    let sorted = matching.sort(func(a : CommunityTypes.UserProfile, b : CommunityTypes.UserProfile) : { #less; #equal; #greater } {
      Int.compare(b.created_at, a.created_at)
    });

    let total = sorted.size();
    if (offset >= total) return { rows = []; total };
    let count = Nat.min(limit, total - offset);

    let rows = Array.tabulate<AdminUserTypes.AdminUserRow>(count, func(i : Nat) : AdminUserTypes.AdminUserRow {
      let p = sorted[offset + i];
      let user = p.principal_id;

      let followerCount = profiles.values()
        .filter(func(q : CommunityTypes.UserProfile) : Bool { q.follows.contains(user) })
        .size();

      let nftCount = switch (icrc7Balances.get(user)) {
        case (?tokens) tokens.size();
        case null 0;
      };

      var lastActive : ?Int = null;
      for (post in posts.values()) {
        if (post.author == user and not post.is_deleted) {
          switch (lastActive) {
            case (?t) if (post.created_at > t) { lastActive := ?post.created_at };
            case null { lastActive := ?post.created_at };
          };
        };
      };

      {
        principal_id = user;
        username = p.username;
        avatar_key = p.avatar_key;
        location = p.location;
        created_at = p.created_at;
        follower_count = followerCount;
        nft_count = nftCount;
        raven_tier = ravenTier(user);
        last_active = lastActive;
      };
    });

    { rows; total };
  };
};
