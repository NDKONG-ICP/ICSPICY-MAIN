// lib/crafter-recipes.mo — Persist favorite crafter batches (cap 10 per player).

import Array "mo:core/Array";
import Int "mo:core/Int";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Sanitize "../lib/sanitize";
import Types "../types/crafter-recipes";

module {
  public let MAX_SAVED_RECIPES : Nat = 10;
  public let MAX_INGREDIENTS : Nat = 12;
  public let MAX_NAME_CHARS : Nat = 128;
  public let MAX_INGREDIENT_NAME_CHARS : Nat = 64;
  public let MAX_HARMONY : Nat = 100;
  public let MAX_SHU : Nat = 5_000_000;

  func sanitizeIngredient(nameRaw : Text, amount : Nat) : ?Types.SavedIngredient {
    if (amount == 0) return null;
    let name = Sanitize.sanitizeText(nameRaw, MAX_INGREDIENT_NAME_CHARS);
    if (name.size() == 0) return null;
    ?{ name; amount };
  };

  func sortByCreatedAsc(recipes : [Types.SavedCrafterRecipe]) : [Types.SavedCrafterRecipe] {
    Array.sort<Types.SavedCrafterRecipe>(
      recipes,
      func(a, b) {
        if (a.created < b.created) #less
        else if (a.created > b.created) #greater
        else #equal;
      },
    );
  };

  public func saveRecipe(
    savedRecipes : Map.Map<Principal, [Types.SavedCrafterRecipe]>,
    caller : Principal,
    nameRaw : Text,
    ingredientsRaw : [(Text, Nat)],
    shu : Nat,
    harmony : Nat,
    now : Int,
  ) : Result.Result<(), Text> {
    if (ingredientsRaw.size() == 0) {
      return #err("Recipe must include at least one ingredient");
    };
    if (ingredientsRaw.size() > MAX_INGREDIENTS) {
      return #err("Too many ingredients");
    };
    if (shu > MAX_SHU) {
      return #err("SHU exceeds server cap");
    };
    if (harmony > MAX_HARMONY) {
      return #err("Harmony exceeds server cap");
    };

    let name = Sanitize.sanitizeText(nameRaw, MAX_NAME_CHARS);
    if (name.size() == 0) {
      return #err("Batch name required");
    };

    let ingredients = List.empty<Types.SavedIngredient>();
    for ((n, amt) in ingredientsRaw.vals()) {
      switch (sanitizeIngredient(n, amt)) {
        case null {};
        case (?ing) { ingredients.add(ing) };
      };
    };
    let ingArr = ingredients.toArray();
    if (ingArr.size() == 0) {
      return #err("No valid ingredients");
    };

    let entry : Types.SavedCrafterRecipe = {
      name;
      ingredients = ingArr;
      shu;
      harmony;
      created = now;
    };

    switch (savedRecipes.get(caller)) {
      case (?existing) {
        var next = existing.concat([entry]);
        if (next.size() > MAX_SAVED_RECIPES) {
          let sorted = sortByCreatedAsc(next);
          let drop = next.size() - MAX_SAVED_RECIPES;
          next := Array.tabulate<Types.SavedCrafterRecipe>(
            MAX_SAVED_RECIPES,
            func(i) { sorted[drop + i] },
          );
        };
        savedRecipes.add(caller, next);
        #ok(());
      };
      case null {
        savedRecipes.add(caller, [entry]);
        #ok(());
      };
    };
  };

  public func getMyRecipes(
    savedRecipes : Map.Map<Principal, [Types.SavedCrafterRecipe]>,
    caller : Principal,
  ) : [Types.SavedCrafterRecipe] {
    switch (savedRecipes.get(caller)) {
      case null [];
      case (?recipes) {
        Array.sort<Types.SavedCrafterRecipe>(
          recipes,
          func(a, b) {
            if (a.created > b.created) #less
            else if (a.created < b.created) #greater
            else #equal;
          },
        );
      };
    };
  };
};
