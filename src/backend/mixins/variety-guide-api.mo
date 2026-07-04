// mixins/variety-guide-api.mo — AI-generated variety growing guides,
// cached per variety + zone key. Guides are generated on the frontend via
// SpicyAI and stored here so each variety+zone pair is generated once.

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "../lib/access-control";
import GuideTypes "../types/variety-guide";

mixin (
  accessControlState : AccessControl.AccessControlState,
  varietyGuides : Map.Map<Text, GuideTypes.VarietyGuide>,
) {
  func guideKey(varietyId : Nat, zone : Text) : Text {
    Nat.toText(varietyId) # ":" # zone;
  };

  func guideIsAdmin(p : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, p);
  };

  /// Sanity caps so a malicious caller can't stuff the canister heap.
  func validGuidePayload(
    zone : Text,
    sections : [GuideTypes.GuideSection],
    recipeRefs : [Nat],
  ) : Bool {
    if (Text.size(zone) == 0 or Text.size(zone) > 64) return false;
    if (sections.size() == 0 or sections.size() > 12) return false;
    if (recipeRefs.size() > 40) return false;
    var total = 0;
    for (s in sections.vals()) {
      if (Text.size(s.id) > 40 or Text.size(s.title) > 160) return false;
      if (Text.size(s.icon) > 16) return false;
      total += Text.size(s.content);
    };
    total <= 100_000;
  };

  public query func getVarietyGuide(
    varietyId : Nat,
    zone : Text,
  ) : async ?GuideTypes.VarietyGuide {
    varietyGuides.get(guideKey(varietyId, zone));
  };

  /// Store a generated guide. First-write-wins per variety+zone key so a
  /// concurrent second generation cannot clobber the cached guide; admins
  /// can overwrite (used for curation / regeneration).
  public shared ({ caller }) func saveVarietyGuide(
    varietyId : Nat,
    zone : Text,
    sections : [GuideTypes.GuideSection],
    recipeRefs : [Nat],
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    if (not validGuidePayload(zone, sections, recipeRefs)) return false;
    let key = guideKey(varietyId, zone);
    let version = switch (varietyGuides.get(key)) {
      case (?existing) {
        if (not guideIsAdmin(caller)) return false;
        existing.version + 1;
      };
      case null 1;
    };
    varietyGuides.add(
      key,
      {
        varietyId;
        zone;
        generatedAt = Time.now();
        sections;
        recipeRefs;
        version;
      },
    );
    true;
  };

  public shared ({ caller }) func adminDeleteVarietyGuide(
    varietyId : Nat,
    zone : Text,
  ) : async Bool {
    if (not guideIsAdmin(caller)) Runtime.trap("Unauthorized: Admin only");
    let key = guideKey(varietyId, zone);
    switch (varietyGuides.get(key)) {
      case null false;
      case (?_) {
        ignore varietyGuides.delete(key);
        true;
      };
    };
  };
};
