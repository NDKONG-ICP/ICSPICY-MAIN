// migrations/PhaseWeatherDeskV2.mo
// One-time stable upgrade: Weather Desk v2 (tropical NOAA, 4-model spread, almanac).
//
// Attach in main.mo ONLY for the mainnet cutover from pre-v2 weather hub wasm:
//   import WeatherDeskMigration "migrations/PhaseWeatherDeskV2";
//   (with WeatherDeskMigration.migration)
//
// After cutover succeeds, remove the hook — subsequent upgrades use Hub types directly.

import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Hub "../types/weather-hub";

module {
  // ── Mainnet-stable weather types (retired wasm) ───────────────────────────

  type OldModelDay = {
    date : Text;
    precipInches : Float;
    tempHighF : Float;
  };

  type OldModelSpread = {
    gfs : [OldModelDay];
    ecmwf : [OldModelDay];
  };

  type OldDailyOutlook = {
    date : Text;
    tempHighF : Float;
    tempLowF : Float;
    precipInches : Float;
    uvIndexMax : Float;
    windMphMax : Float;
    weatherCode : Nat;
  };

  type OldCurrentConditions = {
    tempF : Float;
    feelsLikeF : Float;
    humidity : Float;
    precipInches : Float;
    uvIndex : Float;
    windMph : Float;
    windDirDeg : Float;
    weatherCode : Nat;
    pressureHpa : Float;
  };

  type OldAirQuality = {
    usAqi : Nat;
    pm25 : Float;
    pm10 : Float;
  };

  type OldWeatherOutlook = {
    gridKey : Text;
    lat : Float;
    lng : Float;
    fetchedAt : Int;
    source : Text;
    current : OldCurrentConditions;
    daily : [OldDailyOutlook];
    airQuality : ?OldAirQuality;
    models : ?OldModelSpread;
    stale : Bool;
  };

  type OldStormBasin = { #atlantic; #eastPacific };

  type OldStormTrackPoint = {
    timeUtc : Text;
    lat : Float;
    lng : Float;
    maxWindKt : Nat;
  };

  type OldTropicalStorm = {
    id : Text;
    name : Text;
    basin : OldStormBasin;
    classification : Text;
    advisoryNum : Nat;
    lat : Float;
    lng : Float;
    maxWindKt : Nat;
    movementText : Text;
    validAt : Int;
    track : [OldStormTrackPoint];
  };

  type OldTropicalSummary = {
    fetchedAt : Int;
    seasonActive : Bool;
    storms : [OldTropicalStorm];
    disclaimer : Text;
  };

  // ── Post-upgrade types (current wasm) ─────────────────────────────────────

  type NewModelSpread = Hub.ModelSpread;
  type NewWeatherOutlook = Hub.WeatherOutlook;
  type NewTropicalSummary = Hub.TropicalSummary;

  func defaultAceStats() : Hub.AceSeasonStats {
    {
      seasonTotal = 0.0;
      seasonAverage = 13.0;
      seasonRecord = 85.0;
      storms = [];
      seasonNames = TropicalNoaaNames();
    };
  };

  func TropicalNoaaNames() : [Text] {
    [
      "Arthur", "Bertha", "Cristobal", "Dolly", "Edouard", "Fay", "Gonzalo",
      "Hanna", "Isaias", "Josephine", "Kyle", "Laura", "Marco", "Nana",
      "Omar", "Paulette", "Rene", "Sally", "Teddy", "Vicky", "Wilfred",
    ]
  };

  func migrateModelSpread(old : ?OldModelSpread) : ?NewModelSpread {
    switch (old) {
      case null null;
      case (?m) {
        ?{
          gfs = m.gfs;
          ecmwf = m.ecmwf;
          icon = [];
          gem = [];
          ensemble = null;
          agreementScore = 50;
        }
      };
    };
  };

  func migrateOutlook(o : OldWeatherOutlook) : NewWeatherOutlook {
    {
      gridKey = o.gridKey;
      lat = o.lat;
      lng = o.lng;
      fetchedAt = o.fetchedAt;
      source = o.source;
      current = o.current;
      daily = o.daily;
      airQuality = o.airQuality;
      models = migrateModelSpread(o.models);
      stale = true;
    };
  };

  func migrateWeatherGrid(
    old : Map.Map<Text, OldWeatherOutlook>,
  ) : Map.Map<Text, NewWeatherOutlook> {
    let next = Map.empty<Text, NewWeatherOutlook>();
    for ((k, v) in old.entries()) {
      Map.add(next, Text.compare, k, migrateOutlook(v));
    };
    next;
  };

  func migrateStorm(st : OldTropicalStorm) : Hub.TropicalStorm {
    {
      id = st.id;
      name = st.name;
      basin = st.basin;
      classification = st.classification;
      advisoryNum = st.advisoryNum;
      lat = st.lat;
      lng = st.lng;
      maxWindKt = st.maxWindKt;
      pressureMb = 0;
      movementText = st.movementText;
      movementDirDeg = 0;
      movementSpeedKt = 0;
      validAt = st.validAt;
      track = st.track;
      forecastTrack = [];
    };
  };

  func migrateTropicalSummary(old : ?OldTropicalSummary) : ?NewTropicalSummary {
    switch (old) {
      case null null;
      case (?s) {
        let storms = Array.map<OldTropicalStorm, Hub.TropicalStorm>(
          s.storms,
          migrateStorm,
        );
        ?{
          fetchedAt = s.fetchedAt;
          seasonActive = s.seasonActive;
          storms;
          developmentOutlooks = [];
          aceStats = defaultAceStats();
          dataSource = "migrated";
          disclaimer = s.disclaimer;
        };
      };
    };
  };

  public func migration(
    old : {
      tropicalSummary : ?OldTropicalSummary;
      weatherGridCache : Map.Map<Text, OldWeatherOutlook>;
    },
  ) : {
    tropicalSummary : ?NewTropicalSummary;
    weatherGridCache : Map.Map<Text, NewWeatherOutlook>;
  } {
    {
      tropicalSummary = migrateTropicalSummary(old.tropicalSummary);
      weatherGridCache = migrateWeatherGrid(old.weatherGridCache);
    };
  };
};
