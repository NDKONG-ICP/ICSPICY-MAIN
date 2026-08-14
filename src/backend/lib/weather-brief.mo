/// Deterministic grower weather brief for SpicyAi / MCP (Phase 4).
/// Built from cached outlook + tropical only — no outcalls.

import Array "mo:core/Array";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Hub "../types/weather-hub";
import WeatherAlerts "weather-alerts";
import TropicalDesk "tropical-desk";

module {
  public let MAX_BRIEF_CHARS : Nat = 2800;

  public func build(
    outlook : ?Hub.WeatherOutlook,
    tropical : ?Hub.TropicalSummary,
    now : Int,
    almanacDateKey : ?Text,
  ) : ?Hub.WeatherBrief {
    switch (outlook) {
      case null null;
      case (?o) {
        let alerts = WeatherAlerts.evaluate(o, now);
        let tropAlerts = switch (tropical) {
          case (?t) TropicalDesk.tropicalThreatAlerts(t, o.lat, o.lng, now);
          case null [];
        };
        let text = truncate(compose(o, tropical, alerts, tropAlerts), MAX_BRIEF_CHARS);
        ?{
          generatedAt = now;
          gridKey = o.gridKey;
          text;
          outlookFetchedAt = o.fetchedAt;
          tropicalFetchedAt = switch (tropical) {
            case (?t) ?t.fetchedAt;
            case null null;
          };
          almanacDateKey;
        };
      };
    };
  };

  func compose(
    o : Hub.WeatherOutlook,
    tropical : ?Hub.TropicalSummary,
    alerts : [Hub.WeatherAlert],
    tropAlerts : [Hub.WeatherAlert],
  ) : Text {
    var lines : [Text] = [
      "WEATHER BRIEF (on-chain cache — cite only these facts)",
      "Grid: " # o.gridKey # (if (o.stale) " [STALE]" else ""),
      "Now: " # o.current.tempF.format(#fix 0) # "F (feels "
        # o.current.feelsLikeF.format(#fix 0) # "F), RH "
        # o.current.humidity.format(#fix 0) # "%, wind "
        # o.current.windMph.format(#fix 0) # " mph, UV "
        # o.current.uvIndex.format(#fix 1) # ", precip "
        # o.current.precipInches.format(#fix 2) # "\"",
    ];

    var i : Nat = 0;
    let dayLimit = if (o.daily.size() > 3) 3 else o.daily.size();
    while (i < dayLimit) {
      let d = o.daily[i];
      let dayName = if (i == 0) "Today" else if (i == 1) "Tomorrow" else d.date;
      lines := Array.concat(lines, [
        dayName # ": high " # d.tempHighF.format(#fix 0) # "F / low "
          # d.tempLowF.format(#fix 0) # "F, rain "
          # d.precipInches.format(#fix 2) # "\", wind max "
          # d.windMphMax.format(#fix 0) # " mph, UV "
          # d.uvIndexMax.format(#fix 1)
          # " — " # WeatherAlerts.dayHint(d),
      ]);
      i += 1;
    };

    switch (o.models) {
      case (?m) {
        if (m.gfs.size() > 0 or m.ecmwf.size() > 0 or m.icon.size() > 0 or m.gem.size() > 0) {
          let g = sumPrecip(m.gfs);
          let e = sumPrecip(m.ecmwf);
          let ic = sumPrecip(m.icon);
          let ge = sumPrecip(m.gem);
          let note = if (g > e + 0.3 and g > ic + 0.3) {
            "Models: GFS wetter this week (agreement " # Nat.toText(m.agreementScore) # "%)"
          } else if (e > g + 0.3) {
            "Models: ECMWF wetter (agreement " # Nat.toText(m.agreementScore) # "%)"
          } else {
            "Models: " # Nat.toText(m.agreementScore) # "% agreement across GFS/Euro/ICON/GEM"
          };
          lines := Array.concat(lines, [note]);
        };
      };
      case null {};
    };

    switch (tropical) {
      case (?t) {
        lines := Array.concat(lines, [
          "Tropical: season "
            # (if (t.seasonActive) "ACTIVE" else "off")
            # ", " # Nat.toText(t.storms.size()) # " system(s) in cache",
        ]);
        var si : Nat = 0;
        let sLimit = if (t.storms.size() > 4) 4 else t.storms.size();
        while (si < sLimit) {
          let st = t.storms[si];
          let basin = switch (st.basin) {
            case (#atlantic) "Atlantic";
            case (#eastPacific) "E.Pac/WP";
          };
          lines := Array.concat(lines, [
            "- " # st.classification # " " # st.name # " (" # basin # ") "
              # Nat.toText(st.maxWindKt) # " kt @ "
              # st.lat.format(#fix 1) # "," # st.lng.format(#fix 1)
              # " — " # st.movementText,
          ]);
          si += 1;
        };
        if (t.storms.size() == 0) {
          lines := Array.concat(lines, ["- No named systems in on-chain tropical cache"]);
        };
        lines := Array.concat(lines, [
          "ACE season: "
            # t.aceStats.seasonTotal.format(#fix 1)
            # " (avg "
            # t.aceStats.seasonAverage.format(#fix 1)
            # ", record "
            # t.aceStats.seasonRecord.format(#fix 0)
            # ")",
        ]);
        if (t.developmentOutlooks.size() > 0) {
          var oi : Nat = 0;
          let oLimit = if (t.developmentOutlooks.size() > 3) 3 else t.developmentOutlooks.size();
          while (oi < oLimit) {
            let o = t.developmentOutlooks[oi];
            lines := Array.concat(lines, [
              "- Outlook "
                # o.basin
                # ": 7-day "
                # o.prob7Day
                # "% ("
                # o.risk7Day
                # " risk)",
            ]);
            oi += 1;
          };
        };
      };
      case null {
        lines := Array.concat(lines, ["Tropical: cache empty"]);
      };
    };

    let allAlerts = Array.concat(alerts, tropAlerts);
    if (allAlerts.size() > 0) {
      lines := Array.concat(lines, ["Grower alerts:"]);
      var ai : Nat = 0;
      let aLimit = if (allAlerts.size() > 5) 5 else allAlerts.size();
      while (ai < aLimit) {
        let a = allAlerts[ai];
        lines := Array.concat(lines, ["- " # a.title # ": " # a.body]);
        ai += 1;
      };
    };

    lines := Array.concat(lines, [
      "RULES: Do not invent storm names, tracks, or wind speeds. If no Atlantic threat is listed, say so. Prefer mulch, drainage, staking, and biology recovery over panic sprays.",
    ]);

    joinLines(lines);
  };

  func sumPrecip(days : [Hub.ModelDay]) : Float {
    var s : Float = 0.0;
    for (d in days.vals()) { s += d.precipInches };
    s;
  };

  func joinLines(lines : [Text]) : Text {
    var out = "";
    var i : Nat = 0;
    while (i < lines.size()) {
      if (i > 0) { out := out # "\n" };
      out := out # lines[i];
      i += 1;
    };
    out;
  };

  func truncate(t : Text, max : Nat) : Text {
    if (t.size() <= max) { t } else {
      // Motoko Text has no substring in all versions — rebuild via chars
      var out = "";
      var n : Nat = 0;
      for (c in t.toIter()) {
        if (n >= max) { return out # "…" };
        out := out # Text.fromChar(c);
        n += 1;
      };
      out;
    };
  };
};
