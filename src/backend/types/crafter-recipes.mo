// types/crafter-recipes.mo — Saved small-batch crafter recipes (per-player).

module {
  public type SavedIngredient = {
    name : Text;
    amount : Nat;
  };

  public type SavedCrafterRecipe = {
    name : Text;
    ingredients : [SavedIngredient];
    shu : Nat;
    harmony : Nat;
    created : Int;
  };
};
