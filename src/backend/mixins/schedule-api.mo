import Map "mo:core/Map";
import Time "mo:core/Time";
import AccessControl "../lib/access-control";
import Common "../types/common";
import ClaimTypes "../types/claim";
import ScheduleLib "../lib/schedule";

mixin (
  accessControlState : AccessControl.AccessControlState,
  savedSchedules : Map.Map<Common.ScheduleId, ClaimTypes.SavedSchedule>,
  shareIndex : Map.Map<Text, Common.ScheduleId>,
) {
  // Public query: get built-in KNF application schedule data for a stage + input combo
  public query func getScheduleData(
    stage : Text,
    inputs : [Text],
  ) : async [ClaimTypes.ScheduleEntry] {
    ScheduleLib.getScheduleData(stage, inputs);
  };

  // Authenticated: persist a custom KNF schedule for the caller; returns new schedule id
  public shared ({ caller }) func saveSchedule(
    stage : Text,
    inputs : [Text],
  ) : async Common.ScheduleId {
    AccessControl.requireAuthenticated(caller);
    ScheduleLib.saveSchedule(savedSchedules, shareIndex, caller, stage, inputs, Time.now());
  };

  // Authenticated: list all saved schedules owned by the caller
  public shared ({ caller }) func getMySchedules() : async [ClaimTypes.SavedSchedule] {
    AccessControl.requireAuthenticated(caller);
    ScheduleLib.getMySchedules(savedSchedules, caller);
  };

  // Public query: load a saved schedule via share token (for social sharing)
  public query func getScheduleByShareToken(
    share_token : Text,
  ) : async ?ClaimTypes.SavedSchedule {
    ScheduleLib.getScheduleByShareToken(savedSchedules, shareIndex, share_token);
  };
};
