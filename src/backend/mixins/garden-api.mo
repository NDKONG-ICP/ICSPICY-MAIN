import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "../lib/access-control";
import GardenLib "../lib/garden";
import GardenRules "../lib/garden-rules";
import GardenTypes "../types/garden";
import VarietyTypes "../types/variety";

mixin (
  accessControlState : AccessControl.AccessControlState,
  gardenDesigns : Map.Map<Nat, GardenTypes.GardenDesign>,
  nextGardenDesignId : { var value : Nat },
  varieties : Map.Map<Nat, VarietyTypes.Variety>,
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

  public query func validateGardenDesignInput(
    input : GardenTypes.GardenDesignInput,
  ) : async [GardenTypes.ValidationWarning] {
    GardenRules.validateInput(input, varieties);
  };

  public query func validateGardenDesign(designId : Nat) : async [GardenTypes.ValidationWarning] {
    switch (GardenLib.get(gardenDesigns, designId)) {
      case null [];
      case (?d) {
        GardenRules.validateInput(
          {
            name = d.name;
            description = d.description;
            plants = d.plants;
            structures = d.structures;
            widthMeters = d.widthMeters;
            depthMeters = d.depthMeters;
            gridSizeMeters = d.gridSizeMeters;
            isPublic = d.isPublic;
          },
          varieties,
        );
      };
    };
  };

  public query func calculateGardenYieldInput(
    input : GardenTypes.GardenDesignInput,
  ) : async GardenTypes.YieldEstimate {
    GardenRules.calculateYield(input, varieties);
  };

  public query func calculateGardenYield(designId : Nat) : async ?GardenTypes.YieldEstimate {
    switch (GardenLib.get(gardenDesigns, designId)) {
      case null null;
      case (?d) {
        ?GardenRules.calculateYield(
          {
            name = d.name;
            description = d.description;
            plants = d.plants;
            structures = d.structures;
            widthMeters = d.widthMeters;
            depthMeters = d.depthMeters;
            gridSizeMeters = d.gridSizeMeters;
            isPublic = d.isPublic;
          },
          varieties,
        );
      };
    };
  };

  public shared ({ caller }) func mintDesignAsNft(designId : Nat) : async GardenTypes.MintDesignNftResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ignore designId;
    Runtime.trap("Phase 2: NFT mint not yet implemented");
  };
};
