import Common "../types/common";
import ClaimTypes "../types/claim";
import PlantTypes "../types/plants";
import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";

module {
  // Trigger a lifecycle NFT upgrade: archive old metadata, build new RWATokenMetadata
  // with updated stage and full prior history, store new token, update plant record.
  public func triggerLifecycleUpgrade(
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    stageHistory : Map.Map<Common.PlantId, List.List<PlantTypes.StageHistory>>,
    rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
    upgradeEvents : Map.Map<Common.PlantId, List.List<ClaimTypes.LifecycleUpgradeEvent>>,
    _artworkLayers : Map.Map<Common.ArtworkLayerId, PlantTypes.ArtworkLayer>,
    plant_id : Common.PlantId,
    new_stage : Text,
    now : Common.Timestamp,
  ) : Text {
    let plant = switch (plants.get(plant_id)) {
      case (?p) p;
      case null { Runtime.trap("Plant not found") };
    };

    // Determine old NFT id
    let old_nft_id = plant.nft_id;
    let old_stage = stageToText(plant.stage);

    // Retrieve existing metadata to carry forward (including upgrade history)
    let prevMeta : ?PlantTypes.RWATokenMetadata = switch (old_nft_id) {
      case (?id) { rwaTokens.get(id) };
      case null { null };
    };

    // Build upgrade count
    let upgradeCount : Nat = switch (upgradeEvents.get(plant_id)) {
      case (?evts) { evts.size() };
      case null { 0 };
    };

    // Build new token id
    let new_token_id = "rwa-" # plant_id.toText() # "-" # new_stage # "-" # now.toText();

    // Build accumulated attributes, preserving prior metadata
    let baseAttribs : [(Text, Text)] = switch (prevMeta) {
      case (?meta) {
        meta.attributes.concat([
          ("upgrade_count", (upgradeCount + 1).toText()),
          ("previous_nft_id", switch (old_nft_id) { case (?id) id; case null "" }),
          ("upgraded_at", now.toText()),
          ("new_stage", new_stage),
          ("old_stage", old_stage),
        ])
      };
      case null {
        [
          ("variety", plant.variety),
          ("old_stage", old_stage),
          ("new_stage", new_stage),
          ("upgrade_count", "1"),
          ("upgraded_at", now.toText()),
          ("original_plant_id", plant_id.toText()),
        ]
      };
    };

    // Get stage history entries to embed
    let stageHist : [PlantTypes.StageHistory] = switch (stageHistory.get(plant_id)) {
      case (?h) h.toArray();
      case null [];
    };
    let stageHistAttrib : (Text, Text) = ("stage_history_count", stageHist.size().toText());

    let allAttribs = baseAttribs.concat([stageHistAttrib]);

    // Determine image_key: prefer existing or fallback empty
    let image_key : Text = switch (prevMeta) {
      case (?meta) meta.image_key;
      case null "";
    };

    let rarity_tier : Nat = switch (prevMeta) {
      case (?meta) meta.rarity_tier;
      case null 10;
    };

    let ownerPrincipal : ?Principal = switch (prevMeta) {
      case (?meta) { meta.owner };
      case null { ?plant.created_by };
    };

    // Mint new RWA token metadata
    let newMeta : PlantTypes.RWATokenMetadata = {
      token_id = new_token_id;
      name = "RWA Provenance: " # plant.variety # " [" # new_stage # "]";
      description = "IC SPICY RWA NFT — " # plant.variety # " lifecycle upgrade to " # new_stage;
      image_key = image_key;
      attributes = allAttribs;
      owner = ownerPrincipal;
      minted_at = now;
      rarity_tier = rarity_tier;
    };
    rwaTokens.add(new_token_id, newMeta);

    // Update plant stage and nft_id
    plant.stage := textToStage(new_stage);
    plant.nft_id := ?new_token_id;

    // Append upgrade event
    let event : ClaimTypes.LifecycleUpgradeEvent = {
      plant_id = plant_id;
      old_nft_id = old_nft_id;
      new_nft_id = new_token_id;
      old_stage = old_stage;
      new_stage = new_stage;
      upgraded_at = now;
    };
    let events = switch (upgradeEvents.get(plant_id)) {
      case (?evts) evts;
      case null {
        let newEvts = List.empty<ClaimTypes.LifecycleUpgradeEvent>();
        upgradeEvents.add(plant_id, newEvts);
        newEvts;
      };
    };
    events.add(event);

    // Also record new stage in stageHistory
    let hist = switch (stageHistory.get(plant_id)) {
      case (?h) h;
      case null {
        let h = List.empty<PlantTypes.StageHistory>();
        stageHistory.add(plant_id, h);
        h;
      };
    };
    hist.add({
      stage = textToStage(new_stage);
      timestamp = now;
      notes = "Lifecycle NFT upgrade: " # old_stage # " → " # new_stage;
    });

    new_token_id;
  };

  // Return the full upgrade history for a plant (ordered oldest-first)
  public func getUpgradeHistory(
    upgradeEvents : Map.Map<Common.PlantId, List.List<ClaimTypes.LifecycleUpgradeEvent>>,
    plant_id : Common.PlantId,
  ) : [ClaimTypes.LifecycleUpgradeEvent] {
    switch (upgradeEvents.get(plant_id)) {
      case (?evts) evts.toArray();
      case null [];
    };
  };

  // --- helpers ---

  func stageToText(stage : PlantTypes.PlantStage) : Text {
    switch stage {
      case (#Seed) "Seed";
      case (#Seedling) "Seedling";
      case (#Mature) "Mature";
    };
  };

  func textToStage(s : Text) : PlantTypes.PlantStage {
    if (s == "Seedling") #Seedling
    else if (s == "Mature") #Mature
    else #Seed;
  };
};
