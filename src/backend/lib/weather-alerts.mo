/// Grower alert rules evaluated against a cached WeatherOutlook (Phase 2).

import Array "mo:core/Array";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Hub "../types/weather-hub";

module {
  let HEAVY_RAIN_IN : Float = 1.5;
  let HIGH_WIND_MPH : Float = 30.0;
  let EXTREME_HEAT_F : Float = 100.0;
  let HIGH_UV : Float = 8.0;

  public func evaluate(outlook : Hub.WeatherOutlook, now : Int) : [Hub.WeatherAlert] {
    var out : [Hub.WeatherAlert] = [];
    let grid = outlook.gridKey;
    let day0 = if (outlook.daily.size() > 0) ?outlook.daily[0] else null;
    let day1 = if (outlook.daily.size() > 1) ?outlook.daily[1] else null;

    switch (day0) {
      case (?d) {
        if (d.precipInches >= HEAVY_RAIN_IN) {
          out := Array.concat(out, [alert(
            1,
            #heavyRain,
            "Heavy rain today",
            "Expect about " # formatIn(d.precipInches) # "\" — mulch beds, check drainage, delay foliar sprays.",
            #watch,
            now,
            grid,
          )]);
        };
        if (d.windMphMax >= HIGH_WIND_MPH) {
          out := Array.concat(out, [alert(
            2,
            #highWind,
            "High wind",
            "Gusts near " # formatMph(d.windMphMax) # " mph — stake tall peppers and secure shade cloth.",
            #watch,
            now,
            grid,
          )]);
        };
        if (d.tempHighF >= EXTREME_HEAT_F or outlook.current.feelsLikeF >= 105.0) {
          out := Array.concat(out, [alert(
            3,
            #extremeHeat,
            "Extreme heat",
            "High near " # formatTemp(d.tempHighF) # "°F — water early, shade afternoon west faces.",
            #warning,
            now,
            grid,
          )]);
        };
        if (d.uvIndexMax >= HIGH_UV) {
          out := Array.concat(out, [alert(
            4,
            #highUv,
            "High UV",
            "UV peaks near " # formatUv(d.uvIndexMax) # " — afternoon shade cloth helps tender transplants.",
            #info,
            now,
            grid,
          )]);
        };
      };
      case null {};
    };

    switch (day1) {
      case (?d) {
        if (d.precipInches >= 2.0) {
          out := Array.concat(out, [alert(
            5,
            #heavyRain,
            "Heavy rain tomorrow",
            "Models show ~" # formatIn(d.precipInches) # "\" tomorrow — prep mulch and clear drains tonight.",
            #watch,
            now,
            grid,
          )]);
        };
      };
      case null {};
    };

    out;
  };

  func alert(
    id : Nat,
    kind : Hub.AlertKind,
    title : Text,
    body : Text,
    severity : { #info; #watch; #warning },
    now : Int,
    gridKey : Text,
  ) : Hub.WeatherAlert {
    {
      id;
      kind;
      title;
      body;
      severity;
      createdAt = now;
      expiresAt = now + 86_400_000_000_000;
      gridKey;
    };
  };

  func formatIn(x : Float) : Text {
    x.format(#fix 2);
  };

  func formatMph(x : Float) : Text {
    x.format(#fix 0);
  };

  func formatTemp(x : Float) : Text {
    x.format(#fix 0);
  };

  func formatUv(x : Float) : Text {
    x.format(#fix 1);
  };

  /// One-line grower hint for a daily outlook row.
  public func dayHint(d : Hub.DailyOutlook) : Text {
    if (d.precipInches >= 1.0) {
      "Mulch + drain — skip foliar"
    } else if (d.precipInches >= 0.4) {
      "Light rain — hold sprays"
    } else if (d.tempHighF >= 98.0) {
      "Heat — water AM, shade PM"
    } else if (d.uvIndexMax >= 8.0) {
      "High UV — protect seedlings"
    } else if (d.weatherCode >= 95) {
      "Storm risk — stake & mulch"
    } else {
      "Fair grower day"
    };
  };
};
