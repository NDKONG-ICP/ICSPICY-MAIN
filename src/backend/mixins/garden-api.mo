import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "../lib/access-control";
import GardenLib "../lib/garden";
import GardenTypes "../types/garden";

mixin (
  accessControlState : AccessControl.AccessControlState,
  gardenDesigns : Map.Map<Nat, GardenTypes.GardenDesign>,
  nextGardenDesignId : { var value : Nat },
) {
  public shared ({ caller }) func createGardenDesign(
    input : GardenTypes.GardenDesignInput,
  ) : async GardenTypes.CreateGardenDesignResult {
    AccessControl.requireAuthenticated(caller);
    GardenLib.create(gardenDesigns, nextGardenDesignId, caller, input, Time.now());
  };

  public shared ({ caller }) func updateGardenDesign(
    designId : Nat,
    input : GardenTypes.GardenDesignInput,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    GardenLib.update(gardenDesigns, caller, designId, input, Time.now());
  };

  public shared ({ caller }) func deleteGardenDesign(designId : Nat) : async Bool {
    AccessControl.requireAuthenticated(caller);
    GardenLib.deleteDesign(gardenDesigns, caller, designId);
  };

  public query ({ caller }) func getMyDesigns() : async [GardenTypes.GardenDesign] {
    AccessControl.requireAuthenticated(caller);
    GardenLib.listForOwner(gardenDesigns, caller);
  };

  public query func getGardenDesign(designId : Nat) : async ?GardenTypes.GardenDesign {
    switch (GardenLib.get(gardenDesigns, designId)) {
      case (?d) {
        if (d.isPublic) ?d else null;
      };
      case null null;
    };
  };

  /// Owner or public design — authenticated owner can read private designs.
  public query ({ caller }) func getGardenDesignForUser(designId : Nat) : async ?GardenTypes.GardenDesign {
    switch (GardenLib.get(gardenDesigns, designId)) {
      case null null;
      case (?d) {
        if (d.isPublic or d.owner == caller) ?d else null;
      };
    };
  };

  public query func getPublicDesigns(offset : Nat, limit : Nat) : async [GardenTypes.GardenDesign] {
    GardenLib.listPublic(gardenDesigns, offset, limit);
  };

  public shared ({ caller }) func mintDesignAsNft(designId : Nat) : async GardenTypes.MintDesignNftResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ignore designId;
    Runtime.trap("Phase 1: NFT mint not yet implemented");
  };
};
