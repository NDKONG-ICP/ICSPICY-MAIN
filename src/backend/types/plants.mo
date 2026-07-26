import Common "common";
import DashTypes "nims-dashboard";

module {
  public type PlantStage = {
    #Seed;
    #Seedling;
    #Mature;
  };

  public type NFTStandard = {
    #ICRC37;
    #Hedera;
    #EXT; // Entrepot Token eXtension — backward compatibility with older wallets
  };

  public type ContainerSize = {
    // Legacy variants — kept for backward compatibility with existing data
    #Oz16;
    #Gal1;
    #Gal3;
    #Gal5;
    // Current variants
    #Cell72;       // 72 cell tray
    #Cell128;      // 128 cell tray
    #Pot4Inch;     // 4 inch pot
    #Pot6Inch;     // 6 inch pot
    #Gal1New;      // 1 gallon
    #Gal3New;      // 3 gallon
    #Gal5Bucket;   // 5 gallon Bucket
    #Gal5GrowBag;  // 5 gallon grow bag
    #Gal7Pot;      // 7 gallon Pot
    #Gal7GrowBag;  // 7 gallon grow bag
    #Gal10GrowBag; // 10 gallon grow bag
    #Gal15GrowBag; // 15 gallon grow bag
    #InGround;     // In ground crops
    #Other : Text; // User-specified
  };

  public type Plant = {
    id : Common.PlantId;
    variety : Text;
    var genetics : Text;
    tray_id : Common.TrayId;
    cell_position : Nat; // 1-72
    planting_date : Common.Timestamp;
    var germination_date : ?Common.Timestamp;
    var transplant_date : ?Common.Timestamp;
    var stage : PlantStage;
    var nft_id : ?Text;
    nft_standard : NFTStandard;
    var sold : Bool;
    var sold_to : ?Principal;
    var notes : Text;
    var photos : [Text]; // object storage keys
    // NIMS extended fields
    var common_name : ?Text;
    var latin_name : ?Text;
    var origin : ?Text;
    var watering_schedule : ?Text;
    var pest_notes : ?Text;
    var additional_notes : ?Text;
    var is_cooked : Bool;
    var is_transplanted : Bool;
    var container_size : ?ContainerSize;
    var for_sale : Bool;
    var photo_keys : [Text]; // progress photo object-storage keys
    var transplant_plant_id : ?Common.PlantId;
    source_plant_id : ?Common.PlantId;
    created_by : Principal; // owner of this plant record
  };

  public type PlantPublic = {
    id : Common.PlantId;
    variety : Text;
    genetics : Text;
    tray_id : Common.TrayId;
    cell_position : Nat;
    planting_date : Common.Timestamp;
    germination_date : ?Common.Timestamp;
    transplant_date : ?Common.Timestamp;
    stage : PlantStage;
    nft_id : ?Text;
    nft_standard : NFTStandard;
    sold : Bool;
    sold_to : ?Principal;
    notes : Text;
    photos : [Text];
    common_name : ?Text;
    latin_name : ?Text;
    origin : ?Text;
    watering_schedule : ?Text;
    pest_notes : ?Text;
    additional_notes : ?Text;
    is_cooked : Bool;
    is_transplanted : Bool;
    container_size : ?ContainerSize;
    for_sale : Bool;
    photo_keys : [Text];
    transplant_plant_id : ?Common.PlantId;
    source_plant_id : ?Common.PlantId;
    created_by : Principal;
  };

  public type CreatePlantInput = {
    variety : Text;
    genetics : Text;
    tray_id : Common.TrayId;
    cell_position : Nat;
    planting_date : Common.Timestamp;
    date_purchased : ?Common.Timestamp; // optional; defaults to current time if null
    nft_standard : NFTStandard;
    notes : Text;
    common_name : ?Text;
    latin_name : ?Text;
    origin : ?Text;
    watering_schedule : ?Text;
    pest_notes : ?Text;
    additional_notes : ?Text;
    container_size : ?ContainerSize; // container at creation time (optional)
    source_plant_id : ?Common.PlantId;
  };

  public type UpdatePlantMetadataInput = {
    plant_id : Common.PlantId;
    notes : ?Text;
    photos : ?[Text];
    genetics : ?Text;
  };

  public type UpdateCellDataInput = {
    plant_id : Common.PlantId;
    common_name : ?Text;
    latin_name : ?Text;
    origin : ?Text;
    watering_schedule : ?Text;
    pest_notes : ?Text;
    additional_notes : ?Text;
    notes : ?Text; // Nutrient Feeding Schedule notes
  };

  public type TransplantInput = {
    plant_id : Common.PlantId;
    container_size : ContainerSize;
  };

  public type AddPhotoInput = {
    plant_id : Common.PlantId;
    photo_key : Text;
  };

  public type StageHistory = {
    stage : PlantStage;
    timestamp : Common.Timestamp;
    notes : Text;
  };

  public type PlantTimeline = {
    plant : PlantPublic;
    stage_history : [StageHistory];
    feedings : [FeedingPublic];
  };

  public type Tray = {
    id : Common.TrayId;
    var name : Text;
    planting_date : Common.Timestamp;
    cell_count : Nat; // always 72
    var cells : [?Common.PlantId]; // length 72
    nft_standard : NFTStandard;
    var sort_order : Nat;       // user-defined zone ordering
    var zone_notes : Text;       // freeform zone-level notes
    var zone_photo_keys : [Text]; // object-storage photo keys for the zone
  };

  public type TrayPublic = {
    id : Common.TrayId;
    name : Text;
    planting_date : Common.Timestamp;
    cell_count : Nat;
    cells : [?Common.PlantId];
    nft_standard : NFTStandard;
    sort_order : Nat;
    zone_notes : Text;
    zone_photo_keys : [Text];
    creator : Principal;
  };

  public type CreateTrayInput = {
    name : Text;
    planting_date : Common.Timestamp;
    nft_standard : NFTStandard;
  };

  public type Feeding = {
    id : Common.FeedingId;
    plant_id : Common.PlantId;
    date : Common.Timestamp;
    product_name : Text;
    nutrient_type : Text;
    dosage_amount : Text;
    var notes : ?Text;
  };

  public type FeedingPublic = {
    id : Common.FeedingId;
    plant_id : Common.PlantId;
    date : Common.Timestamp;
    product_name : Text;
    nutrient_type : Text;
    dosage_amount : Text;
    notes : ?Text;
  };

  public type AddFeedingInput = {
    plant_id : Common.PlantId;
    date : Common.Timestamp;
    product_name : Text;
    nutrient_type : Text;
    dosage_amount : Text;
    notes : ?Text;
  };

  public type WeatherRecord = {
    id : Common.WeatherRecordId;
    user : Principal;
    date : Text;
    latitude : Float;
    longitude : Float;
    temperature_max : Float;
    temperature_min : Float;
    precipitation : Float;
    humidity : ?Float;
    wind_speed : ?Float;
    recorded_at : Common.Timestamp;
  };

  public type AddWeatherRecordInput = {
    date : Text;
    latitude : Float;
    longitude : Float;
    temperature_max : Float;
    temperature_min : Float;
    precipitation : Float;
    humidity : ?Float;
    wind_speed : ?Float;
  };

  public type ArtworkLayer = {
    id : Common.ArtworkLayerId;
    name : Text;
    object_key : Text;
    layer_number : Nat;
    uploaded_at : Common.Timestamp;
  };

  // RWA Provenance NFT metadata (full lifecycle, stored in canister state)
  public type RWATokenMetadata = {
    token_id : Text;
    name : Text;
    description : Text;
    image_key : Text;
    attributes : [(Text, Text)];
    owner : ?Principal;
    minted_at : Common.Timestamp;
    rarity_tier : Nat; // 10 = Common, 12 = Uncommon, 15 = Rare
  };

  public type MintRWAProvenanceInput = {
    plant_id : Common.PlantId;
    artwork_layer_id : Common.ArtworkLayerId;
    custom_notes : Text;
    rarity_tier : Nat; // 10, 12, or 15
  };

  // ── Phase 6 NIMS lifecycle types (stored in side maps) ─────────────────────

  public type PlantNote = {
    timestamp : Common.Timestamp;
    author : Principal;
    text : Text;
  };

  public type WateringEntry = {
    timestamp : Common.Timestamp;
    author : Principal;
    amountMl : Nat;
    phLevel : ?Float;
    notes : ?Text;
  };

  public type PestEntry = {
    timestamp : Common.Timestamp;
    author : Principal;
    pestName : Text;
    severity : Text;
    treatment : ?Text;
    notes : ?Text;
  };

  public type PlantPhotoEntry = {
    timestamp : Common.Timestamp;
    author : Principal;
    url : Text;
    caption : ?Text;
  };

  public type WeatherSnapshot = {
    date : Text;
    tempHighF : Float;
    tempLowF : Float;
    humidity : Float;
    rainfallInches : Float;
    uvIndex : Float;
    source : Text;
  };

  public type PlantDeathRecord = {
    died_at : Common.Timestamp;
    cause : DashTypes.DeathCause;
    notes : ?Text;
  };

  public type PlantLifecycle = {
    plant : PlantPublic;
    varietyId : ?Nat;
    nftTokenId : ?Nat;
    priceCents : ?Nat;
    soldAt : ?Common.Timestamp;
    notes : [PlantNote];
    feedingLog : [FeedingPublic];
    wateringLog : [WateringEntry];
    pestLog : [PestEntry];
    photos : [PlantPhotoEntry];
    weatherSnapshots : [WeatherSnapshot];
    deathRecord : ?PlantDeathRecord;
  };

  public type PlantCountStats = {
    total : Nat;
    forSale : Nat;
    sold : Nat;
    byStage : [(PlantStage, Nat)];
  };

  public type AddPlantResult = {
    plantId : Common.PlantId;
    nftTokenId : Nat;
    claimToken : Text;
  };

  public type PurchasePlantResult = {
    success : Bool;
    nftTokenId : ?Nat;
    claimToken : ?Common.ClaimTokenId;
    message : Text;
  };

  // ── Tray batch registration (registerPlant / registerPlantBatch) ───────────

  /// Per-cell overrides — rare cells that differ from sharedData.
  public type RegisterPlantCellOverrides = {
    variety_id : ?Nat;
    genetics : ?Text;
    notes : ?Text;
    common_name : ?Text;
    latin_name : ?Text;
    origin : ?Text;
    container_size : ?ContainerSize;
    planting_date : ?Common.Timestamp;
  };

  /// Common fields applied to every cell in a batch (or single registerPlant call).
  public type RegisterPlantSharedData = {
    tray_id : Common.TrayId;
    variety_id : Nat;
    container_size : ?ContainerSize;
    origin : ?Text;
    planting_date : ?Common.Timestamp;
    notes : Text;
    genetics : Text;
    common_name : ?Text;
    latin_name : ?Text;
  };

  public type RegisterPlantCellInput = {
    cell_index : Nat;
    overrides : ?RegisterPlantCellOverrides;
  };

  public type RegisterPlantCellOutcome = {
    #ok : { plant_id : Common.PlantId };
    #err : Text;
    #skipped : Text;
  };

  public type RegisterPlantCellResult = {
    cell_index : Nat;
    outcome : RegisterPlantCellOutcome;
  };

  public type RegisterPlantResult = {
    plant_id : Common.PlantId;
  };

  public type RegisterPlantBatchResult = {
    tray_id : Common.TrayId;
    results : [RegisterPlantCellResult];
    succeeded : Nat;
    failed : Nat;
    skipped : Nat;
  };

  // ── Germination (assign PepperHead from plant pool) ────────────────────────

  public type GerminatePlantOutcome = {
    #assigned : { token_id : Nat };
    #awaiting_nft;
    #already_assigned : { token_id : Nat };
  };

  public type GerminatePlantResult = {
    plant_id : Common.PlantId;
    outcome : GerminatePlantOutcome;
  };

  public type GerminatePlantBatchResult = {
    results : [GerminatePlantResult];
    assigned_count : Nat;
    awaiting_count : Nat;
    already_assigned_count : Nat;
    failed_count : Nat;
  };

  public type PlantAwaitingNft = {
    plant_id : Common.PlantId;
    tray_id : ?Common.TrayId;
    cell_position : ?Nat;
    variety : Text;
    germination_date : Common.Timestamp;
    owner : Principal;
  };

  public type PlantPoolStatus = {
    available : Nat;
    theoretical_ceiling : Nat;
  };
};
