// mixins/pepper-patch-api.mo — ICSPICY Pepper Patch garden persistence API.

import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Text "mo:core/Text";
import AccessControl "../lib/access-control";
import GardenStateLib "../lib/garden-state";
import GardenStateTypes "../types/garden-state";
import RateLimit "../lib/rate-limit";
import RateLimits "../lib/rate-limits";

mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  gardenStates : Map.Map<Principal, GardenStateTypes.GardenStateBlob>,
) {
  /// Persist full garden JSON for authenticated players (max 32KB, sanitized).
  public shared ({ caller }) func saveGardenState(
    json : Text,
  ) : async Result.Result<(), Text> {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(
      rateLimits.gameScore,
      caller,
      "Rate limited. Try again in a minute.",
    );
    GardenStateLib.saveState(gardenStates, caller, json);
  };

  public query ({ caller }) func getMyGardenState() : async ?Text {
    if (Principal.isAnonymous(caller)) return null;
    GardenStateLib.getState(gardenStates, caller);
  };
};
