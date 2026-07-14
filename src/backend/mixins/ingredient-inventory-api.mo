// mixins/ingredient-inventory-api.mo — Soft-bridge pantry API (Grow → Slice → Craft).

import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Text "mo:core/Text";
import AccessControl "../lib/access-control";
import IngredientInventoryLib "../lib/ingredient-inventory";
import IngredientInventoryTypes "../types/ingredient-inventory";
import RateLimit "../lib/rate-limit";
import RateLimits "../lib/rate-limits";

mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  ingredientInventory : Map.Map<Principal, IngredientInventoryTypes.IngredientInventoryBlob>,
) {
  /// Persist pantry JSON for authenticated players (max 8KB, sanitized).
  public shared ({ caller }) func saveIngredientInventory(
    json : Text,
  ) : async Result.Result<(), Text> {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(
      rateLimits.gameScore,
      caller,
      "Rate limited. Try again in a minute.",
    );
    IngredientInventoryLib.saveInventory(ingredientInventory, caller, json);
  };

  public query ({ caller }) func getMyIngredientInventory() : async ?Text {
    if (Principal.isAnonymous(caller)) return null;
    IngredientInventoryLib.getInventory(ingredientInventory, caller);
  };
};
