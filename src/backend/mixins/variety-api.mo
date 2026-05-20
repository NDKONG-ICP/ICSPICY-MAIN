import Map "mo:core/Map";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "../lib/access-control";
import VarietyTypes "../types/variety";
import VarietyLib "../lib/variety";
import Common "../types/common";

mixin (
  accessControlState : AccessControl.AccessControlState,
  varieties : Map.Map<Nat, VarietyTypes.Variety>,
  plantVarietyIds : Map.Map<Common.PlantId, Nat>,
  nextVarietyId : { var value : Nat },
) {
  func requireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
  };

  public shared ({ caller }) func addVariety(
    name : Text,
    species : Text,
    scovilleMin : Nat,
    scovilleMax : Nat,
    description : Text,
    imageUrl : ?Text,
    daysToGerm : ?Nat,
    daysToMature : ?Nat,
  ) : async Nat {
    requireAdmin(caller);
    let id = nextVarietyId.value;
    ignore VarietyLib.addVariety(
      varieties,
      id,
      {
        name;
        species;
        scovilleMin;
        scovilleMax;
        description;
        imageUrl;
        daysToGermination = daysToGerm;
        daysToMaturity = daysToMature;
      },
    );
    nextVarietyId.value += 1;
    id;
  };

  public shared ({ caller }) func updateVariety(
    id : Nat,
    name : ?Text,
    species : ?Text,
    scovilleMin : ?Nat,
    scovilleMax : ?Nat,
    description : ?Text,
    imageUrl : ?Text,
    daysToGerm : ?Nat,
    daysToMature : ?Nat,
  ) : async Bool {
    requireAdmin(caller);
    VarietyLib.updateVariety(
      varieties,
      {
        id;
        name;
        species;
        scovilleMin;
        scovilleMax;
        description;
        imageUrl;
        daysToGermination = daysToGerm;
        daysToMaturity = daysToMature;
      },
    );
  };

  public shared ({ caller }) func removeVariety(id : Nat) : async Bool {
    requireAdmin(caller);
    VarietyLib.removeVariety(varieties, plantVarietyIds, id);
  };

  public query func getVariety(id : Nat) : async ?VarietyTypes.VarietyPublic {
    VarietyLib.getVariety(varieties, id);
  };

  public query func listVarieties() : async [VarietyTypes.VarietyPublic] {
    VarietyLib.listVarieties(varieties);
  };

  public query func searchVarieties(searchQuery : Text) : async [VarietyTypes.VarietyPublic] {
    VarietyLib.searchVarieties(varieties, searchQuery);
  };
};
