import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";
import Runtime "mo:core/Runtime";
import Common "../types/common";
import RecipeTypes "../types/recipes";
import RecipesLib "../lib/recipes";

mixin (
  accessControlState : AccessControl.AccessControlState,
  recipes : RecipesLib.RecipeMap,
  nextRecipeId : { var value : Nat },
) {

  // ── Public queries (visible to all) ───────────────────────────────────────

  public query func listRecipes() : async [RecipeTypes.Recipe] {
    RecipesLib.listRecipes(recipes);
  };

  public query func getRecipe(id : Common.RecipeId) : async ?RecipeTypes.Recipe {
    RecipesLib.getRecipe(recipes, id);
  };

  // ── Admin updates ─────────────────────────────────────────────────────────

  public shared ({ caller }) func createRecipe(
    input : RecipeTypes.CreateRecipeInput
  ) : async RecipeTypes.Recipe {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    RecipesLib.createRecipe(recipes, nextRecipeId, input);
  };

  public shared ({ caller }) func updateRecipe(
    input : RecipeTypes.UpdateRecipeInput
  ) : async ?RecipeTypes.Recipe {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    RecipesLib.updateRecipe(recipes, input);
  };

  public shared ({ caller }) func deleteRecipe(
    id : Common.RecipeId
  ) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    RecipesLib.deleteRecipe(recipes, id);
  };

  public shared ({ caller }) func toggleRecipeFeatured(
    id : Common.RecipeId
  ) : async ?RecipeTypes.Recipe {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    RecipesLib.toggleFeatured(recipes, id);
  };

  public shared ({ caller }) func seedDefaultRecipes() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    RecipesLib.seedRecipes(recipes, nextRecipeId);
  };
};
