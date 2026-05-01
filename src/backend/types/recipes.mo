import Common "common";

module {
  public type Recipe = {
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

  public type CreateRecipeInput = {
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
  };

  public type UpdateRecipeInput = {
    id : Common.RecipeId;
    name : ?Text;
    full_name : ?Text;
    description : ?Text;
    ingredients : ?[Text];
    instructions : ?[Text];
    application_notes : ?Text;
    tags : ?[Text];
    photo_key : ?Text;
    shop_link : ?Text;
    shop_link_label : ?Text;
    is_featured : ?Bool;
  };
};
