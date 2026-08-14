/// Tropical desk ingest — NASA EONET severeStorms (Phase 3).
/// NHC CurrentStorms.json returns empty bodies to IC egress (CloudFront);
/// EONET aggregates JTWC/NHC positions with track geometry and works via outcall.

import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Char "mo:core/Char";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Hub "../types/weather-hub";
import ICRC7 "../types/icrc7";
import JsonMini "json-mini";

module {
  public let EONET_STORMS_URL : Text =
    "https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open";

  /// Kept for docs / future retry if NHC egress opens up.
  public let CURRENT_STORMS_URL : Text = "https://www.nhc.noaa.gov/CurrentStorms.json";

  public let DISCLAIMER : Text =
    "Aggregated from NOAA GIS NHC MapServer + NASA EONET via on-chain HTTPS outcall. Not an official NWS/NHC forecast. Always follow local emergency management.";

  public let MAX_STORMS : Nat = 20;
  public let MAX_TRACK_POINTS : Nat = 40;
  // 2h: newly named storms (EONET adds within hours) must not hide behind a
  // long cache window during season. ensureTropicalSummary refreshes on visit.
  public let FRESH_NS : Int = 7_200_000_000_000;

  public func seasonActive(nowNs : Int) : Bool {
    let secs = nowNs / 1_000_000_000;
    let days = secs / 86_400;
    let m = monthFromUnixDays(days);
    m >= 6 and m <= 11;
  };

  func monthFromUnixDays(days : Int) : Nat {
    var z = days + 719_468;
    if (z < 0) { z := 0 };
    let era = z / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let m = mp + (if (mp < 10) 3 else -9);
    Int.abs(m);
  };

  public func isFresh(summary : Hub.TropicalSummary, now : Int) : Bool {
    (now - summary.fetchedAt) < FRESH_NS;
  };

  /// Canonicalize EONET → compact storms array (deterministic for consensus).
  public func canonicalCurrentStormsBody(body : Blob) : Blob {
    func emptyWith(err : Text) : Blob {
      Text.encodeUtf8("{\"storms\":[],\"err\":\"" # jsonEscape(err) # "\"}");
    };
    switch (JsonMini.parse(body)) {
      case (#err(e)) emptyWith("parse:" # e);
      case (#ok(#Map(root))) {
        switch (mapField(root, "events")) {
          case (?#Array(arr)) {
            var parts : [Text] = [];
            var i : Nat = 0;
            let n = if (arr.size() > MAX_STORMS) MAX_STORMS else arr.size();
            while (i < n) {
              switch (arr[i]) {
                case (#Map(ev)) {
                  switch (canonicalEvent(ev)) {
                    case (?obj) parts := Array.concat(parts, [obj]);
                    case null {};
                  };
                };
                case _ {};
              };
              i += 1;
            };
            var joined = "";
            var j : Nat = 0;
            while (j < parts.size()) {
              if (j > 0) { joined := joined # "," };
              joined := joined # parts[j];
              j += 1;
            };
            Text.encodeUtf8("{\"storms\":[" # joined # "]}");
          };
          case _ emptyWith("missing_events");
        };
      };
      case (#ok(_)) emptyWith("root_not_object");
    };
  };

  func canonicalEvent(ev : [(Text, ICRC7.Value)]) : ?Text {
    let id = textOrEmpty(ev, "id");
    let title = textOrEmpty(ev, "title");
    if (id.size() == 0 or title.size() == 0) return null;
    let (classification, name) = classifyTitle(title);
    let sourceHint = firstSourceUrl(ev);
    switch (mapField(ev, "geometry")) {
      case (?#Array(geom)) {
        if (geom.size() == 0) return null;
        // Keep last N track points only (canonical, bounded).
        let start = if (geom.size() > MAX_TRACK_POINTS) {
          geom.size() - MAX_TRACK_POINTS;
        } else { 0 };
        var trackParts : [Text] = [];
        var k = start;
        var lastLat = "0";
        var lastLng = "0";
        var lastWind = "0";
        var lastDate = "";
        while (k < geom.size()) {
          switch (geom[k]) {
            case (#Map(g)) {
              switch (pointFromGeom(g)) {
                case (?(lat, lng, wind, date)) {
                  lastLat := lat;
                  lastLng := lng;
                  lastWind := wind;
                  lastDate := date;
                  trackParts := Array.concat(
                    trackParts,
                    [
                      "{\"lat\":" # lat # ",\"lng\":" # lng # ",\"maxWindKt\":" # wind
                      # ",\"timeUtc\":\"" # jsonEscape(date) # "\"}",
                    ],
                  );
                };
                case null {};
              };
            };
            case _ {};
          };
          k += 1;
        };
        if (trackParts.size() == 0) return null;
        var trackJoined = "";
        var t : Nat = 0;
        while (t < trackParts.size()) {
          if (t > 0) { trackJoined := trackJoined # "," };
          trackJoined := trackJoined # trackParts[t];
          t += 1;
        };
        ?("{"
          # "\"id\":\"" # jsonEscape(id) # "\","
          # "\"name\":\"" # jsonEscape(name) # "\","
          # "\"classification\":\"" # jsonEscape(classification) # "\","
          # "\"intensity\":" # lastWind # ","
          # "\"latitudeNumeric\":" # lastLat # ","
          # "\"longitudeNumeric\":" # lastLng # ","
          # "\"lastUpdate\":\"" # jsonEscape(lastDate) # "\","
          # "\"sourceHint\":\"" # jsonEscape(sourceHint) # "\","
          # "\"track\":[" # trackJoined # "]"
          # "}");
      };
      case _ null;
    };
  };

  func pointFromGeom(g : [(Text, ICRC7.Value)]) : ?(Text, Text, Text, Text) {
    let date = textOrEmpty(g, "date");
    let wind = lexemeOrZero(g, "magnitudeValue");
    switch (mapField(g, "coordinates")) {
      case (?#Array(coords)) {
        if (coords.size() < 2) return null;
        let lng = valueLexeme(coords[0]);
        let lat = valueLexeme(coords[1]);
        ?(lat, lng, wind, date);
      };
      case _ null;
    };
  };

  func valueLexeme(v : ICRC7.Value) : Text {
    switch (v) {
      case (#Text t) if (t == "null") "0" else t;
      case (#Nat n) Nat.toText(n);
      case (#Int i) Int.toText(i);
      case _ "0";
    };
  };

  func firstSourceUrl(ev : [(Text, ICRC7.Value)]) : Text {
    switch (mapField(ev, "sources")) {
      case (?#Array(arr)) {
        if (arr.size() == 0) return "";
        switch (arr[0]) {
          case (#Map(s)) textOrEmpty(s, "url");
          case _ "";
        };
      };
      case _ "";
    };
  };

  func classifyTitle(title : Text) : (Text, Text) {
    func strip(prefix : Text) : Text {
      switch (Text.stripStart(title, #text prefix)) {
        case (?rest) rest;
        case null title;
      };
    };
    if (Text.startsWith(title, #text "Super Typhoon ")) {
      ("STY", strip("Super Typhoon "));
    } else if (Text.startsWith(title, #text "Typhoon ")) {
      ("TY", strip("Typhoon "));
    } else if (Text.startsWith(title, #text "Hurricane ")) {
      ("HU", strip("Hurricane "));
    } else if (Text.startsWith(title, #text "Tropical Storm ")) {
      ("TS", strip("Tropical Storm "));
    } else if (Text.startsWith(title, #text "Tropical Depression ")) {
      ("TD", strip("Tropical Depression "));
    } else if (Text.startsWith(title, #text "Post-Tropical Cyclone ")) {
      ("PTC", strip("Post-Tropical Cyclone "));
    } else {
      ("TC", title);
    };
  };

  public func parseCurrentStorms(body : Blob, now : Int) : Result.Result<[Hub.TropicalStorm], Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) {
        let arr = switch (mapField(root, "storms")) {
          case (?#Array(a)) a;
          case _ return #err("Missing storms");
        };
        var out : [Hub.TropicalStorm] = [];
        for (v in arr.vals()) {
          switch (v) {
            case (#Map(s)) {
              switch (parseOneStorm(s, now)) {
                case (?st) out := Array.concat(out, [st]);
                case null {};
              };
            };
            case _ {};
          };
        };
        #ok(out);
      };
      case (#ok(_)) #err("Expected object");
    };
  };

  func parseOneStorm(s : [(Text, ICRC7.Value)], now : Int) : ?Hub.TropicalStorm {
    let id = textOrEmpty(s, "id");
    if (id.size() == 0) return null;
    let name = textOrEmpty(s, "name");
    let classification = textOrEmpty(s, "classification");
    let lat = switch (floatField(s, "latitudeNumeric")) {
      case (?v) v;
      case null return null;
    };
    let lng = switch (floatField(s, "longitudeNumeric")) {
      case (?v) v;
      case null return null;
    };
    let wind = switch (natField(s, "intensity")) {
      case (?n) n;
      case null 0;
    };
    let sourceHint = textOrEmpty(s, "sourceHint");
    let basin = basinFrom(lng, sourceHint);
    let lastUpdate = textOrEmpty(s, "lastUpdate");
    let track = parseTrack(s, wind, lastUpdate);
    let movementText = movementFromTrack(track);
    ?{
      id;
      name = if (name.size() > 0) name else id;
      basin;
      classification = if (classification.size() > 0) classification else "TC";
      advisoryNum = track.size();
      lat;
      lng;
      maxWindKt = wind;
      pressureMb = 0;
      movementText;
      movementDirDeg = 0;
      movementSpeedKt = 0;
      validAt = now;
      track;
      forecastTrack = [];
    };
  };

  func parseTrack(
    s : [(Text, ICRC7.Value)],
    fallbackWind : Nat,
    fallbackTime : Text,
  ) : [Hub.StormTrackPoint] {
    switch (mapField(s, "track")) {
      case (?#Array(arr)) {
        var out : [Hub.StormTrackPoint] = [];
        for (v in arr.vals()) {
          switch (v) {
            case (#Map(p)) {
              switch (floatField(p, "lat"), floatField(p, "lng")) {
                case (?la, ?ln) {
                  let w = switch (natField(p, "maxWindKt")) {
                    case (?n) n;
                    case null fallbackWind;
                  };
                  let t = textOrEmpty(p, "timeUtc");
                  out := Array.concat(out, [{
                    timeUtc = if (t.size() > 0) t else fallbackTime;
                    lat = la;
                    lng = ln;
                    maxWindKt = w;
                  }]);
                };
                case _ {};
              };
            };
            case _ {};
          };
        };
        if (out.size() > 0) { out } else {
          switch (floatField(s, "latitudeNumeric"), floatField(s, "longitudeNumeric")) {
            case (?la, ?ln) [{
              timeUtc = fallbackTime;
              lat = la;
              lng = ln;
              maxWindKt = fallbackWind;
            }];
            case _ [];
          };
        };
      };
      case _ [];
    };
  };

  func movementFromTrack(track : [Hub.StormTrackPoint]) : Text {
    if (track.size() < 2) {
      "Latest EONET position";
    } else {
      let a = track[track.size() - 2];
      let b = track[track.size() - 1];
      let dLat = b.lat - a.lat;
      let dLng = b.lng - a.lng;
      let deg = compassBearing(dLat, dLng);
      "Moving " # deg # " (EONET track)";
    };
  };

  func compassBearing(dLat : Float, dLng : Float) : Text {
    // Approximate bearing quadrant from lat/lng deltas.
    let absLat = if (dLat < 0.0) -dLat else dLat;
    let absLng = if (dLng < 0.0) -dLng else dLng;
    if (absLat < 0.05 and absLng < 0.05) { return "slowly" };
    let ns = if (dLat > 0.0) "N" else if (dLat < 0.0) "S" else "";
    let ew = if (dLng > 0.0) "E" else if (dLng < 0.0) "W" else "";
    if (ns.size() > 0 and ew.size() > 0) {
      if (absLat > absLng * 2.0) { ns }
      else if (absLng > absLat * 2.0) { ew }
      else { ns # ew };
    } else if (ns.size() > 0) { ns }
    else if (ew.size() > 0) { ew }
    else { "—" };
  };

  func basinFrom(lng : Float, sourceHint : Text) : Hub.StormBasin {
    let hint = sourceHint;
    if (Text.contains(hint, #text "/al") or Text.contains(hint, #text "al0")) {
      return #atlantic;
    };
    // Atlantic basin longitudes roughly west of 20°W and east of 100°W
    if (lng > -100.0 and lng < -20.0) { #atlantic } else { #eastPacific };
  };

  public func mergeWithHistory(
    incoming : [Hub.TropicalStorm],
    previous : ?Hub.TropicalSummary,
  ) : [Hub.TropicalStorm] {
    // EONET already sends full tracks; prefer incoming track (longer wins).
    let prevStorms = switch (previous) {
      case (?s) s.storms;
      case null [];
    };
    var out : [Hub.TropicalStorm] = [];
    for (st in incoming.vals()) {
      let oldTrack = findTrack(prevStorms, st.id);
      let track = if (st.track.size() >= oldTrack.size()) { st.track } else {
        appendTrack(oldTrack, if (st.track.size() > 0) [st.track[st.track.size() - 1]] else []);
      };
      out := Array.concat(out, [{ st with track }]);
    };
    out;
  };

  func findTrack(storms : [Hub.TropicalStorm], id : Text) : [Hub.StormTrackPoint] {
    for (s in storms.vals()) {
      if (s.id == id) return s.track;
    };
    [];
  };

  func near(a : Float, b : Float, eps : Float) : Bool {
    let d = a - b;
    let abs = if (d < 0.0) -d else d;
    abs <= eps;
  };

  func appendTrack(
    old : [Hub.StormTrackPoint],
    neu : [Hub.StormTrackPoint],
  ) : [Hub.StormTrackPoint] {
    if (neu.size() == 0) return old;
    let p = neu[0];
    var base = old;
    if (base.size() > 0) {
      let last = base[base.size() - 1];
      if (near(last.lat, p.lat, 0.05) and near(last.lng, p.lng, 0.05)) {
        if (base.size() == 1) { return [p] };
        var kept : [Hub.StormTrackPoint] = [];
        var i : Nat = 0;
        while (i + 1 < base.size()) {
          kept := Array.concat(kept, [base[i]]);
          i += 1;
        };
        return Array.concat(kept, [p]);
      };
    };
    base := Array.concat(base, [p]);
    if (base.size() <= MAX_TRACK_POINTS) {
      base;
    } else {
      var trimmed : [Hub.StormTrackPoint] = [];
      var i = base.size() - MAX_TRACK_POINTS;
      while (i < base.size()) {
        trimmed := Array.concat(trimmed, [base[i]]);
        i += 1;
      };
      trimmed;
    };
  };

  public func buildSummary(
    storms : [Hub.TropicalStorm],
    now : Int,
    developmentOutlooks : [Hub.DevelopmentOutlook],
    aceStats : Hub.AceSeasonStats,
    dataSource : Text,
  ) : Hub.TropicalSummary {
    {
      fetchedAt = now;
      seasonActive = seasonActive(now);
      storms;
      developmentOutlooks;
      aceStats;
      dataSource;
      disclaimer = DISCLAIMER;
    };
  };

  public func distanceNm(lat1 : Float, lng1 : Float, lat2 : Float, lng2 : Float) : Float {
    let toRad = Float.pi / 180.0;
    let dLatNm = (lat2 - lat1) * 60.0;
    let meanLat = (lat1 + lat2) / 2.0;
    let dLngNm = (lng2 - lng1) * 60.0 * Float.cos(meanLat * toRad);
    Float.sqrt(dLatNm * dLatNm + dLngNm * dLngNm);
  };

  public func tropicalThreatAlerts(
    summary : Hub.TropicalSummary,
    watchLat : Float,
    watchLng : Float,
    now : Int,
  ) : [Hub.WeatherAlert] {
    var out : [Hub.WeatherAlert] = [];
    var idx : Nat = 10;
    for (st in summary.storms.vals()) {
      let nm = distanceNm(watchLat, watchLng, st.lat, st.lng);
      let atlantic = switch (st.basin) {
        case (#atlantic) true;
        case (#eastPacific) false;
      };
      if (atlantic and nm <= 800.0 and st.maxWindKt >= 34) {
        let sev : { #info; #watch; #warning } =
          if (nm <= 300.0 and st.maxWindKt >= 64) { #warning }
          else if (nm <= 500.0) { #watch }
          else { #info };
        out := Array.concat(out, [{
          id = idx;
          kind = #tropicalThreat;
          title = st.classification # " " # st.name;
          body =
            st.movementText # " · ~" # nm.format(#fix 0) # " nm from your grid · "
            # Nat.toText(st.track.size()) # " track pts. Prep mulch, drainage, and stakes. Not an official NHC product.";
          severity = sev;
          createdAt = now;
          expiresAt = now + 86_400_000_000_000;
          gridKey = watchLat.format(#fix 1) # "," # watchLng.format(#fix 1);
        }]);
        idx += 1;
      };
    };
    out;
  };

  func mapField(entries : [(Text, ICRC7.Value)], key : Text) : ?ICRC7.Value {
    for ((k, v) in entries.vals()) {
      if (k == key) return ?v;
    };
    null;
  };

  func textOrEmpty(entries : [(Text, ICRC7.Value)], key : Text) : Text {
    switch (mapField(entries, key)) {
      case (?#Text t) if (t == "null") "" else t;
      case (?#Nat n) Nat.toText(n);
      case (?#Int i) Int.toText(i);
      case _ "";
    };
  };

  func lexemeOrZero(entries : [(Text, ICRC7.Value)], key : Text) : Text {
    switch (mapField(entries, key)) {
      case (?#Text t) if (t == "null") "0" else t;
      case (?#Nat n) Nat.toText(n);
      case (?#Int i) Int.toText(i);
      case _ "0";
    };
  };

  func floatField(entries : [(Text, ICRC7.Value)], key : Text) : ?Float {
    switch (mapField(entries, key)) {
      case (?#Text t) parseDecimal(t);
      case (?#Nat n) ?Float.fromInt(Nat.toInt(n));
      case (?#Int i) ?Float.fromInt(i);
      case _ null;
    };
  };

  func natField(entries : [(Text, ICRC7.Value)], key : Text) : ?Nat {
    switch (mapField(entries, key)) {
      case (?#Nat n) ?n;
      case (?#Int i) if (i >= 0) ?Int.abs(i) else null;
      case (?#Text t) parseNatText(t);
      case _ null;
    };
  };

  func parseNatText(t : Text) : ?Nat {
    switch (parseDecimal(t)) {
      case (?f) if (f < 0.0) null else ?Int.abs(Float.nearest(f).toInt());
      case null null;
    };
  };

  func parseDecimal(t : Text) : ?Float {
    if (t.size() == 0 or t == "null") return ?0.0;
    var intPart : Int = 0;
    var fracPart : Nat = 0;
    var fracDiv : Nat = 1;
    var inFrac = false;
    var neg = false;
    var started = false;
    var valid = false;
    for (c in t.toIter()) {
      if (c == '-') {
        if (not started) { neg := true } else return null;
      } else if (c >= '0' and c <= '9') {
        started := true;
        valid := true;
        let d = Nat32.toNat(Char.toNat32(c) - Char.toNat32('0'));
        if (inFrac) {
          fracPart := fracPart * 10 + d;
          fracDiv := fracDiv * 10;
        } else {
          intPart := intPart * 10 + Int.fromNat(d);
        };
      } else if (c == '.') {
        if (inFrac) return null;
        inFrac := true;
        started := true;
      } else if (valid) {
      } else {
        return null;
      };
    };
    if (not valid) return null;
    let signed = if (neg) -intPart else intPart;
    let whole = Float.fromInt(signed);
    if (fracDiv == 1) {
      ?whole;
    } else {
      let frac = Float.fromInt(Nat.toInt(fracPart)) / Float.fromInt(Nat.toInt(fracDiv));
      if (neg) ?(whole - frac) else ?(whole + frac);
    };
  };

  func jsonEscape(t : Text) : Text {
    var out = "";
    for (c in t.toIter()) {
      if (c == '\"') { out := out # "\\\"" }
      else if (c == '\\') { out := out # "\\\\" }
      else { out := out # Text.fromChar(c) };
    };
    out;
  };
};
