// lib/nft-claim.mo — shared QR claim token helpers (Phase 4 + Phase 6).

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Common "../types/common";
import ClaimTypes "../types/claim";
import PlantTypes "../types/plants";

module {
  func hexChar(n : Nat) : Char {
    let chars = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
    chars[n % 16]
  };

  func toHex10(n : Nat) : Text {
    var result = "";
    var rem = n;
    var i = 0;
    while (i < 10) {
      result := Text.fromChar(hexChar(rem % 16)) # result;
      rem := rem / 16;
      i += 1;
    };
    result
  };

  public func makeClaimToken(tokenId : Nat, now : Int, existingCount : Nat) : Text {
    let seed = Int.abs(now) + tokenId * 1_000_000_007 + existingCount * 997;
    "spcy_" # toHex10(seed % 1_099_511_627_776)
  };

  /// Register a QR claim token for an NFT, optionally linked to a NIMS plant.
  public func registerClaimToken(
    nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
    nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
    plantClaimTokens : Map.Map<Common.PlantId, Text>,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    tokenId : Nat,
    plantId : ?Common.PlantId,
  ) : Text {
    let token = makeClaimToken(tokenId, Time.now(), nftClaimTokens.size());
    let entry : ClaimTypes.NftClaimEntry = { tokenId; var redeemed = false };
    nftClaimTokens.add(token, entry);
    switch (plantId) {
      case (?pid) {
        nftClaimPlantIds.add(token, pid);
        plantClaimTokens.add(pid, token);
        nftTokenPlantIds.add(tokenId, pid);
      };
      case null {};
    };
    token
  };

  public func findPlantIdByTokenId(
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    tokenId : Nat,
  ) : ?Common.PlantId {
    switch (nftTokenPlantIds.get(tokenId)) {
      case (?pid) ?pid;
      case null {
        let needle = Nat.toText(tokenId);
        for ((id, plant) in plants.entries()) {
          switch (plant.nft_id) {
            case (?t) { if (t == needle) return ?id };
            case null {};
          };
        };
        null
      };
    };
  };
};
