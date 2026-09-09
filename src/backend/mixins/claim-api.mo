// mixins/claim-api.mo — Phase 4 + Phase 6 QR claim (in-person nursery sales).

import AccessControl "../lib/access-control";
import AuditLog "../lib/audit-log";
import ClaimRequests "../lib/claim-requests";
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
  agentPrincipalState : AccessControl.AgentPrincipalState,
  nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
  nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
  nftClaimArms : Map.Map<Text, ClaimTypes.ClaimArm>,
  plantClaimTokens : Map.Map<Common.PlantId, Text>,
  nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
  plantClaimRequests : ClaimRequests.RequestMap,
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

  /// Default arming window for staff-armed QR tags: 72 hours (ns).
  let CLAIM_ARM_WINDOW_NS : Int = 72 * 3_600 * 1_000_000_000;

  /// Admin: arm a printed QR claim token at the point of sale.
  /// The customer can redeem only while the token is armed (default 72h window).
  public shared ({ caller }) func armClaimToken(
    claimToken : Text,
    windowHours : ?Nat,
  ) : async { success : Bool; message : Text } {
    AccessControl.requireAdmin(accessControlState, caller);
    let entry = switch (nftClaimTokens.get(claimToken)) {
      case null return { success = false; message = "Claim token not found" };
      case (?e) e;
    };
    if (entry.redeemed) {
      return { success = false; message = "Claim token already redeemed" };
    };
    let now = Time.now();
    let windowNs : Int = switch (windowHours) {
      case (?h) h * 3_600 * 1_000_000_000;
      case null CLAIM_ARM_WINDOW_NS;
    };
    nftClaimArms.add(claimToken, { armedAt = now; expiresAt = ?(now + windowNs) });
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = now;
      admin = caller;
      action = "claim_token_armed";
      detail = "token=" # claimToken # " tokenId=" # Nat.toText(entry.tokenId);
    });
    { success = true; message = "Claim armed" };
  };

  /// Admin: disarm a claim token (e.g. armed by mistake, or sale fell through).
  public shared ({ caller }) func disarmClaimToken(
    claimToken : Text,
  ) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    let existed = nftClaimArms.delete(claimToken);
    if (existed) {
      auditLog.value := AuditLog.append(auditLog.value, {
        ts = Time.now();
        admin = caller;
        action = "claim_token_disarmed";
        detail = "token=" # claimToken;
      });
    };
    existed;
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
    // Arming gate — printed QR tags can be scanned by anyone in the nursery,
    // so a token is redeemable only after staff arm it at the point of sale.
    // Paid-order pickup tokens are auto-armed at settlement (expiresAt = null).
    switch (nftClaimArms.get(claimToken)) {
      case null {
        return { success = false; tokenId = null; message = "Claim not yet activated — ask nursery staff to activate it at checkout" };
      };
      case (?arm) {
        switch (arm.expiresAt) {
          case (?exp) {
            if (Time.now() > exp) {
              return { success = false; tokenId = null; message = "Claim activation expired — ask nursery staff to re-activate it" };
            };
          };
          case null {};
        };
      };
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

  /// Authenticated visitor: request admin-cosigned provenance claim after NFC scan.
  public shared ({ caller }) func requestPlantClaim(
    plantId : Common.PlantId,
    note : ?Text,
  ) : async { success : Bool; message : Text } {
    AccessControl.requireAuthenticated(caller);
    switch (plants.get(plantId)) {
      case null return { success = false; message = "Plant not found" };
      case (?plant) {
        if (plant.is_cooked) {
          return { success = false; message = "Plant is no longer available" };
        };
        if (plant.sold) {
          return { success = false; message = "Plant already claimed" };
        };
        let tokenId = switch (ClaimRequests.plantHasClaimableNft(plant)) {
          case null return { success = false; message = "No NFT linked to this plant" };
          case (?n) n;
        };
        switch (plantClaimRequests.get(ClaimRequests.requestKey(plantId, caller))) {
          case (?existing) {
            if (existing.status == #pending) {
              return { success = false; message = "Claim already requested — awaiting nursery confirmation" };
            };
            if (existing.status == #approved) {
              return { success = false; message = "You already own this plant's provenance" };
            };
          };
          case null {};
        };
        switch (icrc7Owners.get(tokenId)) {
          case null return { success = false; message = "NFT not found" };
          case (?owner) {
            if (Principal.equal(owner.owner, caller) and owner.subaccount == null) {
              return { success = false; message = "You already own this NFT" };
            };
          };
        };
        let req : ClaimTypes.PlantClaimRequest = {
          plantId;
          nftTokenId = tokenId;
          requester = caller;
          requestedAt = Time.now();
          note;
          var status = #pending;
        };
        plantClaimRequests.add(ClaimRequests.requestKey(plantId, caller), req);
        { success = true; message = "Claim requested — the nursery confirms at checkout" };
      };
    };
  };

  public shared ({ caller }) func cancelMyClaimRequest(
    plantId : Common.PlantId,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    let key = ClaimRequests.requestKey(plantId, caller);
    switch (plantClaimRequests.get(key)) {
      case null false;
      case (?r) {
        if (r.status != #pending) return false;
        r.status := #rejected;
        true;
      };
    };
  };

  public query ({ caller }) func getMyClaimRequests() : async [ClaimTypes.PlantClaimRequestPublic] {
    if (caller.isAnonymous()) return [];
    ClaimRequests.listForRequester(plantClaimRequests, caller);
  };

  public query func getPlantClaimStatus(
    plantId : Common.PlantId,
    caller : ?Principal,
  ) : async ClaimTypes.PlantClaimStatusPublic {
    let sold = switch (plants.get(plantId)) {
      case (?p) p.sold;
      case null false;
    };
    let hasNft = switch (plants.get(plantId)) {
      case (?p) ClaimRequests.plantHasClaimableNft(p) != null or p.nft_id != null;
      case null false;
    };
    let myStatus = switch (caller) {
      case (?c) {
        if (c.isAnonymous()) null
        else ClaimRequests.statusForCaller(plantClaimRequests, plantId, c);
      };
      case null null;
    };
    {
      pendingCount = ClaimRequests.countPendingForPlant(plantClaimRequests, plantId);
      sold;
      hasNft;
      myStatus;
    };
  };

  public query ({ caller }) func adminListClaimRequests(
    statusFilter : ?ClaimTypes.ClaimRequestStatus,
  ) : async [ClaimTypes.PlantClaimRequestPublic] {
    if (not AccessControl.isAdminOrAgent(accessControlState, agentPrincipalState, caller)) {
      Runtime.trap("Admin only");
    };
    ClaimRequests.listByStatus(plantClaimRequests, statusFilter);
  };

  public shared ({ caller }) func adminApproveClaimRequest(
    plantId : Common.PlantId,
    requester : Principal,
  ) : async { success : Bool; message : Text } {
    AccessControl.requireAdmin(accessControlState, caller);
    let key = ClaimRequests.requestKey(plantId, requester);
    let req = switch (plantClaimRequests.get(key)) {
      case null return { success = false; message = "Claim request not found" };
      case (?r) r;
    };
    if (req.status != #pending) {
      return { success = false; message = "Claim request is not pending" };
    };
    switch (plants.get(plantId)) {
      case null return { success = false; message = "Plant not found" };
      case (?plant) {
        if (plant.is_cooked) {
          return { success = false; message = "Plant is dead" };
        };
        if (plant.sold) {
          return { success = false; message = "Plant already sold" };
        };
      };
    };
    let tokenId = req.nftTokenId;
    let canister = selfPrincipal();
    let currentOwner = switch (icrc7Owners.get(tokenId)) {
      case null return { success = false; message = "NFT token not found" };
      case (?o) o;
    };
    let holderOk = if (
      Principal.equal(currentOwner.owner, canister) and currentOwner.subaccount == null
    ) {
      true
    } else if (AccessControl.isAdmin(accessControlState, currentOwner.owner)) {
      true
    } else {
      switch (plantOwners.get(plantId)) {
        case (?owner) owner == currentOwner.owner;
        case null false;
      };
    };
    if (not holderOk) {
      return { success = false; message = "NFT not held by nursery for transfer" };
    };
    let buyerAccount : ICRC7.Account = { owner = requester; subaccount = null };
    switch (
      ICRC7Lib.assignOwnership(
        icrc7Owners,
        icrc7Balances,
        tokenId,
        ?currentOwner,
        buyerAccount,
      )
    ) {
      case (#err(e)) {
        return { success = false; message = "NFT transfer failed: " # e };
      };
      case (#ok) {};
    };
    ignore NimsLib.markPlantClaimedViaQr(plants, claimSideMaps(), plantId, requester);
    req.status := #approved;
    ClaimRequests.rejectOtherPending(plantClaimRequests, plantId, requester);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "claim_request_approved";
      detail = "plantId=" # Nat.toText(plantId) #
        " tokenId=" # Nat.toText(tokenId) #
        " to=" # Principal.toText(requester);
    });
    { success = true; message = "Provenance transferred to buyer" };
  };

  public shared ({ caller }) func adminRejectClaimRequest(
    plantId : Common.PlantId,
    requester : Principal,
  ) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    let key = ClaimRequests.requestKey(plantId, requester);
    switch (plantClaimRequests.get(key)) {
      case null false;
      case (?r) {
        if (r.status != #pending) return false;
        r.status := #rejected;
        auditLog.value := AuditLog.append(auditLog.value, {
          ts = Time.now();
          admin = caller;
          action = "claim_request_rejected";
          detail = "plantId=" # Nat.toText(plantId) #
            " requester=" # Principal.toText(requester);
        });
        true;
      };
    };
  };
};
