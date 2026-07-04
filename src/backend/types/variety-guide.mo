import Common "common";

module {
  /// One section of a growing guide ("overview", "soil_prep", "planting",
  /// "nutrition", "pest", "harvest"). Content is markdown and may contain
  /// [recipe:ID] tokens that the frontend renders as CookBook recipe chips.
  public type GuideSection = {
    id : Text;
    title : Text;
    icon : Text;
    content : Text;
    timing : ?Text;
  };

  /// AI-generated regenerative growing guide, cached per variety + zone key.
  /// The zone key may be a bare USDA zone ("10a") or an extended
  /// personalization key ("10a:sandy:municipal").
  public type VarietyGuide = {
    varietyId : Nat;
    zone : Text;
    generatedAt : Common.Timestamp;
    sections : [GuideSection];
    recipeRefs : [Nat];
    version : Nat;
  };
};
