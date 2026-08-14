/// Admin-cosigned plant claim requests (NFC phygital flow).

import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Common "../types/common";
import ClaimTypes "../types/claim";
import PlantTypes "../types/plants";

module {
  public type RequestMap = Map.Map<Text, ClaimTypes.PlantClaimRequest>;

  public func emptyMap() : RequestMap {
    Map.empty<Text, ClaimTypes.PlantClaimRequest>();
  };

  public func requestKey(plantId : Common.PlantId, requester : Principal) : Text {
    Nat.toText(plantId) # "|" # Principal.toText(requester);
  };

  public func toPublic(r : ClaimTypes.PlantClaimRequest) : ClaimTypes.PlantClaimRequestPublic {
    {
      plantId = r.plantId;
      nftTokenId = r.nftTokenId;
      requester = r.requester;
      requestedAt = r.requestedAt;
      note = r.note;
      status = r.status;
    };
  };

  public func countPendingForPlant(
    requests : RequestMap,
    plantId : Common.PlantId,
  ) : Nat {
    var n : Nat = 0;
    for ((_, r) in requests.entries()) {
      if (r.plantId == plantId and r.status == #pending) {
        n += 1;
      };
    };
    n;
  };

  public func statusForCaller(
    requests : RequestMap,
    plantId : Common.PlantId,
    caller : Principal,
  ) : ?ClaimTypes.ClaimRequestStatus {
    switch (requests.get(requestKey(plantId, caller))) {
      case (?r) ?r.status;
      case null null;
    };
  };

  public func listByStatus(
    requests : RequestMap,
    filter : ?ClaimTypes.ClaimRequestStatus,
  ) : [ClaimTypes.PlantClaimRequestPublic] {
    var out : [ClaimTypes.PlantClaimRequestPublic] = [];
    for ((_, r) in requests.entries()) {
      let matched = switch (filter) {
        case (?s) r.status == s;
        case null true;
      };
      if (matched) {
        out := Array.concat(out, [toPublic(r)]);
      };
    };
    out;
  };

  public func listForRequester(
    requests : RequestMap,
    requester : Principal,
  ) : [ClaimTypes.PlantClaimRequestPublic] {
    var out : [ClaimTypes.PlantClaimRequestPublic] = [];
    for ((_, r) in requests.entries()) {
      if (r.requester == requester) {
        out := Array.concat(out, [toPublic(r)]);
      };
    };
    out;
  };

  public func rejectOtherPending(
    requests : RequestMap,
    plantId : Common.PlantId,
    exceptRequester : Principal,
  ) {
    for ((key, r) in requests.entries()) {
      if (
        r.plantId == plantId
        and r.status == #pending
        and not Principal.equal(r.requester, exceptRequester)
      ) {
        r.status := #rejected;
      };
    };
  };

  public func plantHasClaimableNft(
    plant : PlantTypes.Plant,
  ) : ?Nat {
    if (plant.is_cooked or plant.sold) return null;
    switch (plant.nft_id) {
      case null null;
      case (?t) {
        switch (Nat.fromText(t)) {
          case (?n) if (n > 0) ?n else null;
          case null null;
        };
      };
    };
  };
};
