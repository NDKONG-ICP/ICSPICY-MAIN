import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Char "mo:core/Char";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Result "mo:core/Result";
import Common "../types/common";
import RecipeTypes "../types/recipes";

module {
  public type RecipeMap = Map.Map<Common.RecipeId, RecipeTypes.Recipe>;
  public type FavoriteMap = Map.Map<Principal, Set.Set<Common.RecipeId>>;

  func optTextContains(hay : Text, needle : Text) : Bool {
    if (needle.size() == 0) return true;
    Text.contains(hay, #text needle);
  };

  func ingredientText(ing : RecipeTypes.Ingredient) : Text {
    ing.name # " " # ing.amount;
  };

  func recipeSearchBlob(r : RecipeTypes.Recipe) : Text {
    var blob = r.title # " " # r.description # " " # r.slug;
    for (t in r.tags.vals()) { blob := blob # " " # t };
    for (b in r.best_for.vals()) { blob := blob # " " # b };
    for (i in r.ingredients.vals()) { blob := blob # " " # ingredientText(i) };
    blob;
  };

  func favoriteCount(
    favorites : FavoriteMap,
    recipeId : Common.RecipeId,
  ) : Nat {
    favorites.values()
      .filter(func(s : Set.Set<Common.RecipeId>) : Bool { s.contains(recipeId) })
      .size();
  };

  public func toPublic(
    r : RecipeTypes.Recipe,
    caller : Principal,
    favorites : FavoriteMap,
  ) : RecipeTypes.RecipePublic {
    let callerFav = switch (favorites.get(caller)) {
      case (?s) { s.contains(r.id) };
      case null { false };
    };
    {
      id = r.id;
      title = r.title;
      slug = r.slug;
      category = r.category;
      difficulty = r.difficulty;
      prep_time = r.prep_time;
      fermentation_time = r.fermentation_time;
      total_time = r.total_time;
      description = r.description;
      ingredients = r.ingredients;
      steps = r.steps;
      tips = r.tips;
      safety_notes = r.safety_notes;
      application_rate = r.application_rate;
      application_frequency = r.application_frequency;
      best_for = r.best_for;
      image_key = r.image_key;
      tags = r.tags;
      related_recipe_ids = r.related_recipe_ids;
      author = r.author;
      created_at = r.created_at;
      updated_at = r.updated_at;
      is_published = r.is_published;
      display_order = r.display_order;
      caller_favorited = callerFav;
      favorite_count = favoriteCount(favorites, r.id);
      bonsaiVideoId = null;
    };
  };

  func visible(r : RecipeTypes.Recipe, adminView : Bool) : Bool {
    if (r.is_deleted) return false;
    adminView or r.is_published;
  };

  func filterRecipes(
    recipes : RecipeMap,
    favorites : FavoriteMap,
    caller : Principal,
    category : ?RecipeTypes.RecipeCategory,
    search : ?Text,
    adminView : Bool,
  ) : [RecipeTypes.Recipe] {
    recipes.values()
      .filter(func(r : RecipeTypes.Recipe) : Bool {
        if (not visible(r, adminView)) return false;
        switch (category) {
          case null {};
          case (?c) { if (r.category != c) return false };
        };
        switch (search) {
          case null {};
          case (?q) {
            if (not optTextContains(recipeSearchBlob(r), q)) return false;
          };
        };
        true;
      })
      .toArray();
  };

  func sortRecipes(arr : [RecipeTypes.Recipe]) : [RecipeTypes.Recipe] {
    var copy = arr;
    ignore copy.sort(func(a : RecipeTypes.Recipe, b : RecipeTypes.Recipe) : { #less; #equal; #greater } {
      switch (Nat.compare(a.display_order, b.display_order)) {
        case (#equal) { Int.compare(b.created_at, a.created_at) };
        case (ord) { ord };
      };
    });
    copy;
  };

  public func paginate<T>(arr : [T], offset : Nat, limit : Nat) : [T] {
    let size = arr.size();
    if (offset >= size) return [];
    let end = Nat.min(size, offset + limit);
    Array.tabulate<T>(end - offset, func(i : Nat) : T { arr[offset + i] });
  };

  public func getRecipes(
    recipes : RecipeMap,
    favorites : FavoriteMap,
    caller : Principal,
    category : ?RecipeTypes.RecipeCategory,
    search : ?Text,
    offset : Nat,
    limit : Nat,
  ) : [RecipeTypes.RecipePublic] {
    let arr = sortRecipes(filterRecipes(recipes, favorites, caller, category, search, false));
    paginate(arr, offset, limit)
      .map(func(r : RecipeTypes.Recipe) : RecipeTypes.RecipePublic {
        toPublic(r, caller, favorites);
      });
  };

  public func searchRecipes(
    recipes : RecipeMap,
    favorites : FavoriteMap,
    caller : Principal,
    searchText : Text,
    limit : Nat,
  ) : [RecipeTypes.RecipePublic] {
    getRecipes(recipes, favorites, caller, null, ?searchText, 0, limit);
  };

  public func getRecipe(
    recipes : RecipeMap,
    favorites : FavoriteMap,
    caller : Principal,
    id : Common.RecipeId,
    adminView : Bool,
  ) : ?RecipeTypes.RecipePublic {
    switch (recipes.get(id)) {
      case (?r) {
        if (not visible(r, adminView)) null else ?toPublic(r, caller, favorites);
      };
      case null { null };
    };
  };

  public func getRecipeBySlug(
    recipes : RecipeMap,
    favorites : FavoriteMap,
    caller : Principal,
    slug : Text,
    adminView : Bool,
  ) : ?RecipeTypes.RecipePublic {
    for (r in recipes.values()) {
      if (r.slug == slug) {
        if (visible(r, adminView)) {
          return ?toPublic(r, caller, favorites);
        };
      };
    };
    null;
  };

  public func getFeaturedRecipes(
    recipes : RecipeMap,
    favorites : FavoriteMap,
    caller : Principal,
    limit : Nat,
  ) : [RecipeTypes.RecipePublic] {
    var arr = recipes.values()
      .filter(func(r : RecipeTypes.Recipe) : Bool {
        visible(r, false) and r.display_order <= 10
      })
      .toArray();
    arr := sortRecipes(arr);
    paginate(arr, 0, limit)
      .map(func(r : RecipeTypes.Recipe) : RecipeTypes.RecipePublic {
        toPublic(r, caller, favorites);
      });
  };

  public func categoryLabel(c : RecipeTypes.RecipeCategory) : Text {
    switch (c) {
      case (#KNF) "KNF";
      case (#JADAM) "JADAM";
      case (#Composting) "Composting";
      case (#PestControl) "PestControl";
      case (#SoilAmendment) "SoilAmendment";
      case (#FermentedInputs) "FermentedInputs";
      case (#MicrobialCultures) "MicrobialCultures";
      case (#PlantExtracts) "PlantExtracts";
      case (#Other) "Other";
    };
  };

  public func getRecipeCategories(
    recipes : RecipeMap,
  ) : [(RecipeTypes.RecipeCategory, Nat)] {
    let cats : [RecipeTypes.RecipeCategory] = [
      #KNF, #JADAM, #Composting, #PestControl, #SoilAmendment,
      #FermentedInputs, #MicrobialCultures, #PlantExtracts, #Other,
    ];
    Array.map<RecipeTypes.RecipeCategory, (RecipeTypes.RecipeCategory, Nat)>(
      cats,
      func(c : RecipeTypes.RecipeCategory) : (RecipeTypes.RecipeCategory, Nat) {
        let count = recipes.values()
          .filter(func(r : RecipeTypes.Recipe) : Bool {
            not r.is_deleted and r.is_published and r.category == c
          })
          .size();
        (c, count);
      },
    );
  };

  public func createRecipe(
    recipes : RecipeMap,
    nextId : { var value : Nat },
    author : Principal,
    input : RecipeTypes.CreateRecipeInput,
  ) : Common.RecipeId {
    let now = Time.now();
    let id = nextId.value;
    let recipe : RecipeTypes.Recipe = {
      id;
      title = input.title;
      slug = input.slug;
      category = input.category;
      difficulty = input.difficulty;
      prep_time = input.prep_time;
      fermentation_time = input.fermentation_time;
      total_time = input.total_time;
      description = input.description;
      ingredients = input.ingredients;
      steps = input.steps;
      tips = input.tips;
      safety_notes = input.safety_notes;
      application_rate = input.application_rate;
      application_frequency = input.application_frequency;
      best_for = input.best_for;
      image_key = input.image_key;
      tags = input.tags;
      related_recipe_ids = input.related_recipe_ids;
      author = author;
      created_at = now;
      updated_at = now;
      var is_published = input.is_published;
      var is_deleted = false;
      var display_order = input.display_order;
    };
    recipes.add(id, recipe);
    nextId.value += 1;
    id;
  };

  public func updateRecipe(
    recipes : RecipeMap,
    input : RecipeTypes.UpdateRecipeInput,
  ) : Bool {
    switch (recipes.get(input.id)) {
      case null { false };
      case (?existing) {
        let now = Time.now();
        let updated : RecipeTypes.Recipe = {
          id = existing.id;
          title = switch (input.title) { case (?v) v; case null existing.title };
          slug = switch (input.slug) { case (?v) v; case null existing.slug };
          category = switch (input.category) { case (?v) v; case null existing.category };
          difficulty = switch (input.difficulty) { case (?v) v; case null existing.difficulty };
          prep_time = switch (input.prep_time) { case (?v) ?v; case null existing.prep_time };
          fermentation_time = switch (input.fermentation_time) { case (?v) ?v; case null existing.fermentation_time };
          total_time = switch (input.total_time) { case (?v) ?v; case null existing.total_time };
          description = switch (input.description) { case (?v) v; case null existing.description };
          ingredients = switch (input.ingredients) { case (?v) v; case null existing.ingredients };
          steps = switch (input.steps) { case (?v) v; case null existing.steps };
          tips = switch (input.tips) { case (?v) v; case null existing.tips };
          safety_notes = switch (input.safety_notes) { case (?v) v; case null existing.safety_notes };
          application_rate = switch (input.application_rate) { case (?v) ?v; case null existing.application_rate };
          application_frequency = switch (input.application_frequency) { case (?v) ?v; case null existing.application_frequency };
          best_for = switch (input.best_for) { case (?v) v; case null existing.best_for };
          image_key = switch (input.image_key) { case (?v) ?v; case null existing.image_key };
          tags = switch (input.tags) { case (?v) v; case null existing.tags };
          related_recipe_ids = switch (input.related_recipe_ids) { case (?v) v; case null existing.related_recipe_ids };
          author = existing.author;
          created_at = existing.created_at;
          updated_at = now;
          var is_published = switch (input.is_published) { case (?v) v; case null existing.is_published };
          var is_deleted = existing.is_deleted;
          var display_order = switch (input.display_order) { case (?v) v; case null existing.display_order };
        };
        recipes.add(updated.id, updated);
        true;
      };
    };
  };

  func isValidBonsaiVideoId(id : Text) : Bool {
    if (id.size() == 0 or id.size() > 20) return false;
    for (c in id.chars()) {
      if (not (Char.isDigit(c) or (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or c == '-' or c == '_')) {
        return false;
      };
    };
    true;
  };

  public func setRecipeVideo(
    recipes : RecipeMap,
    bonsaiVideoIds : Map.Map<Common.RecipeId, Text>,
    id : Common.RecipeId,
    videoId : ?Text,
  ) : Result.Result<(), Text> {
    switch (recipes.get(id)) {
      case null { #err("Recipe not found") };
      case (?_) {
        switch (videoId) {
          case null { ignore bonsaiVideoIds.delete(id) };
          case (?vid) {
            if (not isValidBonsaiVideoId(vid)) {
              return #err("Invalid BonsaiTube video id (max 20 chars, alphanumeric)");
            };
            bonsaiVideoIds.add(id, vid);
          };
        };
        #ok(());
      };
    };
  };

  public func deleteRecipe(
    recipes : RecipeMap,
    id : Common.RecipeId,
  ) : Bool {
    switch (recipes.get(id)) {
      case (?r) {
        r.is_deleted := true;
        true;
      };
      case null { false };
    };
  };

  public func publishRecipe(
    recipes : RecipeMap,
    id : Common.RecipeId,
  ) : Bool {
    switch (recipes.get(id)) {
      case (?r) {
        r.is_published := not r.is_published;
        true;
      };
      case null { false };
    };
  };

  public func reorderRecipes(
    recipes : RecipeMap,
    ids : [Common.RecipeId],
  ) : Bool {
    var order : Nat = 1;
    for (id in ids.vals()) {
      switch (recipes.get(id)) {
        case (?r) {
          r.display_order := order;
          order += 1;
        };
        case null { return false };
      };
    };
    true;
  };

  public func toggleFavorite(
    favorites : FavoriteMap,
    caller : Principal,
    recipeId : Common.RecipeId,
  ) : Bool {
    switch (favorites.get(caller)) {
      case (?set) {
        if (set.contains(recipeId)) {
          set.remove(recipeId);
          false;
        } else {
          set.add(recipeId);
          true;
        };
      };
      case null {
        let s = Set.empty<Common.RecipeId>();
        s.add(recipeId);
        favorites.add(caller, s);
        true;
      };
    };
  };

  public func getMyFavorites(
    recipes : RecipeMap,
    favorites : FavoriteMap,
    caller : Principal,
    offset : Nat,
    limit : Nat,
  ) : [RecipeTypes.RecipePublic] {
    switch (favorites.get(caller)) {
      case null { [] };
      case (?set) {
        var arr : [RecipeTypes.Recipe] = [];
        for (id in set.values()) {
          switch (recipes.get(id)) {
            case (?r) {
              if (visible(r, false)) {
                arr := Array.concat(arr, [r]);
              };
            };
            case null {};
          };
        };
        arr := sortRecipes(arr);
        paginate(arr, offset, limit)
          .map(func(r : RecipeTypes.Recipe) : RecipeTypes.RecipePublic {
            toPublic(r, caller, favorites);
          });
      };
    };
  };

  public func listRecipesAdmin(
    recipes : RecipeMap,
    favorites : FavoriteMap,
    caller : Principal,
  ) : [RecipeTypes.RecipePublic] {
    sortRecipes(
      recipes.values()
        .filter(func(r : RecipeTypes.Recipe) : Bool { not r.is_deleted })
        .toArray(),
    ).map(func(r : RecipeTypes.Recipe) : RecipeTypes.RecipePublic {
      toPublic(r, caller, favorites);
    });
  };

  // Legacy alias for old callers
  public func listRecipes(
    recipes : RecipeMap,
    favorites : FavoriteMap,
    caller : Principal,
  ) : [RecipeTypes.RecipePublic] {
    getRecipes(recipes, favorites, caller, null, null, 0, 1000);
  };

  public func seedRecipes(
    recipes : RecipeMap,
    nextId : { var value : Nat },
    author : Principal,
  ) {
    if (not recipes.isEmpty()) return;
    ignore createRecipe(recipes, nextId, author, {
      title = "Fermented Plant Juice (FPJ)";
      slug = "fermented-plant-juice-fpj";
      category = #KNF;
      difficulty = #Beginner;
      prep_time = ?"30 minutes";
      fermentation_time = ?"7 days";
      total_time = ?"7 days";
      description = "FPJ captures growth hormones from fast-growing plant tips. Use during vegetative growth for lush canopy development.";
      ingredients = [
        { name = "Fast-growing plant tips"; amount = "2 parts by weight"; notes = ?"Comfrey, nettle, or sweet potato vine"; is_optional = false },
        { name = "Brown sugar"; amount = "1 part by weight"; notes = ?"Unrefined organic"; is_optional = false },
      ];
      steps = [
        { step_number = 1; instruction = "Harvest tips in early morning. Do not wash."; duration = ?"15 min"; image_key = null; tips = ?"Use only healthy, vigorous growth"; },
        { step_number = 2; instruction = "Layer plant material with sugar, press firmly, cover with cloth."; duration = ?"7 days"; image_key = null; tips = ?"Liquid turns amber with sweet-sour smell when ready"; },
        { step_number = 3; instruction = "Strain and store in cool dark place."; duration = ?"10 min"; image_key = null; tips = null },
      ];
      tips = ["Apply at 1:500 during vegetative stage", "Combine with OHN for full-spectrum tonic"];
      safety_notes = ["Avoid rancid smell — discard if putrid"];
      application_rate = ?"1:500 dilution";
      application_frequency = ?"Every 7 days during vegetative growth";
      best_for = ["Vegetative growth", "Seedlings"];
      image_key = null;
      tags = ["KNF", "nitrogen", "foliar", "fermented"];
      related_recipe_ids = [];
      is_published = true;
      display_order = 1;
    });
  };
};
