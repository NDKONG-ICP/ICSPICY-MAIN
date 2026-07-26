import Common "common";
import Principal "mo:core/Principal";

module {
  public type RecipeCategory = {
    #KNF;
    #JADAM;
    #Composting;
    #PestControl;
    #SoilAmendment;
    #FermentedInputs;
    #MicrobialCultures;
    #PlantExtracts;
    #Other;
  };

  public type Difficulty = {
    #Beginner;
    #Intermediate;
    #Advanced;
  };

  public type Ingredient = {
    name : Text;
    amount : Text;
    notes : ?Text;
    is_optional : Bool;
  };

  public type RecipeStep = {
    step_number : Nat;
    instruction : Text;
    duration : ?Text;
    image_key : ?Text;
    tips : ?Text;
  };

  public type Recipe = {
    id : Common.RecipeId;
    title : Text;
    slug : Text;
    category : RecipeCategory;
    difficulty : Difficulty;
    prep_time : ?Text;
    fermentation_time : ?Text;
    total_time : ?Text;
    description : Text;
    ingredients : [Ingredient];
    steps : [RecipeStep];
    tips : [Text];
    safety_notes : [Text];
    application_rate : ?Text;
    application_frequency : ?Text;
    best_for : [Text];
    image_key : ?Text;
    tags : [Text];
    related_recipe_ids : [Nat];
    author : Principal;
    created_at : Common.Timestamp;
    updated_at : Common.Timestamp;
    var is_published : Bool;
    var is_deleted : Bool;
    var display_order : Nat;
  };

  public type RecipePublic = {
    id : Common.RecipeId;
    title : Text;
    slug : Text;
    category : RecipeCategory;
    difficulty : Difficulty;
    prep_time : ?Text;
    fermentation_time : ?Text;
    total_time : ?Text;
    description : Text;
    ingredients : [Ingredient];
    steps : [RecipeStep];
    tips : [Text];
    safety_notes : [Text];
    application_rate : ?Text;
    application_frequency : ?Text;
    best_for : [Text];
    image_key : ?Text;
    tags : [Text];
    related_recipe_ids : [Nat];
    author : Principal;
    created_at : Common.Timestamp;
    updated_at : Common.Timestamp;
    is_published : Bool;
    display_order : Nat;
    caller_favorited : Bool;
    favorite_count : Nat;
    bonsaiVideoId : ?Text;
  };

  public type CreateRecipeInput = {
    title : Text;
    slug : Text;
    category : RecipeCategory;
    difficulty : Difficulty;
    prep_time : ?Text;
    fermentation_time : ?Text;
    total_time : ?Text;
    description : Text;
    ingredients : [Ingredient];
    steps : [RecipeStep];
    tips : [Text];
    safety_notes : [Text];
    application_rate : ?Text;
    application_frequency : ?Text;
    best_for : [Text];
    image_key : ?Text;
    tags : [Text];
    related_recipe_ids : [Nat];
    is_published : Bool;
    display_order : Nat;
  };

  public type UpdateRecipeInput = {
    id : Common.RecipeId;
    title : ?Text;
    slug : ?Text;
    category : ?RecipeCategory;
    difficulty : ?Difficulty;
    prep_time : ?Text;
    fermentation_time : ?Text;
    total_time : ?Text;
    description : ?Text;
    ingredients : ?[Ingredient];
    steps : ?[RecipeStep];
    tips : ?[Text];
    safety_notes : ?[Text];
    application_rate : ?Text;
    application_frequency : ?Text;
    best_for : ?[Text];
    image_key : ?Text;
    tags : ?[Text];
    related_recipe_ids : ?[Nat];
    is_published : ?Bool;
    display_order : ?Nat;
  };

  public type UserFavorite = {
    principal : Principal;
    recipe_id : Common.RecipeId;
    saved_at : Common.Timestamp;
  };
};
