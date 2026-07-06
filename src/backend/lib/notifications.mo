/// On-chain notification inbox — append-only per-recipient lists capped at
/// 200 entries (oldest dropped), with a per-user lastReadId watermark
/// instead of mutable read flags.
import Array "mo:core/Array";
import Int "mo:core/Int";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

import Types "../types/notification";

module {
  public type Inbox = Map.Map<Principal, List.List<Types.Notification>>;
  public type LastRead = Map.Map<Principal, Nat>;

  let MAX_PER_USER : Nat = 200;

  /// Append a notification. Skips self-notification (sender == recipient)
  /// and anonymous recipients. Returns true when stored.
  public func emit(
    inbox : Inbox,
    nextId : { var value : Nat },
    recipient : Principal,
    kind : Types.NotificationKind,
    sender : ?Principal,
    refId : ?Text,
    message : Text,
  ) : Bool {
    if (recipient.isAnonymous()) return false;
    switch (sender) {
      case (?s) if (s == recipient) return false;
      case null {};
    };
    let notification : Types.Notification = {
      id = nextId.value;
      recipient = recipient;
      kind = kind;
      sender = sender;
      ref_id = refId;
      message = message;
      created_at = Time.now();
    };
    nextId.value += 1;
    let list = switch (inbox.get(recipient)) {
      case (?l) l;
      case null {
        let l = List.empty<Types.Notification>();
        inbox.add(recipient, l);
        l;
      };
    };
    list.add(notification);
    // Cap: drop oldest beyond MAX_PER_USER (rebuild — rare path).
    if (list.size() > MAX_PER_USER) {
      let all = List.toArray(list);
      let excess : Nat = all.size() - MAX_PER_USER;
      let trimmed = List.empty<Types.Notification>();
      var i = excess;
      while (i < all.size()) {
        trimmed.add(all[i]);
        i += 1;
      };
      inbox.add(recipient, trimmed);
    };
    true;
  };

  /// Fan a notification out to every admin except the acting principal.
  public func emitToAdmins(
    inbox : Inbox,
    nextId : { var value : Nat },
    admins : [Principal],
    kind : Types.NotificationKind,
    sender : ?Principal,
    refId : ?Text,
    message : Text,
  ) {
    for (admin in admins.vals()) {
      ignore emit(inbox, nextId, admin, kind, sender, refId, message);
    };
  };

  func lastReadOf(lastRead : LastRead, user : Principal) : Nat {
    switch (lastRead.get(user)) {
      case (?n) n;
      case null 0;
    };
  };

  /// Newest-first page of a user's notifications with computed read flags.
  public func getFor(
    inbox : Inbox,
    lastRead : LastRead,
    user : Principal,
    offset : Nat,
    limit : Nat,
  ) : [Types.NotificationPublic] {
    let watermark = lastReadOf(lastRead, user);
    let all = switch (inbox.get(user)) {
      case (?l) List.toArray(l);
      case null [];
    };
    let size = all.size();
    // Stored oldest-first; serve newest-first.
    if (offset >= size) return [];
    let count = Nat.min(limit, size - offset);
    Array.tabulate<Types.NotificationPublic>(count, func(i : Nat) : Types.NotificationPublic {
      let n = all[size - 1 - offset - i];
      {
        id = n.id;
        kind = n.kind;
        sender = n.sender;
        ref_id = n.ref_id;
        message = n.message;
        created_at = n.created_at;
        read = n.id <= watermark;
      };
    });
  };

  public func unreadCount(
    inbox : Inbox,
    lastRead : LastRead,
    user : Principal,
  ) : Nat {
    let watermark = lastReadOf(lastRead, user);
    switch (inbox.get(user)) {
      case (?l) {
        List.toArray(l)
          .filter(func(n : Types.Notification) : Bool { n.id > watermark })
          .size();
      };
      case null 0;
    };
  };

  /// Advance the read watermark (never moves backwards).
  public func markRead(lastRead : LastRead, user : Principal, upToId : Nat) {
    let current = lastReadOf(lastRead, user);
    if (upToId > current) {
      lastRead.add(user, upToId);
    };
  };
};
