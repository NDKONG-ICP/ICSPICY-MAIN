// lib/slicer-telemetry.mo — aggregate slicer submit rejection counts (no PII).

import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

module {
  public type RejectCounts = Map.Map<Text, Nat>;

  public func empty() : RejectCounts {
    Map.empty<Text, Nat>();
  };

  /// Bucket parse/validation errors to stable keys for dashboards.
  public func normalizeReason(raw : Text) : Text {
    if (Text.startsWith(raw, #text "Invalid sliceLogJson:")) {
      "Invalid sliceLogJson";
    } else if (Text.startsWith(raw, #text "Mint failed:")) {
      "Mint failed";
    } else {
      raw;
    };
  };

  public func recordRejection(counts : RejectCounts, reason : Text) {
    let key = normalizeReason(reason);
    switch (counts.get(key)) {
      case (?n) { counts.add(key, n + 1) };
      case null { counts.add(key, 1) };
    };
  };

  public func toArray(counts : RejectCounts) : [(Text, Nat)] {
    var out : [(Text, Nat)] = [];
    for ((k, n) in counts.entries()) {
      out := Array.concat(out, [(k, n)]);
    };
    out;
  };
};
