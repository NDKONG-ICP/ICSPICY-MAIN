/// Grid keys, TTL, and caps for the Weather Desk cache.

import Float "mo:core/Float";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Types "../types/weather-hub";

module {
  public let NURSERY_LAT : Float = 26.9767;
  public let NURSERY_LNG : Float = -82.0837;
  public let NURSERY_ZIP : Text = "33954";
  public let NURSERY_DISPLAY_LABEL : Text = "Port Charlotte, FL (nursery)";

  /// 6 hours in nanoseconds.
  public let OUTLOOK_TTL_NS : Int = 21_600_000_000_000;
  public let MAX_GRID_CELLS : Nat = 500;
  public let MAX_ZIP_CACHE : Nat = 2000;
  public let ACCESS_KEEP_NS : Int = 2_592_000_000_000_000; // 30 days

  public func roundToTenth(x : Float) : Float {
    let scaled = x * 10.0;
    let rounded = if (scaled >= 0.0) {
      Float.floor(scaled + 0.5);
    } else {
      Float.ceil(scaled - 0.5);
    };
    rounded / 10.0;
  };

  public func gridKey(lat : Float, lng : Float) : Text {
    let rLat = roundToTenth(lat);
    let rLng = roundToTenth(lng);
    rLat.format(#fix 1) # "," # rLng.format(#fix 1);
  };

  public func nurseryGridKey() : Text {
    gridKey(NURSERY_LAT, NURSERY_LNG);
  };

  public func isStale(fetchedAt : Int, now : Int) : Bool {
    (now - fetchedAt) > OUTLOOK_TTL_NS;
  };

  public func withStaleFlag(outlook : Types.WeatherOutlook, now : Int) : Types.WeatherOutlook {
    {
      outlook with stale = isStale(outlook.fetchedAt, now);
    };
  };

  public func normalizeZip(raw : Text) : ?Text {
    var digits = "";
    for (c in raw.toIter()) {
      if (c >= '0' and c <= '9') {
        digits := digits # Text.fromChar(c);
      };
    };
    if (digits.size() == 5) ?digits else null;
  };

  public func now() : Int {
    Time.now();
  };

  public func accessAgeOk(lastAccessed : Int, now : Int) : Bool {
    (now - lastAccessed) <= ACCESS_KEEP_NS;
  };
};
