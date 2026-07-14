// mixins/crafter-api.mo — ICSPICY Small Batch Crafter saved recipes API.

import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AccessControl "../lib/access-control";
import CrafterRecipesLib "../lib/crafter-recipes";
import CrafterRecipesTypes "../types/crafter-recipes";
import RateLimit "../lib/rate-limit";
import RateLimits "../lib/rate-limits";

mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  savedCrafterRecipes : Map.Map<Principal, [CrafterRecipesTypes.SavedCrafterRecipe]>,
) {
  /// Save a favorite crafter batch. Max 10 per player; oldest evicted.
  public shared ({ caller }) func saveCrafterRecipe(
    name : Text,
    ingredients : [(Text, Nat)],
    shu : Nat,
    harmony : Nat,
  ) : async Result.Result<(), Text> {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(
      rateLimits.gameScore,
      caller,
      "Rate limited. Try again in a minute.",
    );
    CrafterRecipesLib.saveRecipe(
      savedCrafterRecipes,
      caller,
      name,
      ingredients,
      shu,
      harmony,
      Time.now(),
    );
  };

  public query ({ caller }) func getMyCrafterRecipes() : async [CrafterRecipesTypes.SavedCrafterRecipe] {
    if (Principal.isAnonymous(caller)) return [];
    CrafterRecipesLib.getMyRecipes(savedCrafterRecipes, caller);
  };
};
