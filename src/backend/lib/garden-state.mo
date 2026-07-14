// lib/garden-state.mo — Sanitized JSON garden state for Pepper Patch.

import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Sanitize "../lib/sanitize";
import Types "../types/garden-state";

module {
  public let MAX_GARDEN_JSON_CHARS : Nat = 32_768;

  public func saveState(
    gardenStates : Map.Map<Principal, Types.GardenStateBlob>,
    caller : Principal,
    jsonRaw : Text,
  ) : Result.Result<(), Text> {
    let json = Sanitize.sanitizeText(jsonRaw, MAX_GARDEN_JSON_CHARS);
    if (json.size() < 10) {
      return #err("Garden state too small");
    };
    if (not Text.startsWith(json, #text "{")) {
      return #err("Garden state must be JSON object");
    };
    gardenStates.add(caller, json);
    #ok(());
  };

  public func getState(
    gardenStates : Map.Map<Principal, Types.GardenStateBlob>,
    caller : Principal,
  ) : ?Types.GardenStateBlob {
    gardenStates.get(caller);
  };
};
