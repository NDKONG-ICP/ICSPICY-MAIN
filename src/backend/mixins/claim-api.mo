// mixins/claim-api.mo — Phase 4 + Phase 6 QR claim (in-person nursery sales).

import AccessControl "../lib/access-control";
import AuditLog "../lib/audit-log";
import ICRC7Lib "../lib/icrc7";
import NftClaim "../lib/nft-claim";
import NimsLib "../lib/nims";
import ClaimTypes "../types/claim";
import PlantTypes "../types/plants";
import ICRC7 "../types/icrc7";
import Common "../types/common";
import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";

mixin (
  accessControlState : AccessControl.AccessControlState,
  nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
  nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
  plantClaimTokens : Map.Map<Common.PlantId, Text>,
  nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  feedings : Map.Map<Common.FeedingId, PlantTypes.Feeding>,
  plantVarietyIds : Map.Map<Common.PlantId, Nat>,
  plantOwners : Map.Map<Common.PlantId, Principal>,
  plantPrices : Map.Map<Common.PlantId, Nat>,
  plantSoldAt : Map.Map<Common.PlantId, Common.Timestamp>,
  plantTransplantedOneGal : Map.Map<Common.PlantId, Common.Timestamp>,
  plantTransplantedFiveGal : Map.Map<Common.PlantId, Common.Timestamp>,
  plantNotesLog : Map.Map<Common.PlantId, List.List<PlantTypes.PlantNote>>,
  plantWateringLog : Map.Map<Common.PlantId, List.List<PlantTypes.WateringEntry>>,
  plantPestLog : Map.Map<Common.PlantId, List.List<PlantTypes.PestEntry>>,
  plantPhotoLog : Map.Map<Common.PlantId, List.List<PlantTypes.PlantPhotoEntry>>,
  plantWeatherSnapshots : Map.Map<Common.PlantId, List.List<PlantTypes.WeatherSnapshot>>,
  plantDeathRecords : Map.Map<Common.PlantId, PlantTypes.PlantDeathRecord>,
  icrc7Owners : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  selfPrincipal : () -> Principal,
  auditLog : { var value : AuditLog.AuditLog },
) {
  func claimSideMaps() : NimsLib.SideMaps {
    {
      plantVarietyIds;
      plantOwners;
      plantPrices;
      plantSoldAt;
      plantTransplantedOneGal;
      plantTransplantedFiveGal;
      plantNotesLog;
      plantWateringLog;
      plantPestLog;
      plantPhotoLog;
      plantWeatherSnapshots;
      plantDeathRecords;
    };
  };

  func stageToText(stage : PlantTypes.PlantStage) : Text {
    switch stage {
      case (#Seed) "Germinated";
      case (#Seedling) "Seedling";
      case (#Mature) "Mature";
    };
  };

  public shared ({ caller }) func generateClaimToken(
    tokenId : Nat,
  ) : async Text {
    AccessControl.requireAdmin(accessControlState, caller);
    let plantId = NimsLib.getPlantIdForNftToken(nftTokenPlantIds, plants, tokenId);
    let token = NftClaim.registerClaimToken(
      nftClaimTokens,
      nftClaimPlantIds,
      plantClaimTokens,
      nftTokenPlantIds,
      tokenId,
      plantId,
    );
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "claim_token_generated";
      detail = "token=" # token # " tokenId=" # Nat.toText(tokenId);
    });
    token
  };

  public shared ({ caller }) func generateClaimTokens(
    tokenIds : [Nat],
  ) : async [{ tokenId : Nat; claimToken : Text }] {
    AccessControl.requireAdmin(accessControlState, caller);
    var out : [{ tokenId : Nat; claimToken : Text }] = [];
    for (tokenId in tokenIds.vals()) {
      let plantId = NimsLib.getPlantIdForNftToken(nftTokenPlantIds, plants, tokenId);
      let token = NftClaim.registerClaimToken(
        nftClaimTokens,
        nftClaimPlantIds,
        plantClaimTokens,
        nftTokenPlantIds,
        tokenId,
        plantId,
      );
      out := Array.concat(out, [{ tokenId; claimToken = token }]);
    };
    out
  };

  public shared ({ caller }) func redeemClaim(
    claimToken : Text,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    AccessControl.requireAuthenticated(caller);
    let entry = switch (nftClaimTokens.get(claimToken)) {
      case null return { success = false; tokenId = null; message = "Claim token not found" };
      case (?e) e;
    };
    if (entry.redeemed) {
      return { success = false; tokenId = null; message = "Claim token already redeemed" };
    };
    let canister = selfPrincipal();
    let currentOwner = switch (icrc7Owners.get(entry.tokenId)) {
      case null return { success = false; tokenId = null; message = "NFT token not found" };
      case (?o) o;
    };
    // In-person flow: NFT held by admin or canister pool until customer claims.
    let holderOk = if (
      Principal.equal(currentOwner.owner, canister) and currentOwner.subaccount == null
    ) {
      true
    } else if (AccessControl.isAdmin(accessControlState, currentOwner.owner)) {
      true
    } else {
      switch (nftClaimPlantIds.get(claimToken)) {
        case (?plantId) {
          switch (plantOwners.get(plantId)) {
            case (?owner) owner == currentOwner.owner;
            case null false;
          };
        };
        case null false;
      };
    };
    if (not holderOk) {
      return { success = false; tokenId = null; message = "NFT not available for claim" };
    };
    switch (nftClaimPlantIds.get(claimToken)) {
      case (?plantId) {
        switch (plants.get(plantId)) {
          case (?plant) {
            if (plant.is_cooked) {
              return { success = false; tokenId = null; message = "Plant is dead" };
            };
          };
          case null {};
        };
      };
      case null {};
    };
    entry.redeemed := true;
    let buyerAccount : ICRC7.Account = { owner = caller; subaccount = null };
    switch (
      ICRC7Lib.assignOwnership(
        icrc7Owners,
        icrc7Balances,
        entry.tokenId,
        ?currentOwner,
        buyerAccount,
      )
    ) {
      case (#err(e)) {
        entry.redeemed := false;
        return { success = false; tokenId = null; message = "NFT transfer failed: " # e };
      };
      case (#ok) {};
    };
    switch (nftClaimPlantIds.get(claimToken)) {
      case (?plantId) {
        ignore NimsLib.markPlantClaimedViaQr(plants, claimSideMaps(), plantId, caller);
      };
      case null {};
    };
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "claim_redeemed";
      detail = "token=" # claimToken #
        " tokenId=" # Nat.toText(entry.tokenId) #
        " by=" # Principal.toText(caller);
    });
    { success = true; tokenId = ?entry.tokenId; message = "IC SPICY #" # Nat.toText(entry.tokenId) # " is yours" }
  };

  public query func getClaimInfo(
    token : Text,
  ) : async ?{
    tokenId : Nat;
    redeemed : Bool;
    nftName : Text;
    plantId : ?Common.PlantId;
    variety : ?Text;
    stage : ?Text;
    photoUrl : ?Text;
  } {
    switch (nftClaimTokens.get(token)) {
      case null null;
      case (?entry) {
        let plantId = nftClaimPlantIds.get(token);
        let (variety, stage, photoUrl) = switch (plantId) {
          case (?pid) {
            switch (plants.get(pid)) {
              case (?plant) {
                let photo = switch (plant.photo_keys.size()) {
                  case 0 null;
                  case (_) ?plant.photo_keys[0];
                };
                (?plant.variety, ?stageToText(plant.stage), photo);
              };
              case null (null, null, null);
            };
          };
          case null (null, null, null);
        };
        ?{
          tokenId = entry.tokenId;
          redeemed = entry.redeemed;
          nftName = "IC SPICY #" # Nat.toText(entry.tokenId);
          plantId;
          variety;
          stage;
          photoUrl;
        };
      };
    };
  };

  /// Admin: get the QR claim token for a plant (for label printing).
  public query ({ caller }) func getPlantClaimToken(
    plantId : Common.PlantId,
  ) : async ?Text {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Admin only");
    };
    plantClaimTokens.get(plantId);
  };
};
