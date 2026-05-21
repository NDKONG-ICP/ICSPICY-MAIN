import Types "../types/planting-schedule";
import Common "../types/common";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Nat "mo:core/Nat";

module {
  func r(name : Text, ty : Types.PlantingEventType, emoji : Text, notes : Text) : Types.ZoneRecommendation {
    { name; event_type = ty; emoji; notes };
  };

  /// Canonical Zone 10a calendar — synced with `src/frontend/src/lib/planting-almanac.ts`.
  func monthReco10a(m : Nat) : [Types.ZoneRecommendation] {
    switch (m) {
      case (1) {
        [
          r("Peppers", #startIndoors, "🌶️", "Start seeds indoors for spring transplant"),
          r("Tomatoes", #transplantOutdoors, "🍅", "Cool-season transplant window"),
          r("Lettuce", #directSow, "🥬", "Cool weather crop, direct sow"),
          r("Herbs", #startIndoors, "🌿", "Basil, cilantro, parsley"),
        ];
      };
      case (2) {
        [
          r("Peppers", #startIndoors, "🌶️", "Last chance to start for spring"),
          r("Tomatoes", #transplantOutdoors, "🍅", "Prime transplant window"),
          r("Squash", #directSow, "🎃", "Start squash and cucumber"),
          r("Beans", #directSow, "🫘", "Bush beans direct sow"),
        ];
      };
      case (3) {
        [
          r("Peppers", #transplantOutdoors, "🌶️", "Transplant seedlings after last frost"),
          r("Eggplant", #transplantOutdoors, "🍆", "Warm season begins"),
          r("Sweet Potato", #directSow, "🍠", "Plant slips"),
          r("Watermelon", #directSow, "🍉", "Direct sow after frost risk passes"),
        ];
      };
      case (4) {
        [
          r("Peppers", #transplantOutdoors, "🌶️", "Full sun, warm soil"),
          r("Okra", #directSow, "🌱", "Loves FL heat"),
          r("Southern Peas", #directSow, "🫛", "Black-eyed peas, cowpeas"),
          r("Malabar Spinach", #directSow, "🥬", "Heat-tolerant green"),
        ];
      };
      case (5) {
        [
          r("Peppers", #harvest, "🌶️", "Early varieties producing"),
          r("Sweet Potato", #directSow, "🍠", "Still time for slips"),
          r("Seminole Pumpkin", #directSow, "🎃", "FL native, heat tolerant"),
          r("Katuk", #transplantOutdoors, "🌿", "Tropical perennial"),
        ];
      };
      case (6) {
        [
          r("Peppers", #harvest, "🌶️", "Peak harvest season"),
          r("Cherry Tomatoes", #startIndoors, "🍅", "Heat-set varieties for fall"),
          r("Moringa", #directSow, "🌳", "Superfood tree, loves FL summers"),
          r("Lemongrass", #transplantOutdoors, "🌿", "Divide and plant"),
        ];
      };
      case (7) {
        [
          r("Peppers", #harvest, "🌶️", "Continuous harvest"),
          r("Cherry Tomatoes", #transplantOutdoors, "🍅", "Heat-tolerant varieties"),
          r("Calabaza", #directSow, "🎃", "Tropical squash"),
          r("Turmeric", #directSow, "🌿", "Plant rhizomes"),
        ];
      };
      case (8) {
        [
          r("Peppers", #startIndoors, "🌶️", "Start fall/winter crop indoors"),
          r("Tomatoes", #startIndoors, "🍅", "Start seeds for fall transplant"),
          r("Bush Beans", #directSow, "🫘", "Quick 60-day crop"),
          r("Collards", #startIndoors, "🥬", "Fall cool-season prep"),
        ];
      };
      case (9) {
        [
          r("Peppers", #transplantOutdoors, "🌶️", "Fall crop transplant"),
          r("Tomatoes", #transplantOutdoors, "🍅", "Fall transplant window opens"),
          r("Broccoli", #startIndoors, "🥦", "Cool-season crop"),
          r("Lettuce", #directSow, "🥬", "Temps starting to cool"),
        ];
      };
      case (10) {
        [
          r("Peppers", #harvest, "🌶️", "Fall harvest begins"),
          r("Strawberries", #transplantOutdoors, "🍓", "FL strawberry season"),
          r("Kale", #directSow, "🥬", "Cool weather green"),
          r("Carrots", #directSow, "🥕", "Fall/winter crop"),
        ];
      };
      case (11) {
        [
          r("Peppers", #harvest, "🌶️", "Late season pods"),
          r("Peas", #directSow, "🫛", "Snow peas, sugar snap"),
          r("Onions", #directSow, "🧅", "Short-day varieties for FL"),
          r("Radishes", #directSow, "🌱", "Quick 30-day crop"),
        ];
      };
      case (12) {
        [
          r("Peppers", #startIndoors, "🌶️", "Start superhots early"),
          r("Tomatoes", #startIndoors, "🍅", "Get a head start on spring"),
          r("Herbs", #startIndoors, "🌿", "Dill, cilantro, parsley"),
          r("Beets", #directSow, "🫒", "Cool-season root crop"),
        ];
      };
      case (_) {
        Runtime.trap("month must be between 1 and 12 inclusive");
      };
    };
  };

  public func normalizeZone(zone : Text) : Text {
    Text.trim(zone, #char ' ').toLower();
  };

  func decorateForZone(canonicalZone : Text, xs : [Types.ZoneRecommendation]) : [Types.ZoneRecommendation] {
    let overlay =
      switch (canonicalZone) {
        case ("9b") "(9b cooler) ";
        case ("10a") "";
        case ("10b") "(10b hottest) ";
        case (_) ""
      };
    if (overlay == "") {
      return xs;
    };
    xs.map(func(row : Types.ZoneRecommendation) : Types.ZoneRecommendation {
      {
        row with notes = overlay # row.notes;
      };
    });
  };

  func assertSupportedZone(canonicalZone : Text) : () {
    let ok = canonicalZone == "9b" or canonicalZone == "10a" or canonicalZone == "10b";
    if (not ok) {
      Runtime.trap(
        "Unknown USDA zone: use 9b, 10a, or 10b (normalized case-insensitive)"
      );
    };
  };

  func assertMonth(m : Nat) : () {
    if (m < 1 or m > 12) {
      Runtime.trap("month must be between 1 and 12 inclusive");
    };
  };

  func monthSchedule(z : Text, monthVal : Nat) : Types.ZoneSchedule {
    {
      zone_label = z;
      month = monthVal;
      recommendations = decorateForZone(z, monthReco10a(monthVal));
    };
  };

  public func getZoneSchedule(zone : Text, month : Nat) : Types.ZoneSchedule {
    let z = normalizeZone(zone);
    assertSupportedZone(z);
    assertMonth(month);
    monthSchedule(z, month);
  };

  public func getZoneCalendar(zone : Text) : Types.ZoneCalendar {
    let z = normalizeZone(zone);
    assertSupportedZone(z);
    let monthsArr = Array.tabulate<Types.ZoneSchedule>(
      12,
      func(i : Nat) : Types.ZoneSchedule {
        monthSchedule(z, i + 1);
      },
    );
    { zone_label = z; months = monthsArr };
  };

  // ── Owner-scoped planting events ────────────────────────────────────────

  public func createPlantingEvent(
    events : Map.Map<Nat, Types.PlantingEvent>,
    counter : { var value : Nat },
    caller : Principal,
    input : Types.CreatePlantingEventInput,
    now : Common.Timestamp,
  ) : Types.PlantingEvent {
    let id = counter.value;
    counter.value += 1;
    let ev : Types.PlantingEvent = {
      id;
      owner = caller;
      name = input.name;
      event_type = input.event_type;
      scheduled_at = input.scheduled_at;
      notes = input.notes;
      emoji = input.emoji;
      completed = false;
      completed_at = null;
      created_at = now;
    };
    events.add(id, ev);
    ev;
  };

  func requireOwner(existing : Types.PlantingEvent, caller : Principal) : () {
    if (existing.owner != caller) {
      Runtime.trap("not authorized to modify this planting event");
    };
  };

  public func updatePlantingEvent(
    events : Map.Map<Nat, Types.PlantingEvent>,
    caller : Principal,
    input : Types.UpdatePlantingEventInput,
  ) : Types.PlantingEvent {
    switch (events.get(input.id)) {
      case null { Runtime.trap("planting event not found") };
      case (?existing) {
        requireOwner(existing, caller);
        let updated : Types.PlantingEvent = {
          existing with name = input.name;
          event_type = input.event_type;
          scheduled_at = input.scheduled_at;
          notes = input.notes;
          emoji = input.emoji;
        };
        ignore events.delete(input.id);
        events.add(updated.id, updated);
        updated;
      };
    };
  };

  public func deletePlantingEvent(
    events : Map.Map<Nat, Types.PlantingEvent>,
    caller : Principal,
    eventId : Nat,
  ) : () {
    switch (events.get(eventId)) {
      case null { Runtime.trap("planting event not found") };
      case (?existing) {
        requireOwner(existing, caller);
        ignore events.delete(eventId);
      };
    };
  };

  public func completePlantingEvent(
    events : Map.Map<Nat, Types.PlantingEvent>,
    caller : Principal,
    eventId : Nat,
    now : Common.Timestamp,
  ) : Types.PlantingEvent {
    switch (events.get(eventId)) {
      case null { Runtime.trap("planting event not found") };
      case (?existing) {
        requireOwner(existing, caller);
        let updated : Types.PlantingEvent = {
          existing with completed = true;
          completed_at = ?now;
        };
        ignore events.delete(eventId);
        events.add(updated.id, updated);
        updated;
      };
    };
  };

  func matchesOwner(ev : Types.PlantingEvent, caller : Principal) : Bool {
    ev.owner == caller;
  };

  func inRange(ts : Common.Timestamp, startDate : Common.Timestamp, endDate : Common.Timestamp) : Bool {
    ts >= startDate and ts <= endDate;
  };

  func collectForOwner(events : Map.Map<Nat, Types.PlantingEvent>, caller : Principal) : [Types.PlantingEvent] {
    var buf : [Types.PlantingEvent] = [];
    for ((_id, ev) in events.entries()) {
      if (matchesOwner(ev, caller)) {
        buf := Array.concat(buf, [ev]);
      };
    };
    buf;
  };

  public func getMyPlantingSchedule(
    events : Map.Map<Nat, Types.PlantingEvent>,
    caller : Principal,
    startDate : Common.Timestamp,
    endDate : Common.Timestamp,
  ) : [Types.PlantingEvent] {
    let filtered = collectForOwner(events, caller).filter(func(ev : Types.PlantingEvent) : Bool {
      inRange(ev.scheduled_at, startDate, endDate);
    });
    Array.sort(
      filtered,
      func(a : Types.PlantingEvent, b : Types.PlantingEvent) : {
        #less;
        #equal;
        #greater;
      } {
        if (a.scheduled_at < b.scheduled_at) {
          #less;
        } else if (a.scheduled_at > b.scheduled_at) {
          #greater;
        } else {
          #equal;
        };
      },
    );
  };

  public func getUpcomingPlantingEvents(
    events : Map.Map<Nat, Types.PlantingEvent>,
    caller : Principal,
    now : Common.Timestamp,
  ) : [Types.PlantingEvent] {
    let filtered = collectForOwner(events, caller).filter(func(ev : Types.PlantingEvent) : Bool {
      not ev.completed and ev.scheduled_at >= now;
    });
    Array.sort(
      filtered,
      func(a : Types.PlantingEvent, b : Types.PlantingEvent) : {
        #less;
        #equal;
        #greater;
      } {
        if (a.scheduled_at < b.scheduled_at) {
          #less;
        } else if (a.scheduled_at > b.scheduled_at) {
          #greater;
        } else {
          #equal;
        };
      },
    );
  };

  public func getOverduePlantingEvents(
    events : Map.Map<Nat, Types.PlantingEvent>,
    caller : Principal,
    now : Common.Timestamp,
  ) : [Types.PlantingEvent] {
    let filtered = collectForOwner(events, caller).filter(func(ev : Types.PlantingEvent) : Bool {
      not ev.completed and ev.scheduled_at < now;
    });
    Array.sort(
      filtered,
      func(a : Types.PlantingEvent, b : Types.PlantingEvent) : {
        #less;
        #equal;
        #greater;
      } {
        if (a.scheduled_at > b.scheduled_at) {
          #less;
        } else if (a.scheduled_at < b.scheduled_at) {
          #greater;
        } else {
          #equal;
        };
      },
    );
  };

  public func getPlantingEventIfOwned(
    events : Map.Map<Nat, Types.PlantingEvent>,
    caller : Principal,
    eventId : Nat,
  ) : ?Types.PlantingEvent {
    switch (events.get(eventId)) {
      case null { null };
      case (?ev) {
        if (ev.owner != caller) {
          null;
        } else {
          ?ev;
        };
      };
    };
  };
};
