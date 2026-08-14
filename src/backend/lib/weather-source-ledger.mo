// lib/weather-source-ledger.mo — append-only weather fetch audit trail (cap 200).

import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Types "../types/weather-hub";

module {
  public let MAX_ENTRIES : Nat = 200;
  public let PARSER_VERSION : Text = "weather-hub-v2";

  public type Store = {
    var nextId : Nat;
    var entries : [Types.WeatherSourceLedgerEntry];
  };

  public func emptyStore() : Store {
    { var nextId = 1; var entries = [] };
  };

  public func append(
    store : Store,
    entry : {
      fetchedAt : Int;
      kind : Types.WeatherSourceKind;
      sourceUrl : Text;
      gridKey : ?Text;
      bodyDigest : Text;
      httpStatus : Nat;
      status : Types.WeatherFreshnessStatus;
    },
  ) {
    let row : Types.WeatherSourceLedgerEntry = {
      id = store.nextId;
      fetchedAt = entry.fetchedAt;
      kind = entry.kind;
      sourceUrl = entry.sourceUrl;
      parserVersion = PARSER_VERSION;
      gridKey = entry.gridKey;
      bodyDigest = entry.bodyDigest;
      httpStatus = entry.httpStatus;
      status = entry.status;
    };
    store.nextId += 1;
    let combined = Array.concat(store.entries, [row]);
    if (combined.size() > MAX_ENTRIES) {
      store.entries := Array.tabulate<Types.WeatherSourceLedgerEntry>(
        MAX_ENTRIES,
        func(i) { combined[combined.size() - MAX_ENTRIES + i] },
      );
    } else {
      store.entries := combined;
    };
  };

  public func list(store : Store, limit : Nat) : [Types.WeatherSourceLedgerEntry] {
    if (store.entries.size() == 0 or limit == 0) return [];
    let n = if (limit > store.entries.size()) store.entries.size() else limit;
    var out : [Types.WeatherSourceLedgerEntry] = [];
    var i = store.entries.size() - n;
    while (i < store.entries.size()) {
      out := Array.concat(out, [store.entries[i]]);
      i += 1;
    };
    out;
  };
};
