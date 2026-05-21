import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Text "mo:core/Text";
import AdminTypes "../types/admin";
import ClaimTypes "../types/claim";
import Common "../types/common";
import Nat "mo:core/Nat";

module {
  func matchesSearch(row : AdminTypes.ClaimTokenAdminPublic, q : Text) : Bool {
    var ok = Text.contains(row.token, #text q) or
      Text.contains(Nat.toText(row.token_id), #text q);
    if (not ok) {
      switch (row.plant_id) {
        case (?pid) { ok := Text.contains(Nat.toText(pid), #text q) };
        case null {};
      };
    };
    ok
  };

  public func listClaimTokens(
    nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
    nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
    search : ?Text,
  ) : [AdminTypes.ClaimTokenAdminPublic] {
    let needle = switch (search) {
      case null null;
      case (?s) if (Text.size(s) == 0) null else ?s;
    };
    Iter.toArray(
      Iter.filter(
        Iter.map(
          nftClaimTokens.entries(),
          func((token, entry) : (Text, ClaimTypes.NftClaimEntry)) : AdminTypes.ClaimTokenAdminPublic {
            {
              token;
              token_id = entry.tokenId;
              plant_id = nftClaimPlantIds.get(token);
              redeemed = entry.redeemed;
            }
          },
        ),
        func(row : AdminTypes.ClaimTokenAdminPublic) : Bool {
          switch (needle) {
            case null true;
            case (?q) matchesSearch(row, q);
          }
        },
      ),
    )
  };

  public func revokeClaimToken(
    nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
    nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
    plantClaimTokens : Map.Map<Common.PlantId, Text>,
    token : Text,
  ) : Bool {
    switch (nftClaimTokens.get(token)) {
      case null false;
      case (?entry) {
        if (entry.redeemed) return false;
        ignore nftClaimTokens.remove(token);
        switch (nftClaimPlantIds.get(token)) {
          case (?pid) {
            ignore nftClaimPlantIds.remove(token);
            ignore plantClaimTokens.remove(pid);
          };
          case null {};
        };
        true
      };
    }
  };
};
