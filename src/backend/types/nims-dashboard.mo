import Common "common";
import Principal "mo:core/Principal";

module {
  public type CellStatus = {
    #Empty;
    #Planted;
    #Germinated;
    #Dead;
    #Transplanted;
  };

  public type TrayCellPublic = {
    position : Nat;
    status : CellStatus;
    plantId : ?Common.PlantId;
    varietyName : ?Text;
    plantedAt : ?Common.Timestamp;
    germinatedAt : ?Common.Timestamp;
    nftTokenId : ?Nat;
    daysSincePlanted : ?Nat;
    /** Inventory plant after tray transplant (for blue cell links). */
    inventoryPlantId : ?Common.PlantId;
    containerLabel : ?Text;
  };

  public type ActivityEntry = {
    timestamp : Common.Timestamp;
    plantId : Common.PlantId;
    plantName : Text;
    actionType : Text;
    detail : Text;
    author : Principal;
  };

  public type PlantHealth = {
    lastWatered : ?Common.Timestamp;
    lastFed : ?Common.Timestamp;
    daysSinceWater : ?Nat;
    daysSinceFeed : ?Nat;
    healthScore : Nat;
    needsAttention : Bool;
  };

  public type WeatherContext = {
    tempF : Float;
    humidity : Float;
    uvIndex : Float;
    recentRainInches : Float;
    moonPhase : Text;
    airQuality : ?Nat;
  };

  public type DeathCause = {
    #DampingOff;
    #PestDamage;
    #Drought;
    #Disease;
    #Overwatering;
    #Unknown;
    #Other;
  };

  public type PlantSeedResult = {
    plantId : Common.PlantId;
  };

  public type DashboardStats = {
    totalPlants : Nat;
    germinatedToday : Nat;
    needsAttention : Nat;
    lastWateredMsAgo : ?Nat;
  };

};
