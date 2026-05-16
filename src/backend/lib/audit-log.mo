// lib/audit-log.mo
//
// Append-only audit log for admin actions (Phase 4+).
// Entries are prepended so iteration order is newest-first.
// Callers are responsible for never logging key material.

import Array     "mo:core/Array";
import List      "mo:core/pure/List";
import Principal "mo:core/Principal";
import Time      "mo:core/Time";

module {
  public type AuditEntry = {
    ts     : Time.Time;
    admin  : Principal;
    action : Text;
    detail : Text;
  };

  public type AuditLog = List.List<AuditEntry>;

  /// Returns an empty log.
  public func empty() : AuditLog { null };

  /// Prepends a new entry (newest first).
  public func append(log : AuditLog, entry : AuditEntry) : AuditLog {
    List.pushFront(log, entry)
  };

  /// Returns up to `limit` entries (capped at 100) starting at `offset`,
  /// newest first.
  public func toArray(log : AuditLog, offset : Nat, limit : Nat) : [AuditEntry] {
    let cap = if (limit > 100) 100 else limit;
    let all = List.toArray(log);
    let len = Array.size(all);
    if (offset >= len) return [];
    let available = len - offset;
    let count = if (available < cap) available else cap;
    Array.tabulate<AuditEntry>(count, func(i) { all[offset + i] })
  };
}
