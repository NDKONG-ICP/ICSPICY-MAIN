import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Time "mo:core/Time";
import ICRC7 "../types/icrc7";
import CoopTypes "../types/coop";
import Common "../types/common";
import Sanitize "./sanitize";
import ICRC7Lib "./icrc7";
import IcrcLib "./icrc7";

module {
  let MAX_NAME : Nat = 120;
  let MAX_LOCATION : Nat = 200;
  let MAX_LICENSE : Nat = 120;

  public func isGrowerProvenanceToken(tokenId : Nat) : Bool {
    tokenId >= 100_000;
  };

  public func toPublic(seat : CoopTypes.CoopSeat) : CoopTypes.CoopSeatPublic {
    {
      activatedAt = seat.activatedAt;
      growerName = seat.growerName;
      growerLocation = seat.growerLocation;
      licenseInfo = seat.licenseInfo;
      revoked = seat.revoked;
    };
  };

  public func principalsToCheck(
    caller : Principal,
    linkedWallets : Map.Map<Principal, [Principal]>,
  ) : [Principal] {
    switch (linkedWallets.get(caller)) {
      case null [caller];
      case (?wallets) {
        var out : [Principal] = [caller];
        for (w in wallets.vals()) {
          if (Array.find<Principal>(out, func(p) { Principal.equal(p, w) }) == null) {
            out := Array.concat(out, [w]);
          };
        };
        out;
      };
    };
  };

  public func callerOwnsToken(
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    principals : [Principal],
    tokenId : Nat,
  ) : Bool {
    for (p in principals.vals()) {
      switch (icrc7Balances.get(p)) {
        case (?set) {
          let tokens = IcrcLib.paginateSet(set, null, null);
          switch (Array.find<Nat>(tokens, func(t) { t == tokenId })) {
            case (?_) return true;
            case null {};
          };
        };
        case null {};
      };
    };
    false;
  };

  /// Active non-revoked seat held by caller or linked wallets.
  public func findMyCoopStatus(
    caller : Principal,
    linkedWallets : Map.Map<Principal, [Principal]>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    coopSeats : Map.Map<Nat, CoopTypes.CoopSeat>,
  ) : ?CoopTypes.CoopStatus {
    let principals = principalsToCheck(caller, linkedWallets);
    for ((tokenId, seat) in coopSeats.entries()) {
      if (seat.revoked) { continue };
      if (callerOwnsToken(icrc7Balances, principals, tokenId)) {
        return ?{ tokenId; seat = toPublic(seat) };
      };
    };
    null;
  };

  public func isActiveSeatHolder(
    caller : Principal,
    linkedWallets : Map.Map<Principal, [Principal]>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    coopSeats : Map.Map<Nat, CoopTypes.CoopSeat>,
  ) : Bool {
    switch (findMyCoopStatus(caller, linkedWallets, icrc7Balances, coopSeats)) {
      case (?_) true;
      case null false;
    };
  };

  public func sanitizeProfile(
    name : Text,
    location : Text,
    license : Text,
  ) : { name : Text; location : Text; license : Text } {
    {
      name = Sanitize.sanitizeText(name, MAX_NAME);
      location = Sanitize.sanitizeText(location, MAX_LOCATION);
      license = Sanitize.sanitizeText(license, MAX_LICENSE);
    };
  };

  public func canisterOwnsPepperHead(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    tokenId : Nat,
  ) : Bool {
    if (not ICRC7Lib.isPepperHead(tokenId)) return false;
    switch (icrc7Owners.get(tokenId)) {
      case (?(acc)) {
        Principal.equal(acc.owner, canister) and acc.subaccount == null;
      };
      case null false;
    };
  };

  public func hasLiveClaimOnToken(
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    plantClaimTokens : Map.Map<Common.PlantId, Text>,
    tokenId : Nat,
  ) : Bool {
    switch (nftTokenPlantIds.get(tokenId)) {
      case null false;
      case (?plantId) switch (plantClaimTokens.get(plantId)) { case null false; case (?_) true };
    };
  };

  public func countAvailableSeats(
    coopDesignated : Map.Map<Nat, Bool>,
    coopSeats : Map.Map<Nat, CoopTypes.CoopSeat>,
    coopPending : Map.Map<Nat, Principal>,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
  ) : Nat {
    var n : Nat = 0;
    for ((tokenId, _) in coopDesignated.entries()) {
      if (switch (coopSeats.get(tokenId)) { case null false; case (?_) true }) { continue };
      if (switch (coopPending.get(tokenId)) { case null false; case (?_) true }) { continue };
      if (canisterOwnsPepperHead(icrc7Owners, canister, tokenId)) {
        n += 1;
      };
    };
    n;
  };

  public func pickNextAvailableSeat(
    coopDesignated : Map.Map<Nat, Bool>,
    coopSeats : Map.Map<Nat, CoopTypes.CoopSeat>,
    coopPending : Map.Map<Nat, Principal>,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
  ) : ?Nat {
    var candidates : [Nat] = [];
    for ((tokenId, _) in coopDesignated.entries()) {
      if (switch (coopSeats.get(tokenId)) { case null false; case (?_) true }) { continue };
      if (switch (coopPending.get(tokenId)) { case null false; case (?_) true }) { continue };
      if (canisterOwnsPepperHead(icrc7Owners, canister, tokenId)) {
        candidates := Array.concat(candidates, [tokenId]);
      };
    };
    if (candidates.size() == 0) return null;
    let sorted = Array.sort<Nat>(
      candidates,
      func(a, b) { if (a < b) #less else if (a > b) #greater else #equal },
    );
    ?sorted[0];
  };
};
