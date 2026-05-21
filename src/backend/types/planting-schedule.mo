import Common "common";
import Principal "mo:core/Principal";

module {
  /// User-scheduled gardening task aligned with UF/IFAS-style almanac actions.
  public type PlantingEventType = {
    #startIndoors;
    #directSow;
    #transplantOutdoors;
    #harvest;
  };

  public type PlantingEvent = {
    id : Nat;
    owner : Principal;
    name : Text;
    event_type : PlantingEventType;
    scheduled_at : Common.Timestamp;
    notes : Text;
    emoji : Text;
    completed : Bool;
    completed_at : ?Common.Timestamp;
    created_at : Common.Timestamp;
  };

  /// Reference row for USDA zone calendars (derived from frontend `planting-almanac` + UF/IFAS FL guidance).
  public type ZoneRecommendation = {
    name : Text;
    event_type : PlantingEventType;
    emoji : Text;
    notes : Text;
  };

  /// One month slice for a hardcoded reference zone calendar.
  public type ZoneSchedule = {
    zone_label : Text;
    month : Nat;
    recommendations : [ZoneRecommendation];
  };

  /// Full 12-month reference calendar returned by `getZoneCalendar`.
  public type ZoneCalendar = {
    zone_label : Text;
    months : [ZoneSchedule];
  };

  public type CreatePlantingEventInput = {
    name : Text;
    event_type : PlantingEventType;
    scheduled_at : Common.Timestamp;
    notes : Text;
    emoji : Text;
  };

  public type UpdatePlantingEventInput = {
    id : Nat;
    name : Text;
    event_type : PlantingEventType;
    scheduled_at : Common.Timestamp;
    notes : Text;
    emoji : Text;
  };
};
