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
import Text "mo:core/Text";
import Iter "mo:core/Iter";

mixin (
  accessControlState : AccessControl.AccessControlState,
  recipes : RecipesLib.RecipeMap,
  recipeFavorites : RecipesLib.FavoriteMap,
  recipeVideoUrls : Map.Map<Common.RecipeId, Text>,
  recipeIntros : Map.Map<Common.RecipeId, Text>,
  recipeFaqs : Map.Map<Common.RecipeId, [(Text, Text)]>,
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

  // ── Recipe video URLs (side map — stored Recipe record stays untouched
  //    for stable-memory upgrade safety) ─────────────────────────────────────

  func isYouTubeUrl(url : Text) : Bool {
    Text.contains(url, #text "youtube.com/") or Text.contains(url, #text "youtu.be/");
  };

  /// Admin: set (or clear with null) the YouTube tutorial URL for a recipe.
  public shared ({ caller }) func setRecipeVideoUrl(
    id : Common.RecipeId,
    videoUrl : ?Text,
  ) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (recipes.get(id)) {
      case null return false;
      case (?_) {};
    };
    switch (videoUrl) {
      case null { ignore recipeVideoUrls.delete(id) };
      case (?url) {
        if (url.size() == 0 or url.size() > 300 or not isYouTubeUrl(url)) {
          Runtime.trap("Invalid video URL: must be a YouTube link under 300 chars");
        };
        recipeVideoUrls.add(id, url);
      };
    };
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "recipe_video_set";
      detail = "id=" # Nat.toText(id);
    });
    true;
  };

  /// Public: YouTube tutorial URL for a recipe, if one was set.
  public query func getRecipeVideoUrl(id : Common.RecipeId) : async ?Text {
    recipeVideoUrls.get(id);
  };

  /// Public: all recipe→video mappings (for list badges / admin CMS).
  public query func listRecipeVideoUrls() : async [(Common.RecipeId, Text)] {
    recipeVideoUrls.entries().toArray();
  };

  // ── Recipe SEO content (intro paragraph + FAQ) — same additive side-map
  //    pattern as recipeVideoUrls; the stored Recipe record stays untouched ──

  /// Admin: set (or clear with "") the unique intro paragraph for a recipe.
  public shared ({ caller }) func setRecipeIntro(
    id : Common.RecipeId,
    intro : Text,
  ) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (recipes.get(id)) {
      case null return false;
      case (?_) {};
    };
    if (intro.size() == 0) {
      ignore recipeIntros.delete(id);
    } else {
      if (intro.size() > 2000) {
        Runtime.trap("Intro too long (max 2000 chars)");
      };
      recipeIntros.add(id, intro);
    };
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "recipe_intro_set";
      detail = "id=" # Nat.toText(id);
    });
    true;
  };

  /// Admin: set (or clear with []) the Common Questions for a recipe.
  public shared ({ caller }) func setRecipeFaqs(
    id : Common.RecipeId,
    faqs : [(Text, Text)],
  ) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (recipes.get(id)) {
      case null return false;
      case (?_) {};
    };
    if (faqs.size() == 0) {
      ignore recipeFaqs.delete(id);
    } else {
      if (faqs.size() > 6) {
        Runtime.trap("Too many FAQs (max 6)");
      };
      for ((q, a) in faqs.vals()) {
        if (q.size() == 0 or a.size() == 0 or q.size() > 300 or a.size() > 2000) {
          Runtime.trap("FAQ entries must be non-empty (Q ≤300, A ≤2000 chars)");
        };
      };
      recipeFaqs.add(id, faqs);
    };
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "recipe_faqs_set";
      detail = "id=" # Nat.toText(id);
    });
    true;
  };

  /// Public: intro + FAQs for one recipe (recipe detail page).
  public query func getRecipeSeoContent(id : Common.RecipeId) : async {
    intro : ?Text;
    faqs : [(Text, Text)];
  } {
    {
      intro = recipeIntros.get(id);
      faqs = switch (recipeFaqs.get(id)) {
        case (?f) f;
        case null [];
      };
    };
  };

  /// Public: all SEO content (prerender script + admin CMS).
  public query func listRecipeSeoContent() : async [(Common.RecipeId, Text, [(Text, Text)])] {
    let ids = Set.empty<Nat>();
    for ((id, _) in recipeIntros.entries()) { ids.add(id) };
    for ((id, _) in recipeFaqs.entries()) { ids.add(id) };
    ids.values().map<Nat, (Common.RecipeId, Text, [(Text, Text)])>(func id {
      (
        id,
        switch (recipeIntros.get(id)) { case (?t) t; case null "" },
        switch (recipeFaqs.get(id)) { case (?f) f; case null [] },
      );
    }).toArray();
  };
};
