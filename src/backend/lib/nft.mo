import Common "../types/common";
import PlantTypes "../types/plants";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";

module {
  // ICRC-37 NFT metadata stored on-chain
  public type ICRC37Metadata = {
    token_id : Text;
    plant_id : Common.PlantId;
    variety : Text;
    stage : PlantTypes.PlantStage;
    image_key : ?Text;
    attributes : [(Text, Text)];
    minted_at : Common.Timestamp;
  };

  // EXT (Entrepot Token eXtension) metadata — flat key-value text record
  public type EXTMetadata = {
    tokenIdentifier : Text;
    properties : [(Text, Text)]; // flat key -> text value map
    minted_at : Common.Timestamp;
  };

  func stageText(stage : PlantTypes.PlantStage) : Text {
    switch stage {
      case (#Seed) "Seed";
      case (#Seedling) "Seedling";
      case (#Mature) "Mature";
    };
  };

  func buildAttributesJson(attributes : [(Text, Text)]) : Text {
    var result = "[";
    var first = true;
    for ((k, v) in attributes.vals()) {
      if (not first) { result #= "," };
      result #= "{\"trait_type\":\"" # k # "\",\"value\":\"" # v # "\"}";
      first := false;
    };
    result # "]";
  };

  public func buildICRC37Metadata(
    plant : PlantTypes.PlantPublic,
    image_key : ?Text,
    attributes : [(Text, Text)],
    timestamp : Common.Timestamp,
  ) : ICRC37Metadata {
    let token_id = "icspicy-" # plant.id.toText() # "-" # stageText(plant.stage);
    {
      token_id = token_id;
      plant_id = plant.id;
      variety = plant.variety;
      stage = plant.stage;
      image_key = image_key;
      attributes = attributes;
      minted_at = timestamp;
    };
  };

  // Build EXT-compatible metadata for a plant NFT.
  // EXT uses a flat key-value text record; imageUrl and standard name are embedded.
  public func buildEXTMetadata(
    plantId : Nat,
    imageKey : Text,
    attributes : [(Text, Text)],
    timestamp : Common.Timestamp,
  ) : EXTMetadata {
    let tokenIdentifier = "icspicy-ext-" # plantId.toText();
    // Base properties
    let baseProps : [(Text, Text)] = [
      ("standard", "EXT"),
      ("name", "IC SPICY Plant #" # plantId.toText()),
      ("description", "Real-World Asset NFT for an IC SPICY pepper plant — Port Charlotte, FL."),
      ("imageUrl", imageKey),
    ];
    // Merge base + caller-supplied attributes
    let merged = baseProps.concat(attributes);
    {
      tokenIdentifier = tokenIdentifier;
      properties = merged;
      minted_at = timestamp;
    };
  };

  public func mintICRC37(
    icrc37Tokens : Map.Map<Text, ICRC37Metadata>,
    plant : PlantTypes.PlantPublic,
    image_key : ?Text,
    attributes : [(Text, Text)],
    timestamp : Common.Timestamp,
  ) : Text {
    let metadata = buildICRC37Metadata(plant, image_key, attributes, timestamp);
    icrc37Tokens.add(metadata.token_id, metadata);
    metadata.token_id;
  };

  // Mint an EXT-format NFT and store it in the provided token map.
  public func mintEXT(
    extTokens : Map.Map<Text, EXTMetadata>,
    plantId : Nat,
    imageKey : Text,
    attributes : [(Text, Text)],
    timestamp : Common.Timestamp,
  ) : Text {
    let metadata = buildEXTMetadata(plantId, imageKey, attributes, timestamp);
    extTokens.add(metadata.tokenIdentifier, metadata);
    metadata.tokenIdentifier;
  };

  // Hedera RWA provenance JSON payload for HTTP outcall
  public func buildHederaRWAPayload(
    plant : PlantTypes.PlantPublic,
    image_key : ?Text,
    attributes : [(Text, Text)],
  ) : Text {
    let imageStr = switch image_key {
      case (?k) "\"" # k # "\"";
      case null "null";
    };
    let germStr = switch (plant.germination_date) {
      case (?d) "\"" # d.toText() # "\"";
      case null "null";
    };
    let transplantStr = switch (plant.transplant_date) {
      case (?d) "\"" # d.toText() # "\"";
      case null "null";
    };
    "{" #
      "\"name\":\"IC SPICY - " # plant.variety # " #" # plant.id.toText() # "\"," #
      "\"description\":\"Real-World Asset NFT representing a " # plant.variety # " pepper plant.\"," #
      "\"image\":" # imageStr # "," #
      "\"properties\":{" #
        "\"plant_id\":" # plant.id.toText() # "," #
        "\"variety\":\"" # plant.variety # "\"," #
        "\"genetics\":\"" # plant.genetics # "\"," #
        "\"stage\":\"" # stageText(plant.stage) # "\"," #
        "\"tray_id\":" # plant.tray_id.toText() # "," #
        "\"cell_position\":" # plant.cell_position.toText() # "," #
        "\"planting_date\":" # plant.planting_date.toText() # "," #
        "\"germination_date\":" # germStr # "," #
        "\"transplant_date\":" # transplantStr # "," #
        "\"issuer\":\"IC SPICY - Port Charlotte, FL\"," #
        "\"standard\":\"Hedera RWA Provenance\"" #
      "}," #
      "\"attributes\":" # buildAttributesJson(attributes) #
    "}";
  };

  public func airdropNFT(
    icrc37Tokens : Map.Map<Text, ICRC37Metadata>,
    token_id : Text,
    _recipient : Principal,
  ) : () {
    // Verify token exists — actual transfer recorded via token_id lookup
    switch (icrc37Tokens.get(token_id)) {
      case null { Runtime.trap("Token not found: " # token_id) };
      case (?_) {
        // On-chain ICRC-37 airdrop: ownership tracked by plant.sold_to
        // Token metadata remains; frontend can verify recipient via plant record
      };
    };
  };
};
