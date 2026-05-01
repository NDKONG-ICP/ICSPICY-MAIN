import Map "mo:core/Map";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import IC "ic:aaaaa-aa";
import Blob "mo:core/Blob";
import AccessControl "../lib/access-control";
import Common "../types/common";
import PlantTypes "../types/plants";
import PlantsLib "../lib/plants";
import NFTLib "../lib/nft";

mixin (
  accessControlState : AccessControl.AccessControlState,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  icrc37Tokens : Map.Map<Text, NFTLib.ICRC37Metadata>,
  extTokens : Map.Map<Text, NFTLib.EXTMetadata>,
) {
  // Transform callback required by IC HTTP outcalls — strips headers for replica consensus
  public query func transform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    { response with headers = [] };
  };

  // Admin: mint an ICRC-37 NFT for a plant (stored on-chain)
  public shared ({ caller }) func mintICRC37(
    plant_id : Common.PlantId,
    image_key : ?Text,
    attributes : [(Text, Text)],
  ) : async Text {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    switch (PlantsLib.getPlant(plants, plant_id)) {
      case (?plant) {
        let token_id = NFTLib.mintICRC37(icrc37Tokens, plant, image_key, attributes, Time.now());
        // Associate NFT with plant record
        PlantsLib.setPlantNFT(plants, plant_id, token_id);
        token_id;
      };
      case null { Runtime.trap("Plant not found: " # plant_id.toText()) };
    };
  };

  // Admin: mint an EXT-format NFT for a plant (stored on-chain, backward compatible)
  public shared ({ caller }) func mintEXT(
    plantId : Nat,
    imageKey : Text,
    attributes : [(Text, Text)],
  ) : async Text {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let tokenId = NFTLib.mintEXT(extTokens, plantId, imageKey, attributes, Time.now());
    // Associate EXT token ID with the plant record if the plant exists
    switch (PlantsLib.getPlant(plants, plantId)) {
      case (?_) { PlantsLib.setPlantNFT(plants, plantId, tokenId) };
      case null {}; // plant may not exist for standalone EXT mints
    };
    tokenId;
  };

  // Admin: mint a Hedera RWA NFT via HTTP outcall
  public shared ({ caller }) func mintHederaNFT(
    plant_id : Common.PlantId,
    image_key : ?Text,
    attributes : [(Text, Text)],
  ) : async Text {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    switch (PlantsLib.getPlant(plants, plant_id)) {
      case (?plant) {
        let payload = NFTLib.buildHederaRWAPayload(plant, image_key, attributes);
        // Use configurable tokenId — default testnet token
        let hederaTokenId = "0.0.5981874";
        let url = "https://testnet.mirrornode.hedera.com/api/v1/tokens/" # hederaTokenId # "/nfts";
        let httpResponse = await (with cycles = 231_000_000_000) IC.http_request({
          url;
          max_response_bytes = ?(10_000 : Nat64);
          headers = [
            { name = "Content-Type";    value = "application/json" },
            { name = "Accept";          value = "application/json" },
            { name = "User-Agent";      value = "ic-canister" },
            { name = "Idempotency-Key"; value = "hedera-mint-" # Nat.toText(plant_id) },
          ];
          body = ?payload.encodeUtf8();
          method = #post;
          transform = ?{ function = transform; context = Blob.fromArray([]) };
          is_replicated = null;
        });
        let response = switch (httpResponse.body.decodeUtf8()) {
          case null Runtime.trap("empty HTTP response");
          case (?text) text;
        };
        // Associate NFT token ID from Hedera response with plant
        PlantsLib.setPlantNFT(plants, plant_id, hederaTokenId # "-" # plant_id.toText());
        response;
      };
      case null { Runtime.trap("Plant not found: " # plant_id.toText()) };
    };
  };

  // Admin: airdrop an ICRC-37 NFT to any address
  public shared ({ caller }) func airdropNFT(token_id : Text, recipient : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    NFTLib.airdropNFT(icrc37Tokens, token_id, recipient);
  };

  // Public: generate a QR code claim payload for pickup
  public query func generatePickupQRPayload(plant_id : Common.PlantId) : async Text {
    switch (PlantsLib.getPlant(plants, plant_id)) {
      case (?plant) {
        let stageStr = switch (plant.stage) {
          case (#Seed) "Seed";
          case (#Seedling) "Seedling";
          case (#Mature) "Mature";
        };
        let nftStr = switch (plant.nft_id) {
          case (?id) "\"" # id # "\"";
          case null "null";
        };
        "{\"type\":\"ic_spicy_pickup\",\"plant_id\":" # plant.id.toText() #
        ",\"variety\":\"" # plant.variety # "\"" #
        ",\"stage\":\"" # stageStr # "\"" #
        ",\"nft_id\":" # nftStr # "}";
      };
      case null { Runtime.trap("Plant not found: " # plant_id.toText()) };
    };
  };
};
