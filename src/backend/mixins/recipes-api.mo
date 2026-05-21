import Map "mo:core/Map";
import Set "mo:core/Set";
import AccessControl "../lib/access-control";
import AuditLog "../lib/audit-log";
import Runtime "mo:core/Runtime";
import Common "../types/common";
import RecipeTypes "../types/recipes";
import RecipesLib "../lib/recipes";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Nat "mo:core/Nat";

mixin (
  accessControlState : AccessControl.AccessControlState,
  recipes : RecipesLib.RecipeMap,
  recipeFavorites : RecipesLib.FavoriteMap,
  nextRecipeId : { var value : Nat },
  auditLog : { var value : AuditLog.AuditLog },
) {
  public query ({ caller }) func getRecipes(
    category : ?RecipeTypes.RecipeCategory,
    search : ?Text,
    offset : Nat,
    limit : Nat,
  ) : async [RecipeTypes.RecipePublic] {
    RecipesLib.getRecipes(recipes, recipeFavorites, caller, category, search, offset, limit);
  };

  public query ({ caller }) func getRecipe(id : Common.RecipeId) : async ?RecipeTypes.RecipePublic {
    RecipesLib.getRecipe(recipes, recipeFavorites, caller, id, false);
  };

  public query ({ caller }) func getRecipeBySlug(slug : Text) : async ?RecipeTypes.RecipePublic {
    RecipesLib.getRecipeBySlug(recipes, recipeFavorites, caller, slug, false);
  };

  public query func getRecipeCategories() : async [(RecipeTypes.RecipeCategory, Nat)] {
    RecipesLib.getRecipeCategories(recipes);
  };

  public query ({ caller }) func getFeaturedRecipes(limit : Nat) : async [RecipeTypes.RecipePublic] {
    RecipesLib.getFeaturedRecipes(recipes, recipeFavorites, caller, limit);
  };

  public query ({ caller }) func searchRecipes(
    searchText : Text,
    limit : Nat,
  ) : async [RecipeTypes.RecipePublic] {
    RecipesLib.searchRecipes(recipes, recipeFavorites, caller, searchText, limit);
  };

  public query ({ caller }) func listRecipes() : async [RecipeTypes.RecipePublic] {
    RecipesLib.listRecipes(recipes, recipeFavorites, caller);
  };

  public query ({ caller }) func listRecipesAdmin() : async [RecipeTypes.RecipePublic] {
    AccessControl.requireAdmin(accessControlState, caller);
    RecipesLib.listRecipesAdmin(recipes, recipeFavorites, caller);
  };

  public shared ({ caller }) func toggleFavorite(recipe_id : Common.RecipeId) : async Bool {
    AccessControl.requireAuthenticated(caller);
    RecipesLib.toggleFavorite(recipeFavorites, caller, recipe_id);
  };

  public query ({ caller }) func getMyFavorites(
    offset : Nat,
    limit : Nat,
  ) : async [RecipeTypes.RecipePublic] {
    AccessControl.requireAuthenticated(caller);
    RecipesLib.getMyFavorites(recipes, recipeFavorites, caller, offset, limit);
  };

  public shared ({ caller }) func createRecipe(
    input : RecipeTypes.CreateRecipeInput,
  ) : async { recipe_id : Common.RecipeId } {
    AccessControl.requireAdmin(accessControlState, caller);
    let id = RecipesLib.createRecipe(recipes, nextRecipeId, caller, input);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "recipe_created";
      detail = "id=" # Nat.toText(id) # " slug=" # input.slug;
    });
    { recipe_id = id };
  };

  public shared ({ caller }) func updateRecipe(
    input : RecipeTypes.UpdateRecipeInput,
  ) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    let ok = RecipesLib.updateRecipe(recipes, input);
    if (ok) {
      auditLog.value := AuditLog.append(auditLog.value, {
        ts = Time.now();
        admin = caller;
        action = "recipe_updated";
        detail = "id=" # Nat.toText(input.id);
      });
    };
    ok;
  };

  public shared ({ caller }) func deleteRecipe(id : Common.RecipeId) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    let ok = RecipesLib.deleteRecipe(recipes, id);
    if (ok) {
      auditLog.value := AuditLog.append(auditLog.value, {
        ts = Time.now();
        admin = caller;
        action = "recipe_deleted";
        detail = "id=" # Nat.toText(id);
      });
    };
    ok;
  };

  public shared ({ caller }) func publishRecipe(id : Common.RecipeId) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    RecipesLib.publishRecipe(recipes, id);
  };

  public shared ({ caller }) func reorderRecipes(ids : [Common.RecipeId]) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    RecipesLib.reorderRecipes(recipes, ids);
  };

  public shared ({ caller }) func toggleRecipeFeatured(id : Common.RecipeId) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    RecipesLib.publishRecipe(recipes, id);
  };

  public shared ({ caller }) func seedDefaultRecipes() : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    RecipesLib.seedRecipes(recipes, nextRecipeId, caller);
  };
};
