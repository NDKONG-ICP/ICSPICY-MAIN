/// NOAA GIS tropical ingest — NHC MapServer forecast points + development outlook.
/// Works via IC HTTPS outcall (unlike nhc.noaa.gov/CurrentStorms.json).

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
  public let NOAA_BASE : Text =
    "https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer";

  public func forecastPointsUrl() : Text {
    NOAA_BASE # "/5/query?where=1%3D1&outFields=stormname,maxwind,mslp,tcdir,tcspd,lat,lon,fcstprd,ssnum,advisnum,basin,idp_source&returnGeometry=true&geometryPrecision=4&f=json&resultRecordCount=80";
  };

  /// ATCF a-deck (model guidance) for one storm wallet, e.g. "al032026".
  public func adeckUrl(wallet : Text) : Text {
    "https://ftp.nhc.noaa.gov/atcf/aid_public/a" # wallet # ".dat.gz";
  };

  public func outlookRegionsUrl() : Text {
    NOAA_BASE # "/3/query?where=1%3D1&outFields=basin,prob2day,risk2day,prob7day,risk7day&returnGeometry=true&geometryPrecision=3&f=json&resultRecordCount=20";
  };

  public func pastPointsUrl() : Text {
    NOAA_BASE # "/10/query?where=1%3D1&outFields=stormname,maxwind,lat,lon,validtime&returnGeometry=true&geometryPrecision=4&f=json&resultRecordCount=120";
  };

  public let ATLANTIC_SEASON_NAMES : [Text] = [
    "Arthur", "Bertha", "Cristobal", "Dolly", "Edouard", "Fay", "Gonzalo",
    "Hanna", "Isaias", "Josephine", "Kyle", "Laura", "Marco", "Nana",
    "Omar", "Paulette", "Rene", "Sally", "Teddy", "Vicky", "Wilfred",
  ];

  public let ACE_SEASON_AVERAGE : Float = 13.0;
  public let ACE_SEASON_RECORD : Float = 85.0;

  /// Strip ArcGIS forecast features to compact storms array for consensus.
  public func canonicalForecastBody(body : Blob) : Blob {
    canonicalFeatures(body, "forecast");
  };

  public func canonicalOutlookBody(body : Blob) : Blob {
    canonicalFeatures(body, "outlook");
  };

  public func canonicalPastBody(body : Blob) : Blob {
    canonicalFeatures(body, "past");
  };

  func canonicalFeatures(body : Blob, kind : Text) : Blob {
    switch (JsonMini.parse(body)) {
      case (#err(e)) {
        Text.encodeUtf8("{\"kind\":\"" # kind # "\",\"features\":[],\"err\":\"" # jsonEscape(e) # "\"}");
      };
      case (#ok(#Map(root))) {
        switch (mapField(root, "features")) {
          case (?#Array(arr)) {
            var parts : [Text] = [];
            var i : Nat = 0;
            let n = if (arr.size() > 80) 80 else arr.size();
            while (i < n) {
              switch (arr[i]) {
                case (#Map(f)) {
                  switch (compactFeature(f, kind)) {
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
            Text.encodeUtf8("{\"kind\":\"" # kind # "\",\"features\":[" # joined # "]}");
          };
          case _ {
            Text.encodeUtf8("{\"kind\":\"" # kind # "\",\"features\":[],\"err\":\"no_features\"}");
          };
        };
      };
      case (#ok(_)) {
        Text.encodeUtf8("{\"kind\":\"" # kind # "\",\"features\":[],\"err\":\"not_object\"}");
      };
    };
  };

  func compactFeature(f : [(Text, ICRC7.Value)], kind : Text) : ?Text {
    let attrs = switch (mapField(f, "attributes")) {
      case (?#Map(a)) a;
      case _ f;
    };
    let (lat, lng) = geomLatLng(f);
    switch (kind) {
      case "forecast" {
        let name = textOrEmpty(attrs, "stormname");
        if (name.size() == 0) return null;
        let wind = natFromFloat(attrs, "maxwind");
        let mslp = natFromFloat(attrs, "mslp");
        let dir = natFromFloat(attrs, "tcdir");
        let spd = natFromFloat(attrs, "tcspd");
        let fcst = natFromFloat(attrs, "fcstprd");
        let cat = natFromFloat(attrs, "ssnum");
        let adv = textOrEmpty(attrs, "advisnum");
        let basin = textOrEmpty(attrs, "basin");
        let wallet = walletFromSource(textOrEmpty(attrs, "idp_source"));
        ?("{"
          # "\"stormname\":\"" # jsonEscape(name) # "\","
          # "\"wallet\":\"" # jsonEscape(wallet) # "\","
          # "\"maxwind\":" # Nat.toText(wind) # ","
          # "\"mslp\":" # Nat.toText(mslp) # ","
          # "\"tcdir\":" # Nat.toText(dir) # ","
          # "\"tcspd\":" # Nat.toText(spd) # ","
          # "\"fcstprd\":" # Nat.toText(fcst) # ","
          # "\"ssnum\":" # Nat.toText(cat) # ","
          # "\"advisnum\":\"" # jsonEscape(adv) # "\","
          # "\"basin\":\"" # jsonEscape(basin) # "\","
          # "\"lat\":" # lat # ",\"lng\":" # lng
          # "}");
      };
      case "outlook" {
        let basin = textOrEmpty(attrs, "basin");
        ?("{"
          # "\"basin\":\"" # jsonEscape(basin) # "\","
          # "\"prob2day\":\"" # jsonEscape(textOrEmpty(attrs, "prob2day")) # "\","
          # "\"risk2day\":\"" # jsonEscape(textOrEmpty(attrs, "risk2day")) # "\","
          # "\"prob7day\":\"" # jsonEscape(textOrEmpty(attrs, "prob7day")) # "\","
          # "\"risk7day\":\"" # jsonEscape(textOrEmpty(attrs, "risk7day")) # "\","
          # "\"lat\":" # lat # ",\"lng\":" # lng
          # "}");
      };
      case "past" {
        let name = textOrEmpty(attrs, "stormname");
        if (name.size() == 0) return null;
        let wind = natFromFloat(attrs, "maxwind");
        let valid = textOrEmpty(attrs, "validtime");
        ?("{"
          # "\"stormname\":\"" # jsonEscape(name) # "\","
          # "\"maxwind\":" # Nat.toText(wind) # ","
          # "\"validtime\":\"" # jsonEscape(valid) # "\","
          # "\"lat\":" # lat # ",\"lng\":" # lng
          # "}");
      };
      case _ null;
    };
  };

  public func parseForecastStorms(body : Blob, now : Int) : Result.Result<[Hub.TropicalStorm], Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) {
        let arr = switch (mapField(root, "features")) {
          case (?#Array(a)) a;
          case _ return #err("Missing features");
        };
        // Group by storm name — tau=0 is current, rest is forecast track.
        var byName : [(Text, [Hub.ForecastPoint])] = [];
        for (v in arr.vals()) {
          switch (v) {
            case (#Map(f)) {
              let name = textOrEmpty(f, "stormname");
              if (name.size() == 0) continue;
              let lat = switch (floatField(f, "lat")) { case (?v) v; case null 0.0 };
              let lng = switch (floatField(f, "lng")) { case (?v) v; case null 0.0 };
              let wind = switch (natField(f, "maxwind")) { case (?n) n; case null 0 };
              let mslp = switch (natField(f, "mslp")) { case (?n) n; case null 0 };
              let fcst = switch (natField(f, "fcstprd")) { case (?n) n; case null 0 };
              let cat = switch (natField(f, "ssnum")) { case (?n) n; case null 0 };
              let pt : Hub.ForecastPoint = {
                lat;
                lng;
                maxWindKt = wind;
                pressureMb = mslp;
                forecastHour = fcst;
                category = cat;
                pointLabel = if (fcst == 0) "Now" else Nat.toText(fcst) # "h";
              };
              byName := upsertForecast(byName, name, pt);
            };
            case _ {};
          };
        };
        var out : [Hub.TropicalStorm] = [];
        for ((rawName, pts) in byName.vals()) {
          switch (buildStormFromForecast(rawName, pts, arr, now)) {
            case (?st) out := Array.concat(out, [st]);
            case null {};
          };
        };
        #ok(out);
      };
      case (#ok(_)) #err("Expected object");
    };
  };

  /// ATCF wallet ("al032026") from idp_source ("al032026-004_5day_pts").
  /// Empty string when the source doesn't lead with a valid wallet.
  func walletFromSource(src : Text) : Text {
    var out = "";
    var i = 0;
    for (c in src.chars()) {
      if (i >= 8) return out;
      if (i < 2) {
        let lower = if (c >= 'A' and c <= 'Z') {
          Char.fromNat32(Char.toNat32(c) + 32);
        } else { c };
        if (lower < 'a' or lower > 'z') return "";
        out #= Text.fromChar(lower);
      } else {
        if (c < '0' or c > '9') return "";
        out #= Text.fromChar(c);
      };
      i += 1;
    };
    if (i == 8) out else "";
  };

  /// Unique (wallet, stormName) pairs from a canonical forecast body.
  public func extractWallets(body : Blob) : [(Text, Text)] {
    switch (JsonMini.parse(body)) {
      case (#err(_)) [];
      case (#ok(#Map(root))) {
        let arr = switch (mapField(root, "features")) {
          case (?#Array(a)) a;
          case _ return [];
        };
        var out : [(Text, Text)] = [];
        label feats for (v in arr.vals()) {
          switch (v) {
            case (#Map(f)) {
              let wallet = textOrEmpty(f, "wallet");
              if (wallet.size() != 8) continue feats;
              for ((w, _) in out.vals()) {
                if (w == wallet) continue feats;
              };
              out := Array.concat(out, [(wallet, textOrEmpty(f, "stormname"))]);
            };
            case _ {};
          };
        };
        out;
      };
      case (#ok(_)) [];
    };
  };

  func buildStormFromForecast(
    rawName : Text,
    pts : [Hub.ForecastPoint],
    features : [ICRC7.Value],
    now : Int,
  ) : ?Hub.TropicalStorm {
    if (pts.size() == 0) return null;
    let (classification, name) = classifyStormName(rawName);
    var current : ?Hub.ForecastPoint = null;
    var forecast : [Hub.ForecastPoint] = [];
    for (p in pts.vals()) {
      if (p.forecastHour == 0) { current := ?p }
      else { forecast := Array.concat(forecast, [p]) };
    };
    let cur = switch (current) {
      case (?c) c;
      case null pts[0];
    };
    let id = slugId(name);
    let (dir, spd, adv) = metaFromFeatures(features, rawName);
    let basin = basinFromLng(cur.lng);
    ?{
      id;
      name;
      basin;
      classification;
      advisoryNum = adv;
      lat = cur.lat;
      lng = cur.lng;
      maxWindKt = cur.maxWindKt;
      pressureMb = cur.pressureMb;
      movementText = movementText(dir, spd);
      movementDirDeg = dir;
      movementSpeedKt = spd;
      validAt = now;
      track = [{
        timeUtc = "now";
        lat = cur.lat;
        lng = cur.lng;
        maxWindKt = cur.maxWindKt;
      }];
      forecastTrack = forecast;
    };
  };

  func metaFromFeatures(features : [ICRC7.Value], stormName : Text) : (Nat, Nat, Nat) {
    var dir : Nat = 0;
    var spd : Nat = 0;
    var adv : Nat = 0;
    for (v in features.vals()) {
      switch (v) {
        case (#Map(f)) {
          if (textOrEmpty(f, "stormname") == stormName) {
            switch (natField(f, "tcdir")) { case (?n) dir := n; case null {} };
            switch (natField(f, "tcspd")) { case (?n) spd := n; case null {} };
            switch (natField(f, "advisnum")) {
              case (?n) adv := n;
              case null {
                let t = textOrEmpty(f, "advisnum");
                switch (parseNatText(t)) { case (?n) adv := n; case null {} };
              };
            };
          };
        };
        case _ {};
      };
    };
    (dir, spd, adv);
  };

  public func parseDevelopmentOutlooks(body : Blob) : Result.Result<[Hub.DevelopmentOutlook], Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) {
        let arr = switch (mapField(root, "features")) {
          case (?#Array(a)) a;
          case _ return #err("Missing features");
        };
        var out : [Hub.DevelopmentOutlook] = [];
        for (v in arr.vals()) {
          switch (v) {
            case (#Map(f)) {
              let lat = switch (floatField(f, "lat")) { case (?v) v; case null 0.0 };
              let lng = switch (floatField(f, "lng")) { case (?v) v; case null 0.0 };
              out := Array.concat(out, [{
                basin = textOrEmpty(f, "basin");
                prob2Day = textOrEmpty(f, "prob2day");
                risk2Day = textOrEmpty(f, "risk2day");
                prob7Day = textOrEmpty(f, "prob7day");
                risk7Day = textOrEmpty(f, "risk7day");
                centroidLat = lat;
                centroidLng = lng;
              }]);
            };
            case _ {};
          };
        };
        #ok(out);
      };
      case (#ok(_)) #err("Expected object");
    };
  };

  public func parsePastTrack(body : Blob) : Result.Result<[(Text, Hub.StormTrackPoint)], Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) {
        let arr = switch (mapField(root, "features")) {
          case (?#Array(a)) a;
          case _ return #err("Missing features");
        };
        var out : [(Text, Hub.StormTrackPoint)] = [];
        for (v in arr.vals()) {
          switch (v) {
            case (#Map(f)) {
              let name = textOrEmpty(f, "stormname");
              let lat = switch (floatField(f, "lat")) { case (?v) v; case null continue };
              let lng = switch (floatField(f, "lng")) { case (?v) v; case null continue };
              let wind = switch (natField(f, "maxwind")) { case (?n) n; case null 0 };
              let t = textOrEmpty(f, "validtime");
              let key = slugId(name);
              out := Array.concat(out, [(key, {
                timeUtc = if (t.size() > 0) t else "past";
                lat;
                lng;
                maxWindKt = wind;
              })]);
            };
            case _ {};
          };
        };
        #ok(out);
      };
      case (#ok(_)) #err("Expected object");
    };
  };

  public func mergePastTracks(
    storms : [Hub.TropicalStorm],
    past : [(Text, Hub.StormTrackPoint)],
  ) : [Hub.TropicalStorm] {
    Array.map(
      storms,
      func(st : Hub.TropicalStorm) : Hub.TropicalStorm {
        var pts : [Hub.StormTrackPoint] = [];
        for ((id, p) in past.vals()) {
          if (id == st.id or Text.contains(st.name, #text id)) {
            pts := Array.concat(pts, [p]);
          };
        };
        if (pts.size() == 0) { st } else {
          { st with track = appendTrackBounded(st.track, pts, 40) };
        };
      },
    );
  };

  public func computeAceStats(
    storms : [Hub.TropicalStorm],
    previous : ?Hub.TropicalSummary,
  ) : Hub.AceSeasonStats {
    var entries : [Hub.AceStormEntry] = [];
    var total : Float = 0.0;
    for (st in storms.vals()) {
      let ace = stormAce(st);
      if (ace > 0.01) {
        total += ace;
        entries := Array.concat(entries, [{
          name = st.name;
          ace;
          maxWindKt = st.maxWindKt;
        }]);
      };
    };
    // Carry forward retired storms from previous cache.
    switch (previous) {
      case (?prev) {
        for (e in prev.aceStats.storms.vals()) {
          let stillActive = Array.find<Hub.TropicalStorm>(
            storms,
            func(s) { s.name == e.name },
          );
          switch (stillActive) {
            case null {
              total += e.ace;
              entries := Array.concat(entries, [e]);
            };
            case (?_) {};
          };
        };
      };
      case null {};
    };
    {
      seasonTotal = total;
      seasonAverage = ACE_SEASON_AVERAGE;
      seasonRecord = ACE_SEASON_RECORD;
      storms = entries;
      seasonNames = ATLANTIC_SEASON_NAMES;
    };
  };

  func stormAce(st : Hub.TropicalStorm) : Float {
    // ACE = sum(Vmax^2)/10^4 for 6-hour synoptic periods at TS strength+.
    var sum : Float = 0.0;
    for (p in st.track.vals()) {
      if (p.maxWindKt >= 34) {
        let v = Float.fromInt(Nat.toInt(p.maxWindKt));
        sum += (v * v) / 10000.0;
      };
    };
    sum;
  };

  func appendTrackBounded(
    base : [Hub.StormTrackPoint],
    add : [Hub.StormTrackPoint],
    max : Nat,
  ) : [Hub.StormTrackPoint] {
    let merged = Array.concat(base, add);
    if (merged.size() <= max) merged else {
      var out : [Hub.StormTrackPoint] = [];
      var i = merged.size() - max;
      while (i < merged.size()) {
        out := Array.concat(out, [merged[i]]);
        i += 1;
      };
      out;
    };
  };

  func upsertForecast(
    list : [(Text, [Hub.ForecastPoint])],
    name : Text,
    pt : Hub.ForecastPoint,
  ) : [(Text, [Hub.ForecastPoint])] {
    var found = false;
    var out : [(Text, [Hub.ForecastPoint])] = [];
    for ((n, pts) in list.vals()) {
      if (n == name) {
        found := true;
        out := Array.concat(out, [(n, Array.concat(pts, [pt]))]);
      } else {
        out := Array.concat(out, [(n, pts)]);
      };
    };
    if (not found) { Array.concat(out, [(name, [pt])]) } else { out };
  };

  func classifyStormName(raw : Text) : (Text, Text) {
    if (Text.startsWith(raw, #text "Hurricane ")) {
      ("HU", stripPrefix(raw, "Hurricane "));
    } else if (Text.startsWith(raw, #text "Tropical Storm ")) {
      ("TS", stripPrefix(raw, "Tropical Storm "));
    } else if (Text.startsWith(raw, #text "Tropical Depression ")) {
      ("TD", stripPrefix(raw, "Tropical Depression "));
    } else if (Text.startsWith(raw, #text "Post-Tropical Cyclone ")) {
      ("PTC", stripPrefix(raw, "Post-Tropical Cyclone "));
    } else if (Text.startsWith(raw, #text "Potential Tropical Cyclone ")) {
      ("PTC", stripPrefix(raw, "Potential Tropical Cyclone "));
    } else {
      ("TC", raw);
    };
  };

  func stripPrefix(t : Text, prefix : Text) : Text {
    switch (Text.stripStart(t, #text prefix)) {
      case (?rest) rest;
      case null t;
    };
  };

  func slugId(name : Text) : Text {
    Text.replace(name, #char ' ', "").toLower();
  };

  func movementText(dir : Nat, spd : Nat) : Text {
    if (spd == 0) { "Nearly stationary" }
    else {
      let compass = compassFromDeg(dir);
      Nat.toText(spd) # " kt " # compass;
    };
  };

  func compassFromDeg(deg : Nat) : Text {
    let d = deg % 360;
    if (d < 23 or d >= 338) "N"
    else if (d < 68) "NE"
    else if (d < 113) "E"
    else if (d < 158) "SE"
    else if (d < 203) "S"
    else if (d < 248) "SW"
    else if (d < 293) "W"
    else "NW";
  };

  func basinFromLng(lng : Float) : Hub.StormBasin {
    if (lng > -100.0 and lng < -20.0) { #atlantic } else { #eastPacific };
  };

  func geomLatLng(f : [(Text, ICRC7.Value)]) : (Text, Text) {
    switch (mapField(f, "geometry")) {
      case (?#Map(g)) {
        let lat = switch (floatField(g, "y")) {
          case (?v) v.format(#fix 2);
          case null "0";
        };
        let lng = switch (floatField(g, "x")) {
          case (?v) v.format(#fix 2);
          case null "0";
        };
        (lat, lng);
      };
      case _ {
        let lat = switch (floatField(f, "lat")) {
          case (?v) v.format(#fix 2);
          case null "0";
        };
        let lng = switch (floatField(f, "lng")) {
          case (?v) v.format(#fix 2);
          case null "0";
        };
        (lat, lng);
      };
    };
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

  func natFromFloat(entries : [(Text, ICRC7.Value)], key : Text) : Nat {
    switch (natField(entries, key)) {
      case (?n) n;
      case null {
        switch (floatField(entries, key)) {
          case (?f) if (f < 0.0) 0 else Int.abs(Float.nearest(f).toInt());
          case null 0;
        };
      };
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
      } else if (not valid) {
        return null;
      };
    };
    if (not valid) return null;
    let signed = if (neg) -intPart else intPart;
    let whole = Float.fromInt(signed);
    if (fracDiv == 1) { ?whole }
    else {
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
