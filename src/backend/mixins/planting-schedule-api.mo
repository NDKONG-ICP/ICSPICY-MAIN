import Map "mo:core/Map";
import Time "mo:core/Time";
import AccessControl "../lib/access-control";
import Common "../types/common";
import PlantingScheduleLib "../lib/planting-schedule";
import Types "../types/planting-schedule";

mixin (
  _accessControlState : AccessControl.AccessControlState,
  plantingEvents : Map.Map<Nat, Types.PlantingEvent>,
  nextPlantingEventId : { var value : Nat },
) {
  /// Public USDA zone primer (supported: 9b, 10a, 10b).
  public query func getZoneSchedule(zone : Text, month : Nat) : async Types.ZoneSchedule {
    PlantingScheduleLib.getZoneSchedule(zone, month);
  };

  public query func getZoneCalendar(zone : Text) : async Types.ZoneCalendar {
    PlantingScheduleLib.getZoneCalendar(zone);
  };

  public shared ({ caller }) func createPlantingEvent(input : Types.CreatePlantingEventInput) : async Types.PlantingEvent {
    AccessControl.requireAuthenticated(caller);
    PlantingScheduleLib.createPlantingEvent(plantingEvents, nextPlantingEventId, caller, input, Time.now());
  };

  public shared ({ caller }) func updatePlantingEvent(input : Types.UpdatePlantingEventInput) : async Types.PlantingEvent {
    AccessControl.requireAuthenticated(caller);
    PlantingScheduleLib.updatePlantingEvent(plantingEvents, caller, input);
  };

  public shared ({ caller }) func deletePlantingEvent(event_id : Nat) : async () {
    AccessControl.requireAuthenticated(caller);
    PlantingScheduleLib.deletePlantingEvent(plantingEvents, caller, event_id);
  };

  public query ({ caller }) func getPlantingEvent(event_id : Nat) : async ?Types.PlantingEvent {
    AccessControl.requireAuthenticated(caller);
    PlantingScheduleLib.getPlantingEventIfOwned(plantingEvents, caller, event_id);
  };

  public query ({ caller }) func getMySchedule(start_date : Common.Timestamp, end_date : Common.Timestamp) : async [
    Types.PlantingEvent
  ] {
    AccessControl.requireAuthenticated(caller);
    PlantingScheduleLib.getMyPlantingSchedule(
      plantingEvents,
      caller,
      start_date,
      end_date,
    );
  };

  public query ({ caller }) func getUpcomingEvents() : async [Types.PlantingEvent] {
    AccessControl.requireAuthenticated(caller);
    PlantingScheduleLib.getUpcomingPlantingEvents(plantingEvents, caller, Time.now());
  };

  public query ({ caller }) func getOverdueEvents() : async [Types.PlantingEvent] {
    AccessControl.requireAuthenticated(caller);
    PlantingScheduleLib.getOverduePlantingEvents(plantingEvents, caller, Time.now());
  };

  public shared ({ caller }) func completeEvent(event_id : Nat) : async Types.PlantingEvent {
    AccessControl.requireAuthenticated(caller);
    PlantingScheduleLib.completePlantingEvent(plantingEvents, caller, event_id, Time.now());
  };
};
