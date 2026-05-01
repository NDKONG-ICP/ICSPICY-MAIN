import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import PlantTypes "../types/plants";
import PlantsLib "../lib/plants";

mixin (
  accessControlState : AccessControl.AccessControlState,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  trays : Map.Map<Common.TrayId, PlantTypes.Tray>,
  trayOwners : Map.Map<Common.TrayId, Principal>,
  feedings : Map.Map<Common.FeedingId, PlantTypes.Feeding>,
  stageHistory : Map.Map<Common.PlantId, List.List<PlantTypes.StageHistory>>,
  weatherRecords : Map.Map<Common.WeatherRecordId, PlantTypes.WeatherRecord>,
  weatherIndex : Map.Map<Text, Common.WeatherRecordId>,
  artworkLayers : Map.Map<Common.ArtworkLayerId, PlantTypes.ArtworkLayer>,
  rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
  nextPlantId : { var value : Nat },
  nextTrayId : { var value : Nat },
  nextFeedingId : { var value : Nat },
  nextWeatherRecordId : { var value : Nat },
  nextArtworkLayerId : { var value : Nat },
) {

  // Helper: admin check function for passing into lib
  func isAdmin(p : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, p)
  };

  // ── Tray management (all authenticated users) ──────────────────────────────

  // Any authenticated user: create a new 72-cell tray
  public shared ({ caller }) func createTray(input : PlantTypes.CreateTrayInput) : async PlantTypes.TrayPublic {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    let currentId = nextTrayId.value;
    let tray = PlantsLib.createTray(trays, currentId, input);
    trayOwners.add(currentId, caller);
    nextTrayId.value += 1;
    PlantsLib.trayToPublic(tray);
  };

  // Any authenticated user: rename a tray
  public shared ({ caller }) func updateTrayName(tray_id : Common.TrayId, new_name : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    PlantsLib.updateTrayName(trays, tray_id, new_name);
  };

  // Any authenticated user: delete a tray (no active plants)
  public shared ({ caller }) func deleteTray(tray_id : Common.TrayId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    PlantsLib.deleteTray(trays, plants, tray_id);
  };

  // Owner or admin: update the sort order of a zone in the floor plan
  public shared ({ caller }) func updateTrayOrder(tray_id : Common.TrayId, new_order : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    PlantsLib.updateTrayOrder(trays, caller, trayOwners, isAdmin, tray_id, new_order);
  };

  // Owner or admin: set freeform notes on a zone
  public shared ({ caller }) func updateZoneNotes(tray_id : Common.TrayId, notes : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    PlantsLib.updateZoneNotes(trays, caller, trayOwners, isAdmin, tray_id, notes);
  };

  // Owner or admin: attach a photo (object-storage key) to a zone
  public shared ({ caller }) func addZonePhoto(tray_id : Common.TrayId, photo_key : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    PlantsLib.addZonePhoto(trays, caller, trayOwners, isAdmin, tray_id, photo_key);
  };

  // Owner or admin: remove a photo key from a zone
  public shared ({ caller }) func removeZonePhoto(tray_id : Common.TrayId, photo_key : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    PlantsLib.removeZonePhoto(trays, caller, trayOwners, isAdmin, tray_id, photo_key);
  };

  // ── Plant creation (all authenticated users) ───────────────────────────────

  // Any authenticated user: register a new plant in a tray cell
  public shared ({ caller }) func createPlant(input : PlantTypes.CreatePlantInput) : async PlantTypes.PlantPublic {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    let plant = PlantsLib.createPlant(plants, trays, stageHistory, nextPlantId.value, input, caller);
    nextPlantId.value += 1;
    PlantsLib.toPublic(plant);
  };

  // ── NIMS cell data updates (owner or admin) ────────────────────────────────

  // Owner or admin: update cell NIMS data (common/latin name, origin, schedules, notes)
  public shared ({ caller }) func updateCellData(input : PlantTypes.UpdateCellDataInput) : async () {
    PlantsLib.updateCellData(plants, caller, isAdmin, input);
  };

  // Owner or admin: toggle "Cooked" (dead) status for a plant cell
  public shared ({ caller }) func toggleCooked(plant_id : Common.PlantId) : async () {
    PlantsLib.toggleCooked(plants, caller, isAdmin, plant_id);
  };

  // Owner or admin: transplant a cell — marks source inactive, creates new inventory item
  public shared ({ caller }) func transplantCell(input : PlantTypes.TransplantInput) : async PlantTypes.PlantPublic {
    let newPlant = PlantsLib.transplantCell(plants, trays, stageHistory, caller, isAdmin, nextPlantId.value, input);
    nextPlantId.value += 1;
    PlantsLib.toPublic(newPlant);
  };

  // ── Stage management (admin only) ─────────────────────────────────────────

  // Admin: advance plant to next lifecycle stage
  public shared ({ caller }) func updatePlantStage(plant_id : Common.PlantId, new_stage : PlantTypes.PlantStage, notes : Text) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    PlantsLib.updatePlantStage(plants, stageHistory, plant_id, new_stage, notes);
  };

  // Admin: update plant metadata (notes, photos, genetics)
  public shared ({ caller }) func updatePlantMetadata(input : PlantTypes.UpdatePlantMetadataInput) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    PlantsLib.updatePlantMetadata(plants, input);
  };

  // Admin: mark a plant as germinated
  public shared ({ caller }) func markPlantGerminated(plant_id : Common.PlantId, germination_date : Common.Timestamp) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    PlantsLib.markPlantGerminated(plants, plant_id, germination_date);
  };

  // Admin: associate an NFT id with a plant
  public shared ({ caller }) func setPlantNFT(plant_id : Common.PlantId, nft_id : Text) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    PlantsLib.setPlantNFT(plants, plant_id, nft_id);
  };

  // ── Feeding records (admin only) ───────────────────────────────────────────

  // Admin: add a feeding/fertilizer record for a plant
  public shared ({ caller }) func addFeedingRecord(input : PlantTypes.AddFeedingInput) : async PlantTypes.FeedingPublic {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let feeding = PlantsLib.addFeedingRecord(feedings, nextFeedingId.value, input);
    nextFeedingId.value += 1;
    PlantsLib.feedingToPublic(feeding);
  };

  // ── Photo management (owner or admin) ─────────────────────────────────────

  // Owner or admin: add a progress photo key to a plant
  public shared ({ caller }) func addPlantPhoto(plant_id : Common.PlantId, photo_key : Text) : async () {
    PlantsLib.addPlantPhoto(plants, caller, isAdmin, plant_id, photo_key);
  };

  // Owner or admin: remove a progress photo key from a plant
  public shared ({ caller }) func removePlantPhoto(plant_id : Common.PlantId, photo_key : Text) : async () {
    PlantsLib.removePlantPhoto(plants, caller, isAdmin, plant_id, photo_key);
  };

  // ── Shop / marketplace toggle (admin only) ────────────────────────────────

  // Admin: toggle for-sale flag on a plant
  public shared ({ caller }) func setForSale(plant_id : Common.PlantId, for_sale : Bool) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    PlantsLib.setForSale(plants, plant_id, for_sale);
  };

  // ── Weather records (per-user, opt-in) ────────────────────────────────────

  // Any authenticated user: store a weather data point (deduped by date)
  public shared ({ caller }) func addWeatherRecord(input : PlantTypes.AddWeatherRecordInput) : async PlantTypes.WeatherRecord {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    let record = PlantsLib.addWeatherRecord(weatherRecords, weatherIndex, nextWeatherRecordId.value, caller, input);
    // Only increment if a new record was actually created
    if (record.id == nextWeatherRecordId.value) {
      nextWeatherRecordId.value += 1;
    };
    record;
  };

  // Authenticated user: get their own weather records (latest N)
  public shared ({ caller }) func getMyWeatherRecords(limit : Nat) : async [PlantTypes.WeatherRecord] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    PlantsLib.getWeatherRecords(weatherRecords, caller, limit);
  };

  // ── Artwork layers (admin only) ────────────────────────────────────────────

  // Admin: upload/register an artwork layer for RWA NFT compositing
  public shared ({ caller }) func addArtworkLayer(name : Text, object_key : Text, layer_number : Nat) : async PlantTypes.ArtworkLayer {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let layer = PlantsLib.addArtworkLayer(artworkLayers, nextArtworkLayerId.value, name, object_key, layer_number);
    nextArtworkLayerId.value += 1;
    layer;
  };

  // Admin: list all uploaded artwork layers
  public shared ({ caller }) func listArtworkLayers() : async [PlantTypes.ArtworkLayer] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    PlantsLib.listArtworkLayers(artworkLayers);
  };

  // ── RWA Provenance NFT minting (admin only) ────────────────────────────────

  // Admin: mint an ICRC-37 RWA provenance NFT with full lifecycle metadata
  public shared ({ caller }) func mintRWAProvenance(input : PlantTypes.MintRWAProvenanceInput) : async Text {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    PlantsLib.mintRWAProvenance(plants, feedings, stageHistory, weatherRecords, artworkLayers, rwaTokens, input, Time.now());
  };

  // ── Queries ────────────────────────────────────────────────────────────────

  // Public: fetch a single plant by id
  public query func getPlant(plant_id : Common.PlantId) : async ?PlantTypes.PlantPublic {
    PlantsLib.getPlant(plants, plant_id);
  };

  // Public: list all plants
  public query func listPlants() : async [PlantTypes.PlantPublic] {
    PlantsLib.listPlants(plants);
  };

  // Public: list plants filtered by stage
  public query func listPlantsByStage(stage : PlantTypes.PlantStage) : async [PlantTypes.PlantPublic] {
    PlantsLib.listPlantsByStage(plants, stage);
  };

  // Public: get all for-sale plants (marketplace sync)
  public query func getForSalePlants() : async [PlantTypes.PlantPublic] {
    PlantsLib.getForSalePlants(plants);
  };

  // Authenticated: list plants owned by the caller
  public shared ({ caller }) func listMyPlants() : async [PlantTypes.PlantPublic] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Must be authenticated");
    };
    PlantsLib.listMyPlants(plants, caller);
  };

  // Public: fetch a single tray
  public query func getTray(tray_id : Common.TrayId) : async ?PlantTypes.TrayPublic {
    PlantsLib.getTray(trays, tray_id);
  };

  // Public: list all trays
  public query func listTrays() : async [PlantTypes.TrayPublic] {
    PlantsLib.listTrays(trays);
  };

  // Public: get full timeline for a plant (stages + feedings)
  public query func getPlantTimeline(plant_id : Common.PlantId) : async ?PlantTypes.PlantTimeline {
    PlantsLib.getPlantTimeline(plants, feedings, stageHistory, plant_id);
  };
};
