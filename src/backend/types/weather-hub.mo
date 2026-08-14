// Weather Desk hub types (Phase 1+). Orthogonal to plant WeatherSnapshot.

import Blob "mo:core/Blob";

module {
  public type WeatherModel = { #gfs; #ecmwf; #icon; #gem };

  public type DailyOutlook = {
    date : Text;
    tempHighF : Float;
    tempLowF : Float;
    precipInches : Float;
    uvIndexMax : Float;
    windMphMax : Float;
    weatherCode : Nat;
  };

  public type CurrentConditions = {
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

  public type AirQuality = {
    usAqi : Nat;
    pm25 : Float;
    pm10 : Float;
  };

  public type ModelDay = {
    date : Text;
    precipInches : Float;
    tempHighF : Float;
  };

  public type EnsemblePlume = {
    dates : [Text];
    tempHighMembers : [[Float]];
    precipMembers : [[Float]];
    memberCount : Nat;
  };

  public type ModelSpread = {
    gfs : [ModelDay];
    ecmwf : [ModelDay];
    icon : [ModelDay];
    gem : [ModelDay];
    ensemble : ?EnsemblePlume;
    agreementScore : Nat; // 0–100 model confidence
  };

  public type WeatherOutlook = {
    gridKey : Text;
    lat : Float;
    lng : Float;
    fetchedAt : Int;
    source : Text;
    current : CurrentConditions;
    daily : [DailyOutlook];
    airQuality : ?AirQuality;
    models : ?ModelSpread;
    stale : Bool;
  };

  public type WeatherLocationKind = { #zip; #coords };

  public type WeatherLocation = {
    kind : WeatherLocationKind;
    zip : ?Text;
    lat : Float;
    lng : Float;
    displayLabel : Text;
    updatedAt : Int;
  };

  public type ZipCoord = {
    zip : Text;
    lat : Float;
    lng : Float;
    displayLabel : Text;
    fetchedAt : Int;
  };

  public type StormBasin = { #atlantic; #eastPacific };

  public type StormTrackPoint = {
    timeUtc : Text;
    lat : Float;
    lng : Float;
    maxWindKt : Nat;
  };

  public type ForecastPoint = {
    lat : Float;
    lng : Float;
    maxWindKt : Nat;
    pressureMb : Nat;
    forecastHour : Nat;
    category : Nat;
    pointLabel : Text;
  };

  public type DevelopmentOutlook = {
    basin : Text;
    prob2Day : Text;
    risk2Day : Text;
    prob7Day : Text;
    risk7Day : Text;
    centroidLat : Float;
    centroidLng : Float;
  };

  public type AceStormEntry = {
    name : Text;
    ace : Float;
    maxWindKt : Nat;
  };

  public type AceSeasonStats = {
    seasonTotal : Float;
    seasonAverage : Float;
    seasonRecord : Float;
    storms : [AceStormEntry];
    seasonNames : [Text];
  };

  public type TropicalStorm = {
    id : Text;
    name : Text;
    basin : StormBasin;
    classification : Text; // HU, TS, TD, etc.
    advisoryNum : Nat;
    lat : Float;
    lng : Float;
    maxWindKt : Nat;
    pressureMb : Nat;
    movementText : Text;
    movementDirDeg : Nat;
    movementSpeedKt : Nat;
    validAt : Int;
    track : [StormTrackPoint];
    forecastTrack : [ForecastPoint];
  };

  public type TropicalSummary = {
    fetchedAt : Int;
    seasonActive : Bool;
    storms : [TropicalStorm];
    developmentOutlooks : [DevelopmentOutlook];
    aceStats : AceSeasonStats;
    dataSource : Text;
    disclaimer : Text;
  };

  /// Raw gzipped ATCF a-deck (model guidance tracks) for one active storm.
  /// Decompressed and parsed client-side; the canister stores bytes verbatim.
  public type TropicalAdeck = {
    wallet : Text; // ATCF id, e.g. "al032026"
    stormName : Text;
    fetchedAt : Int;
    gz : Blob;
  };

  public type ModelGustDay = {
    date : Text;
    windGustsMph : Float;
  };

  /// Per-model daily wind gusts — side structure so ModelDay stays
  /// stable-compatible (WeatherOutlook lives in stable weatherGridCache).
  public type ModelGustSpread = {
    gridKey : Text;
    fetchedAt : Int;
    gfs : [ModelGustDay];
    ecmwf : [ModelGustDay];
    icon : [ModelGustDay];
    gem : [ModelGustDay];
  };

  public type AlertKind = {
    #heavyRain;
    #highWind;
    #extremeHeat;
    #highUv;
    #tropicalThreat;
    #nwsOfficial;
  };

  public type WeatherAlert = {
    id : Nat;
    kind : AlertKind;
    title : Text;
    body : Text;
    severity : { #info; #watch; #warning };
    createdAt : Int;
    expiresAt : Int;
    gridKey : Text;
  };

  public type WeatherBrief = {
    generatedAt : Int;
    gridKey : Text;
    text : Text;
    outlookFetchedAt : Int;
    tropicalFetchedAt : ?Int;
    almanacDateKey : ?Text;
  };

  public type DailyAlmanac = {
    dateKey : Text;
    publishedAt : Int;
    title : Text;
    body : Text;
    recipeSlug : ?Text;
    varietyIds : [Nat];
    retracted : Bool;
  };

  public type WeatherSourceKind = {
    #outlook;
    #tropical;
    #nws;
    #almanac;
    #airQuality;
    #model;
    #ensemble;
    #geocode;
  };

  public type WeatherFreshnessStatus = { #fresh; #stale; #error };

  public type WeatherSourceLedgerEntry = {
    id : Nat;
    fetchedAt : Int;
    kind : WeatherSourceKind;
    sourceUrl : Text;
    parserVersion : Text;
    gridKey : ?Text;
    bodyDigest : Text;
    httpStatus : Nat;
    status : WeatherFreshnessStatus;
  };

  public type CertifiedWeather<T> = {
    value : ?T;
    certificate : ?Blob;
    witness : Blob;
    bodyDigest : Text;
  };

};
