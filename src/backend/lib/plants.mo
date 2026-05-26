import Common "../types/common";
import Types "../types/plants";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Prim "mo:⛔";

module {
  public func createTray(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    nextId : Nat,
    input : Types.CreateTrayInput,
  ) : Types.Tray {
    let tray : Types.Tray = {
      id = nextId;
      var name = input.name;
      planting_date = input.planting_date;
      cell_count = 72;
      var cells = Array.repeat<?Common.PlantId>(null, 72);
      nft_standard = input.nft_standard;
      var sort_order = 0;
      var zone_notes = "";
      var zone_photo_keys = [];
    };
    trays.add(nextId, tray);
    tray;
  };

  public func updateTrayName(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    caller : Principal,
    trayOwners : Map.Map<Common.TrayId, Principal>,
    adminCheck : Principal -> Bool,
    tray_id : Common.TrayId,
    new_name : Text,
  ) : () {
    switch (trays.get(tray_id)) {
      case (?tray) {
        let ownerOk = switch (trayOwners.get(tray_id)) {
          case (?owner) { owner == caller or adminCheck(caller) };
          case null { adminCheck(caller) };
        };
        if (not ownerOk) { Runtime.trap("Unauthorized: must be tray owner or admin") };
        tray.name := new_name;
      };
      case null { Runtime.trap("Tray not found") };
    };
  };

  public func updateTrayOrder(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    caller : Principal,
    trayOwners : Map.Map<Common.TrayId, Principal>,
    adminCheck : Principal -> Bool,
    tray_id : Common.TrayId,
    new_order : Nat,
  ) : () {
    switch (trays.get(tray_id)) {
      case (?tray) {
        let ownerOk = switch (trayOwners.get(tray_id)) {
          case (?owner) { owner == caller or adminCheck(caller) };
          case null { adminCheck(caller) };
        };
        if (not ownerOk) { Runtime.trap("Unauthorized: must be tray owner or admin") };
        tray.sort_order := new_order;
      };
      case null { Runtime.trap("Tray not found") };
    };
  };

  public func updateZoneNotes(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    caller : Principal,
    trayOwners : Map.Map<Common.TrayId, Principal>,
    adminCheck : Principal -> Bool,
    tray_id : Common.TrayId,
    notes : Text,
  ) : () {
    switch (trays.get(tray_id)) {
      case (?tray) {
        let ownerOk = switch (trayOwners.get(tray_id)) {
          case (?owner) { owner == caller or adminCheck(caller) };
          case null { adminCheck(caller) };
        };
        if (not ownerOk) { Runtime.trap("Unauthorized: must be tray owner or admin") };
        tray.zone_notes := notes;
      };
      case null { Runtime.trap("Tray not found") };
    };
  };

  public func addZonePhoto(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    caller : Principal,
    trayOwners : Map.Map<Common.TrayId, Principal>,
    adminCheck : Principal -> Bool,
    tray_id : Common.TrayId,
    photo_key : Text,
  ) : () {
    switch (trays.get(tray_id)) {
      case (?tray) {
        let ownerOk = switch (trayOwners.get(tray_id)) {
          case (?owner) { owner == caller or adminCheck(caller) };
          case null { adminCheck(caller) };
        };
        if (not ownerOk) { Runtime.trap("Unauthorized: must be tray owner or admin") };
        tray.zone_photo_keys := tray.zone_photo_keys.concat([photo_key]);
      };
      case null { Runtime.trap("Tray not found") };
    };
  };

  public func removeZonePhoto(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    caller : Principal,
    trayOwners : Map.Map<Common.TrayId, Principal>,
    adminCheck : Principal -> Bool,
    tray_id : Common.TrayId,
    photo_key : Text,
  ) : () {
    switch (trays.get(tray_id)) {
      case (?tray) {
        let ownerOk = switch (trayOwners.get(tray_id)) {
          case (?owner) { owner == caller or adminCheck(caller) };
          case null { adminCheck(caller) };
        };
        if (not ownerOk) { Runtime.trap("Unauthorized: must be tray owner or admin") };
        tray.zone_photo_keys := tray.zone_photo_keys.filter(func(k : Text) : Bool { k != photo_key });
      };
      case null { Runtime.trap("Tray not found") };
    };
  };

  public func deleteTray(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    plants : Map.Map<Common.PlantId, Types.Plant>,
    caller : Principal,
    trayOwners : Map.Map<Common.TrayId, Principal>,
    adminCheck : Principal -> Bool,
    tray_id : Common.TrayId,
  ) : () {
    switch (trays.get(tray_id)) {
      case (?_tray) {
        let ownerOk = switch (trayOwners.get(tray_id)) {
          case (?owner) { owner == caller or adminCheck(caller) };
          case null { adminCheck(caller) };
        };
        if (not ownerOk) { Runtime.trap("Unauthorized: must be tray owner or admin") };
        // Check no active (non-transplanted, non-cooked) plants remain
        let hasActive = plants.values().any(func(p : Types.Plant) : Bool {
          p.tray_id == tray_id and not p.is_transplanted and not p.is_cooked
        });
        if (hasActive) {
          Runtime.trap("Cannot delete tray with active plants");
        };
        trays.remove(tray_id);
      };
      case null { Runtime.trap("Tray not found") };
    };
  };

  public func createPlant(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    trays : Map.Map<Common.TrayId, Types.Tray>,
    stageHistory : Map.Map<Common.PlantId, List.List<Types.StageHistory>>,
    nextId : Nat,
    input : Types.CreatePlantInput,
    created_by : Principal,
  ) : Types.Plant {
    let now = Time.now();
    let purchasedAt = switch (input.date_purchased) {
      case (?d) d;
      case null now;
    };
    let plant : Types.Plant = {
      id = nextId;
      variety = input.variety;
      var genetics = input.genetics;
      tray_id = input.tray_id;
      cell_position = input.cell_position;
      planting_date = input.planting_date;
      var germination_date = null;
      var transplant_date = null;
      var stage = #Seed;
      var nft_id = null;
      nft_standard = input.nft_standard;
      var sold = false;
      var sold_to = null;
      var notes = input.notes;
      var photos = [];
      var common_name = input.common_name;
      var latin_name = input.latin_name;
      var origin = input.origin;
      var watering_schedule = input.watering_schedule;
      var pest_notes = input.pest_notes;
      var additional_notes = input.additional_notes;
      var is_cooked = false;
      var is_transplanted = false;
      var container_size = input.container_size;
      var for_sale = false;
      var photo_keys = [];
      var transplant_plant_id = null;
      source_plant_id = input.source_plant_id;
      created_by = created_by;
    };
    plants.add(nextId, plant);
    // Register initial stage history
    let history = List.empty<Types.StageHistory>();
    history.add({
      stage = #Seed;
      timestamp = purchasedAt;
      notes = "Planted/Purchased";
    });
    stageHistory.add(nextId, history);
    // Update tray cell
    switch (trays.get(input.tray_id)) {
      case (?tray) {
        let pos = input.cell_position;
        if (pos >= 1 and pos <= 72) {
          let newCells = tray.cells.toVarArray<?Common.PlantId>();
          newCells[pos - 1] := ?nextId;
          tray.cells := Prim.Array_tabulate<?Common.PlantId>(newCells.size(), func(i : Nat) { newCells[i] });
        };
      };
      case null {};
    };
    plant;
  };

  public func updateCellData(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    caller : Principal,
    adminCheck : Principal -> Bool,
    input : Types.UpdateCellDataInput,
  ) : () {
    switch (plants.get(input.plant_id)) {
      case (?plant) {
        if (not adminCheck(caller) and plant.created_by != caller) {
          Runtime.trap("Unauthorized: must be plant owner or admin");
        };
        switch (input.common_name) {
          case (?v) { plant.common_name := ?v };
          case null {};
        };
        switch (input.latin_name) {
          case (?v) { plant.latin_name := ?v };
          case null {};
        };
        switch (input.origin) {
          case (?v) { plant.origin := ?v };
          case null {};
        };
        switch (input.watering_schedule) {
          case (?v) { plant.watering_schedule := ?v };
          case null {};
        };
        switch (input.pest_notes) {
          case (?v) { plant.pest_notes := ?v };
          case null {};
        };
        switch (input.additional_notes) {
          case (?v) { plant.additional_notes := ?v };
          case null {};
        };
        switch (input.notes) {
          case (?v) { plant.additional_notes := ?v };
          case null {};
        };
      };
      case null { Runtime.trap("Plant not found") };
    };
  };

  public func toggleCooked(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    caller : Principal,
    adminCheck : Principal -> Bool,
    plant_id : Common.PlantId,
  ) : () {
    switch (plants.get(plant_id)) {
      case (?plant) {
        if (not adminCheck(caller) and plant.created_by != caller) {
          Runtime.trap("Unauthorized: must be plant owner or admin");
        };
        plant.is_cooked := not plant.is_cooked;
      };
      case null { Runtime.trap("Plant not found") };
    };
  };

  public func transplantCell(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    _trays : Map.Map<Common.TrayId, Types.Tray>,
    stageHistory : Map.Map<Common.PlantId, List.List<Types.StageHistory>>,
    caller : Principal,
    adminCheck : Principal -> Bool,
    input : Types.TransplantInput,
  ) : Types.Plant {
    let sourcePlant = switch (plants.get(input.plant_id)) {
      case (?p) p;
      case null { Runtime.trap("Plant not found") };
    };
    if (not adminCheck(caller) and sourcePlant.created_by != caller) {
      Runtime.trap("Unauthorized: must be plant owner or admin");
    };
    if (sourcePlant.is_transplanted) {
      Runtime.trap("Plant already transplanted");
    };
    let now = Time.now();
    let fromLabel = switch (sourcePlant.container_size) {
      case (?c) containerSizeText(c);
      case null "tray";
    };
    let toLabel = containerSizeText(input.container_size);
    let noteText = "Transplanted from " # fromLabel # " to " # toLabel;

    sourcePlant.is_transplanted := true;
    sourcePlant.transplant_date := ?now;
    sourcePlant.stage := #Seedling;
    sourcePlant.container_size := ?input.container_size;
    sourcePlant.transplant_plant_id := null;

    let history = switch (stageHistory.get(input.plant_id)) {
      case (?h) h;
      case null {
        let h = List.empty<Types.StageHistory>();
        stageHistory.add(input.plant_id, h);
        h;
      };
    };
    history.add({ stage = #Seedling; timestamp = now; notes = noteText });
    sourcePlant;
  };

  public func addWeatherRecord(
    weatherRecords : Map.Map<Common.WeatherRecordId, Types.WeatherRecord>,
    weatherIndex : Map.Map<Text, Common.WeatherRecordId>,
    nextId : Nat,
    caller : Principal,
    input : Types.AddWeatherRecordInput,
  ) : Types.WeatherRecord {
    // Deduplicate by (principal, date)
    let dedupeKey = caller.toText() # "_" # input.date;
    switch (weatherIndex.get(dedupeKey)) {
      case (?existingId) {
        // Update existing record
        switch (weatherRecords.get(existingId)) {
          case (?rec) rec;
          case null { Runtime.trap("Weather record index inconsistency") };
        };
      };
      case null {
        let record : Types.WeatherRecord = {
          id = nextId;
          user = caller;
          date = input.date;
          latitude = input.latitude;
          longitude = input.longitude;
          temperature_max = input.temperature_max;
          temperature_min = input.temperature_min;
          precipitation = input.precipitation;
          humidity = input.humidity;
          wind_speed = input.wind_speed;
          recorded_at = Time.now();
        };
        weatherRecords.add(nextId, record);
        weatherIndex.add(dedupeKey, nextId);
        record;
      };
    };
  };

  public func getWeatherRecords(
    weatherRecords : Map.Map<Common.WeatherRecordId, Types.WeatherRecord>,
    caller : Principal,
    limit : Nat,
  ) : [Types.WeatherRecord] {
    let userRecords = weatherRecords.values()
      .filter(func(r : Types.WeatherRecord) : Bool { r.user == caller })
      .toArray();
    // Return latest N records (sort by recorded_at descending)
    let sorted = userRecords.sort(func(a : Types.WeatherRecord, b : Types.WeatherRecord) : { #less; #equal; #greater } {
      if (a.recorded_at > b.recorded_at) #less
      else if (a.recorded_at < b.recorded_at) #greater
      else #equal
    });
    if (limit >= sorted.size()) sorted
    else sorted.sliceToArray(0, limit.toInt());
  };

  public func addPlantPhoto(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    caller : Principal,
    adminCheck : Principal -> Bool,
    plant_id : Common.PlantId,
    photo_key : Text,
  ) : () {
    switch (plants.get(plant_id)) {
      case (?plant) {
        if (not adminCheck(caller) and plant.created_by != caller) {
          Runtime.trap("Unauthorized: must be plant owner or admin");
        };
        plant.photo_keys := plant.photo_keys.concat([photo_key]);
      };
      case null { Runtime.trap("Plant not found") };
    };
  };

  public func removePlantPhoto(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    caller : Principal,
    adminCheck : Principal -> Bool,
    plant_id : Common.PlantId,
    photo_key : Text,
  ) : () {
    switch (plants.get(plant_id)) {
      case (?plant) {
        if (not adminCheck(caller) and plant.created_by != caller) {
          Runtime.trap("Unauthorized: must be plant owner or admin");
        };
        plant.photo_keys := plant.photo_keys.filter(func(k : Text) : Bool { k != photo_key });
      };
      case null { Runtime.trap("Plant not found") };
    };
  };

  public func setForSale(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    plant_id : Common.PlantId,
    for_sale : Bool,
  ) : () {
    switch (plants.get(plant_id)) {
      case (?plant) { plant.for_sale := for_sale };
      case null { Runtime.trap("Plant not found") };
    };
  };

  public func getForSalePlants(
    plants : Map.Map<Common.PlantId, Types.Plant>,
  ) : [Types.PlantPublic] {
    plants.values()
      .filter(func(p : Types.Plant) : Bool { p.for_sale })
      .map(toPublic)
      .toArray();
  };

  public func addArtworkLayer(
    artworkLayers : Map.Map<Common.ArtworkLayerId, Types.ArtworkLayer>,
    nextId : Nat,
    name : Text,
    object_key : Text,
    layer_number : Nat,
  ) : Types.ArtworkLayer {
    let layer : Types.ArtworkLayer = {
      id = nextId;
      name = name;
      object_key = object_key;
      layer_number = layer_number;
      uploaded_at = Time.now();
    };
    artworkLayers.add(nextId, layer);
    layer;
  };

  public func listArtworkLayers(
    artworkLayers : Map.Map<Common.ArtworkLayerId, Types.ArtworkLayer>,
  ) : [Types.ArtworkLayer] {
    artworkLayers.values().toArray();
  };

  public func mintRWAProvenance(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    stageHistory : Map.Map<Common.PlantId, List.List<Types.StageHistory>>,
    weatherRecords : Map.Map<Common.WeatherRecordId, Types.WeatherRecord>,
    artworkLayers : Map.Map<Common.ArtworkLayerId, Types.ArtworkLayer>,
    rwaTokens : Map.Map<Text, Types.RWATokenMetadata>,
    input : Types.MintRWAProvenanceInput,
    now : Common.Timestamp,
  ) : Text {
    let plant = switch (plants.get(input.plant_id)) {
      case (?p) p;
      case null { Runtime.trap("Plant not found") };
    };
    let artworkLayer = switch (artworkLayers.get(input.artwork_layer_id)) {
      case (?l) l;
      case null { Runtime.trap("Artwork layer not found") };
    };
    let tokenId = "rwa-" # input.plant_id.toText() # "-" # now.toText();

    // Build feeding history metadata
    let feedingHistory = feedings.values()
      .filter(func(f : Types.Feeding) : Bool { f.plant_id == input.plant_id })
      .map(feedingToPublic)
      .toArray();

    // Build weather history for plant owner
    let weatherHistory = weatherRecords.values()
      .filter(func(r : Types.WeatherRecord) : Bool { r.user == plant.created_by })
      .toArray();

    // Get stage history
    let stageHist : [Types.StageHistory] = switch (stageHistory.get(input.plant_id)) {
      case (?h) h.toArray();
      case null [];
    };

    let metadata : Types.RWATokenMetadata = {
      token_id = tokenId;
      name = "RWA Provenance: " # plant.variety;
      description = "IC SPICY RWA NFT — " # plant.variety # " provenance record";
      image_key = artworkLayer.object_key;
      attributes = [
        ("common_name", switch (plant.common_name) { case (?v) v; case null "" }),
        ("latin_name", switch (plant.latin_name) { case (?v) v; case null "" }),
        ("origin", switch (plant.origin) { case (?v) v; case null "" }),
        ("variety", plant.variety),
        ("planting_date", plant.planting_date.toText()),
        ("germination_date", switch (plant.germination_date) { case (?d) d.toText(); case null "" }),
        ("transplant_date", switch (plant.transplant_date) { case (?d) d.toText(); case null "" }),
        ("container_size", switch (plant.container_size) { case (?s) containerSizeText(s); case null "" }),
        ("pest_notes", switch (plant.pest_notes) { case (?v) v; case null "" }),
        ("additional_notes", switch (plant.additional_notes) { case (?v) v; case null "" }),
        ("custom_notes", input.custom_notes),
        ("artwork_layer", artworkLayer.name),
        ("artwork_layer_number", artworkLayer.layer_number.toText()),
        ("feeding_count", feedingHistory.size().toText()),
        ("weather_records", weatherHistory.size().toText()),
        ("stage_history_count", stageHist.size().toText()),
        ("photo_count", plant.photo_keys.size().toText()),
      ];
      owner = ?plant.created_by;
      minted_at = now;
      rarity_tier = input.rarity_tier;
    };
    rwaTokens.add(tokenId, metadata);
    // Associate token with plant
    plant.nft_id := ?tokenId;
    tokenId;
  };

  // --- Existing functions (preserved, with bug fixes) ---

  public func updatePlantStage(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    stageHistory : Map.Map<Common.PlantId, List.List<Types.StageHistory>>,
    plant_id : Common.PlantId,
    new_stage : Types.PlantStage,
    notes : Text,
  ) : () {
    switch (plants.get(plant_id)) {
      case (?plant) {
        plant.stage := new_stage;
        let now = Time.now();
        switch (new_stage) {
          case (#Seedling) { plant.transplant_date := ?now };
          case _ {};
        };
        let history = switch (stageHistory.get(plant_id)) {
          case (?h) h;
          case null {
            let h = List.empty<Types.StageHistory>();
            stageHistory.add(plant_id, h);
            h;
          };
        };
        history.add({
          stage = new_stage;
          timestamp = now;
          notes = notes;
        });
      };
      case null { Runtime.trap("Plant not found") };
    };
  };

  public func updatePlantMetadata(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    input : Types.UpdatePlantMetadataInput,
  ) : () {
    switch (plants.get(input.plant_id)) {
      case (?plant) {
        switch (input.notes) {
          case (?n) { plant.notes := n };
          case null {};
        };
        switch (input.photos) {
          case (?p) { plant.photos := p };
          case null {};
        };
        switch (input.genetics) {
          case (?g) { plant.genetics := g };
          case null {};
        };
      };
      case null { Runtime.trap("Plant not found") };
    };
  };

  public func markPlantGerminated(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    plant_id : Common.PlantId,
    germination_date : Common.Timestamp,
  ) : () {
    switch (plants.get(plant_id)) {
      case (?plant) {
        plant.germination_date := ?germination_date;
      };
      case null { Runtime.trap("Plant not found") };
    };
  };

  public func setPlantNFT(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    plant_id : Common.PlantId,
    nft_id : Text,
  ) : () {
    switch (plants.get(plant_id)) {
      case (?plant) {
        plant.nft_id := ?nft_id;
      };
      case null { Runtime.trap("Plant not found") };
    };
  };

  public func addFeedingRecord(
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    nextId : Nat,
    input : Types.AddFeedingInput,
  ) : Types.Feeding {
    let feeding : Types.Feeding = {
      id = nextId;
      plant_id = input.plant_id;
      date = input.date;
      product_name = input.product_name;
      nutrient_type = input.nutrient_type;
      dosage_amount = input.dosage_amount;
      var notes = input.notes;
    };
    feedings.add(nextId, feeding);
    feeding;
  };

  public func getPlant(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    plant_id : Common.PlantId,
  ) : ?Types.PlantPublic {
    switch (plants.get(plant_id)) {
      case (?plant) { ?toPublic(plant) };
      case null { null };
    };
  };

  public func listPlants(
    plants : Map.Map<Common.PlantId, Types.Plant>,
  ) : [Types.PlantPublic] {
    plants.values().map(toPublic).toArray();
  };

  public func listPlantsByStage(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    stage : Types.PlantStage,
  ) : [Types.PlantPublic] {
    plants.values().filter(func(p : Types.Plant) : Bool { p.stage == stage }).map(toPublic).toArray();
  };

  public func listMyPlants(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    caller : Principal,
  ) : [Types.PlantPublic] {
    plants.values().filter(func(p : Types.Plant) : Bool { p.created_by == caller }).map(toPublic).toArray();
  };

  public func getTray(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    trayOwners : Map.Map<Common.TrayId, Principal>,
    tray_id : Common.TrayId,
  ) : ?Types.TrayPublic {
    switch (trays.get(tray_id)) {
      case (?tray) {
        let creator = switch (trayOwners.get(tray_id)) {
          case (?o) o;
          case null Principal.fromText("aaaaa-aa");
        };
        ?trayToPublic(tray, creator);
      };
      case null { null };
    };
  };

  public func listTrays(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    trayOwners : Map.Map<Common.TrayId, Principal>,
  ) : [Types.TrayPublic] {
    listTraysWithOwners(trays, trayOwners);
  };

  public func getPlantTimeline(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    stageHistory : Map.Map<Common.PlantId, List.List<Types.StageHistory>>,
    plant_id : Common.PlantId,
  ) : ?Types.PlantTimeline {
    switch (plants.get(plant_id)) {
      case (?plant) {
        let history : [Types.StageHistory] = switch (stageHistory.get(plant_id)) {
          case (?h) { h.toArray() };
          case null { [] };
        };
        let plantFeedingsList = feedings.values().filter(func(f : Types.Feeding) : Bool {
            f.plant_id == plant_id
          }).map(feedingToPublic).toArray();
        ?{
          plant = toPublic(plant);
          stage_history = history;
          feedings = plantFeedingsList;
        };
      };
      case null { null };
    };
  };

  public func toPublic(plant : Types.Plant) : Types.PlantPublic {
    {
      id = plant.id;
      variety = plant.variety;
      genetics = plant.genetics;
      tray_id = plant.tray_id;
      cell_position = plant.cell_position;
      planting_date = plant.planting_date;
      germination_date = plant.germination_date;
      transplant_date = plant.transplant_date;
      stage = plant.stage;
      nft_id = plant.nft_id;
      nft_standard = plant.nft_standard;
      sold = plant.sold;
      sold_to = plant.sold_to;
      notes = plant.notes;
      photos = plant.photos;
      common_name = plant.common_name;
      latin_name = plant.latin_name;
      origin = plant.origin;
      watering_schedule = plant.watering_schedule;
      pest_notes = plant.pest_notes;
      additional_notes = plant.additional_notes;
      is_cooked = plant.is_cooked;
      is_transplanted = plant.is_transplanted;
      container_size = plant.container_size;
      for_sale = plant.for_sale;
      photo_keys = plant.photo_keys;
      transplant_plant_id = plant.transplant_plant_id;
      source_plant_id = plant.source_plant_id;
      created_by = plant.created_by;
    };
  };

  public func trayToPublic(tray : Types.Tray, creator : Principal) : Types.TrayPublic {
    {
      id = tray.id;
      name = tray.name;
      planting_date = tray.planting_date;
      cell_count = tray.cell_count;
      cells = tray.cells;
      nft_standard = tray.nft_standard;
      sort_order = tray.sort_order;
      zone_notes = tray.zone_notes;
      zone_photo_keys = tray.zone_photo_keys;
      creator = creator;
    };
  };

  public func listTraysWithOwners(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    trayOwners : Map.Map<Common.TrayId, Principal>,
  ) : [Types.TrayPublic] {
    trays.entries().map<(Common.TrayId, Types.Tray), Types.TrayPublic>(func((id, tray)) {
      let creator = switch (trayOwners.get(id)) {
        case (?o) o;
        case null Principal.fromText("aaaaa-aa");
      };
      trayToPublic(tray, creator);
    }).toArray();
  };

  public func listTraysForOwner(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    trayOwners : Map.Map<Common.TrayId, Principal>,
    owner : Principal,
  ) : [Types.TrayPublic] {
    var out : [Types.TrayPublic] = [];
    for ((id, trayOwner) in trayOwners.entries()) {
      if (trayOwner == owner) {
        switch (trays.get(id)) {
          case (?tray) { out := Array.concat(out, [trayToPublic(tray, trayOwner)]) };
          case null {};
        };
      };
    };
    out;
  };

  public func feedingToPublic(feeding : Types.Feeding) : Types.FeedingPublic {
    {
      id = feeding.id;
      plant_id = feeding.plant_id;
      date = feeding.date;
      product_name = feeding.product_name;
      nutrient_type = feeding.nutrient_type;
      dosage_amount = feeding.dosage_amount;
      notes = feeding.notes;
    };
  };

  public func containerSizeText(s : Types.ContainerSize) : Text {
    switch (s) {
      case (#Oz16) "16oz";
      case (#Gal1) "1 Gallon (legacy)";
      case (#Gal3) "3 Gallon (legacy)";
      case (#Gal5) "5 Gallon (legacy)";
      case (#Cell72) "72 Cell Tray";
      case (#Cell128) "128 Cell Tray";
      case (#Pot4Inch) "4 Inch Pot";
      case (#Pot6Inch) "6 Inch Pot";
      case (#Gal1New) "1 Gallon";
      case (#Gal3New) "3 Gallon";
      case (#Gal5Bucket) "5 Gallon (Bucket)";
      case (#Gal5GrowBag) "5 Gallon (Grow Bag)";
      case (#Gal7Pot) "7 Gallon Pot";
      case (#Gal7GrowBag) "7 Gallon Grow Bag";
      case (#Gal10GrowBag) "10 Gallon Grow Bag";
      case (#Gal15GrowBag) "15 Gallon Grow Bag";
      case (#InGround) "In Ground";
      case (#Other t) "Other: " # t;
    };
  };
};
