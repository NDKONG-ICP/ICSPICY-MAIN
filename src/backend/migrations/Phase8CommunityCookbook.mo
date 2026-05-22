// migrations/Phase8CommunityCookbook.mo
// One-time stable upgrade: Phase 7 community + Phase 8 CookBook recipe model.
//
// Attach in main.mo ONLY when upgrading FROM pre-Phase-8 mainnet wasm:
//   import { migration } "migrations/Phase8CommunityCookbook";
//   (with migration)
//
// After cutover succeeds, remove the hook — subsequent upgrades use current types.

import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Common "../types/common";

module {
  // ── Mainnet-stable types (retired wasm) ───────────────────────────────────

  type OldPost = {
    id : Common.PostId;
    author : Principal;
    anonymous : Bool;
    var content : Text;
    image_key : ?Text;
    likes : Set.Set<Principal>;
    created_at : Common.Timestamp;
    var updated_at : Common.Timestamp;
  };

  type OldComment = {
    id : Common.CommentId;
    post_id : Common.PostId;
    author : Principal;
    content : Text;
    created_at : Common.Timestamp;
  };

  type OldUserProfile = {
    principal_id : Principal;
    var username : Text;
    var bio : Text;
    var avatar_key : ?Text;
    var follows : Set.Set<Principal>;
    created_at : Common.Timestamp;
  };

  type OldRecipe = {
    id : Common.RecipeId;
    name : Text;
    full_name : Text;
    description : Text;
    ingredients : [Text];
    instructions : [Text];
    application_notes : Text;
    tags : [Text];
    photo_key : ?Text;
    shop_link : ?Text;
    shop_link_label : ?Text;
    is_featured : Bool;
    created_at : Common.Timestamp;
    updated_at : Common.Timestamp;
  };

  // ── Post-upgrade types (new wasm) ─────────────────────────────────────────

  type NewPost = {
    id : Common.PostId;
    author : Principal;
    anonymous : Bool;
    var content : Text;
    image_key : ?Text;
    image_keys : [Text];
    plant_id : ?Nat;
    nft_token_id : ?Nat;
    likes : Set.Set<Principal>;
    created_at : Common.Timestamp;
    var updated_at : Common.Timestamp;
    var is_deleted : Bool;
  };

  type NewComment = {
    id : Common.CommentId;
    post_id : Common.PostId;
    author : Principal;
    anonymous : Bool;
    content : Text;
    likes : Set.Set<Principal>;
    created_at : Common.Timestamp;
    var is_deleted : Bool;
  };

  type NewUserProfile = {
    principal_id : Principal;
    var username : Text;
    var bio : Text;
    var avatar_key : ?Text;
    var location : ?Text;
    var follows : Set.Set<Principal>;
    created_at : Common.Timestamp;
  };

  type RecipeCategory = {
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

  type Difficulty = {
    #Beginner;
    #Intermediate;
    #Advanced;
  };

  type Ingredient = {
    name : Text;
    amount : Text;
    notes : ?Text;
    is_optional : Bool;
  };

  type RecipeStep = {
    step_number : Nat;
    instruction : Text;
    duration : ?Text;
    image_key : ?Text;
    tips : ?Text;
  };

  type NewRecipe = {
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

  func slugify(title : Text) : Text {
    Text.toLower(Text.replace(title, #text " ", "-"));
  };

  func migratePost(old : OldPost) : NewPost {
    let keys = switch (old.image_key) {
      case null [];
      case (?k) [k];
    };
    {
      id = old.id;
      author = old.author;
      anonymous = old.anonymous;
      var content = old.content;
      image_key = old.image_key;
      image_keys = keys;
      plant_id = null;
      nft_token_id = null;
      likes = old.likes;
      created_at = old.created_at;
      var updated_at = old.updated_at;
      var is_deleted = false;
    };
  };

  func migrateComment(old : OldComment) : NewComment {
    {
      id = old.id;
      post_id = old.post_id;
      author = old.author;
      anonymous = false;
      content = old.content;
      likes = Set.empty<Principal>();
      created_at = old.created_at;
      var is_deleted = false;
    };
  };

  func migrateProfile(old : OldUserProfile) : NewUserProfile {
    {
      principal_id = old.principal_id;
      var username = old.username;
      var bio = old.bio;
      var avatar_key = old.avatar_key;
      var location = null;
      var follows = old.follows;
      created_at = old.created_at;
    };
  };

  func textIngredients(xs : [Text]) : [Ingredient] {
    Array.map<Text, Ingredient>(
      xs,
      func(line : Text) : Ingredient {
        { name = line; amount = ""; notes = null; is_optional = false };
      },
    );
  };

  func migratePostsMap(
    old : Map.Map<Common.PostId, OldPost>,
  ) : Map.Map<Common.PostId, NewPost> {
    let next = Map.empty<Common.PostId, NewPost>();
    for ((id, p) in old.entries()) {
      Map.add(next, Nat.compare, id, migratePost(p));
    };
    next;
  };

  func migrateCommentsMap(
    old : Map.Map<Common.CommentId, OldComment>,
  ) : Map.Map<Common.CommentId, NewComment> {
    let next = Map.empty<Common.CommentId, NewComment>();
    for ((id, c) in old.entries()) {
      Map.add(next, Nat.compare, id, migrateComment(c));
    };
    next;
  };

  func migrateProfilesMap(
    old : Map.Map<Principal, OldUserProfile>,
  ) : Map.Map<Principal, NewUserProfile> {
    let next = Map.empty<Principal, NewUserProfile>();
    for ((p, prof) in old.entries()) {
      Map.add(next, Principal.compare, p, migrateProfile(prof));
    };
    next;
  };

  func textSteps(xs : [Text]) : [RecipeStep] {
    Array.tabulate<RecipeStep>(
      xs.size(),
      func(i : Nat) : RecipeStep {
        {
          step_number = i + 1;
          instruction = xs[i];
          duration = null;
          image_key = null;
          tips = null;
        };
      },
    );
  };

  func migrateRecipe(old : OldRecipe, author : Principal) : NewRecipe {
    let title = if (old.full_name.size() > 0) { old.full_name } else { old.name };
    let tips = if (old.application_notes.size() > 0) {
      [old.application_notes];
    } else {
      [];
    };
    {
      id = old.id;
      title;
      slug = slugify(title) # "-" # Nat.toText(old.id);
      category = #KNF;
      difficulty = #Beginner;
      prep_time = null;
      fermentation_time = null;
      total_time = null;
      description = old.description;
      ingredients = textIngredients(old.ingredients);
      steps = textSteps(old.instructions);
      tips;
      safety_notes = [];
      application_rate = null;
      application_frequency = null;
      best_for = [];
      image_key = old.photo_key;
      tags = old.tags;
      related_recipe_ids = [];
      author = author;
      created_at = old.created_at;
      updated_at = old.updated_at;
      var is_published = true;
      var is_deleted = false;
      var display_order = if (old.is_featured) { 0 } else { old.id };
    };
  };

  func migrateRecipesMap(
    old : Map.Map<Common.RecipeId, OldRecipe>,
  ) : Map.Map<Common.RecipeId, NewRecipe> {
    let author = Principal.fromText(
      "gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae",
    );
    let next = Map.empty<Common.RecipeId, NewRecipe>();
    for ((id, r) in old.entries()) {
      Map.add(next, Nat.compare, id, migrateRecipe(r, author));
    };
    next;
  };

  public func migration(
    old : {
      posts : Map.Map<Common.PostId, OldPost>;
      comments : Map.Map<Common.CommentId, OldComment>;
      profiles : Map.Map<Principal, OldUserProfile>;
      recipes : Map.Map<Common.RecipeId, OldRecipe>;
    },
  ) : {
    posts : Map.Map<Common.PostId, NewPost>;
    comments : Map.Map<Common.CommentId, NewComment>;
    profiles : Map.Map<Principal, NewUserProfile>;
    recipes : Map.Map<Common.RecipeId, NewRecipe>;
  } {
    {
      posts = migratePostsMap(old.posts);
      comments = migrateCommentsMap(old.comments);
      profiles = migrateProfilesMap(old.profiles);
      recipes = migrateRecipesMap(old.recipes);
    };
  };
};
