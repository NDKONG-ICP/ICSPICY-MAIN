import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Char "mo:core/Char";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Int "mo:core/Int";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Types "../types/plants";
import Common "../types/common";
import ICRC7 "../types/icrc7";
import JsonMini "json-mini";

module {
  public let NURSERY_LAT : Float = 26.9767;
  public let NURSERY_LNG : Float = -82.0837;

  public type ParsedDailyWeather = {
    date : Text;
    tempHighF : Float;
    tempLowF : Float;
    humidity : Float;
    rainfallInches : Float;
    uvIndex : Float;
    windMph : Float;
  };

  public func forecastUrl() : Text {
    "https://api.open-meteo.com/v1/forecast?"
    # "latitude=" # Float.toText(NURSERY_LAT)
    # "&longitude=" # Float.toText(NURSERY_LNG)
    # "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max"
    # "&current=relative_humidity_2m,wind_speed_10m"
    # "&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph"
    # "&timezone=America%2FNew_York&forecast_days=1";
  };

  public func archiveUrl(startDate : Text, endDate : Text) : Text {
    "https://archive-api.open-meteo.com/v1/archive?"
    # "latitude=" # Float.toText(NURSERY_LAT)
    # "&longitude=" # Float.toText(NURSERY_LNG)
    # "&start_date=" # startDate
    # "&end_date=" # endDate
    # "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max"
    # "&hourly=relative_humidity_2m,wind_speed_10m"
    # "&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph"
    # "&timezone=America%2FNew_York";
  };

  public func snapshotFromParsed(parsed : ParsedDailyWeather, sourcePrefix : Text) : Types.WeatherSnapshot {
    {
      date = parsed.date;
      tempHighF = parsed.tempHighF;
      tempLowF = parsed.tempLowF;
      humidity = parsed.humidity;
      rainfallInches = parsed.rainfallInches;
      uvIndex = parsed.uvIndex;
      source = sourcePrefix # "|wind:" # Float.toText(parsed.windMph);
    };
  };

  public func parseForecastResponse(body : Blob) : Result.Result<ParsedDailyWeather, Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) parseDailyWeather(root, true);
      case (#ok(_)) #err("Expected JSON object");
    };
  };

  public func parseArchiveResponse(body : Blob) : Result.Result<[ParsedDailyWeather], Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) parseArchiveDailySeries(root);
      case (#ok(_)) #err("Expected JSON object");
    };
  };

  func parseDailyWeather(
    root : [(Text, ICRC7.Value)],
    includeCurrent : Bool,
  ) : Result.Result<ParsedDailyWeather, Text> {
    switch (mapField(root, "daily")) {
      case (?#Map(daily)) {
        let dates = switch (textArrayField(daily, "time")) {
          case (?d) d;
          case null return #err("Missing daily.time");
        };
        if (dates.size() == 0) return #err("Empty daily.time");
        let date = dates[0];
        let high = switch (floatArrayField(daily, "temperature_2m_max")) {
          case (?vals) vals[0];
          case null return #err("Missing daily.temperature_2m_max");
        };
        let low = switch (floatArrayField(daily, "temperature_2m_min")) {
          case (?vals) vals[0];
          case null return #err("Missing daily.temperature_2m_min");
        };
        let rain = switch (floatArrayField(daily, "precipitation_sum")) {
          case (?vals) vals[0];
          case null 0.0;
        };
        let uv = switch (floatArrayField(daily, "uv_index_max")) {
          case (?vals) vals[0];
          case null 0.0;
        };
        let (humidity, wind) = if (includeCurrent) {
          switch (mapField(root, "current")) {
            case (?#Map(current)) {
              let h = switch (floatField(current, "relative_humidity_2m")) {
                case (?v) v;
                case null 0.0;
              };
              let w = switch (floatField(current, "wind_speed_10m")) {
                case (?v) v;
                case null 0.0;
              };
              (h, w);
            };
            case _ (0.0, 0.0);
          };
        } else {
          (0.0, 0.0);
        };
        #ok({
          date = date;
          tempHighF = high;
          tempLowF = low;
          humidity = humidity;
          rainfallInches = rain;
          uvIndex = uv;
          windMph = wind;
        });
      };
      case _ #err("Missing daily block");
    };
  };

  func parseArchiveDailySeries(root : [(Text, ICRC7.Value)]) : Result.Result<[ParsedDailyWeather], Text> {
    switch (mapField(root, "daily")) {
      case (?#Map(daily)) {
        let dates = switch (textArrayField(daily, "time")) {
          case (?d) d;
          case null return #err("Missing daily.time");
        };
        let highs = switch (floatArrayField(daily, "temperature_2m_max")) {
          case (?d) d;
          case null return #err("Missing daily.temperature_2m_max");
        };
        let lows = switch (floatArrayField(daily, "temperature_2m_min")) {
          case (?d) d;
          case null return #err("Missing daily.temperature_2m_min");
        };
        let rains = switch (floatArrayField(daily, "precipitation_sum")) {
          case (?d) d;
          case null Array.repeat(0.0, dates.size());
        };
        let uvs = switch (floatArrayField(daily, "uv_index_max")) {
          case (?d) d;
          case null Array.repeat(0.0, dates.size());
        };
        if (dates.size() != highs.size() or dates.size() != lows.size()) {
          return #err("Daily array length mismatch");
        };
        var out : [ParsedDailyWeather] = [];
        var i : Nat = 0;
        while (i < dates.size()) {
          let rain = if (i < rains.size()) rains[i] else 0.0;
          let uv = if (i < uvs.size()) uvs[i] else 0.0;
          out := Array.concat(out, [{
            date = dates[i];
            tempHighF = highs[i];
            tempLowF = lows[i];
            humidity = 0.0;
            rainfallInches = rain;
            uvIndex = uv;
            windMph = 0.0;
          }]);
          i += 1;
        };
        #ok(out);
      };
      case _ #err("Missing daily block");
    };
  };

  func mapField(entries : [(Text, ICRC7.Value)], key : Text) : ?ICRC7.Value {
    for ((k, v) in entries.vals()) {
      if (k == key) return ?v;
    };
    null;
  };

  func floatField(entries : [(Text, ICRC7.Value)], key : Text) : ?Float {
    switch (mapField(entries, key)) {
      case (?v) valueAsFloat(v);
      case null null;
    };
  };

  func textArrayField(entries : [(Text, ICRC7.Value)], key : Text) : ?[Text] {
    switch (mapField(entries, key)) {
      case (?#Array(arr)) {
        var out : [Text] = [];
        for (v in arr.vals()) {
          switch (v) {
            case (#Text t) out := Array.concat(out, [t]);
            case _ return null;
          };
        };
        ?out;
      };
      case _ null;
    };
  };

  func floatArrayField(entries : [(Text, ICRC7.Value)], key : Text) : ?[Float] {
    switch (mapField(entries, key)) {
      case (?#Array(arr)) {
        var out : [Float] = [];
        for (v in arr.vals()) {
          switch (valueAsFloat(v)) {
            case (?f) out := Array.concat(out, [f]);
            case null return null;
          };
        };
        ?out;
      };
      case _ null;
    };
  };

  func valueAsFloat(v : ICRC7.Value) : ?Float {
    switch (v) {
      case (#Text t) parseDecimalText(t);
      case (#Nat n) ?Float.fromInt(Nat.toInt(n));
      case (#Int i) ?Float.fromInt(i);
      case _ null;
    };
  };

  func parseDecimalText(t : Text) : ?Float {
    var intPart : Int = 0;
    var fracPart : Nat = 0;
    var fracDivisor : Nat = 1;
    var inFrac = false;
    var negative = false;
    var valid = false;
    var started = false;
    for (c in t.toIter()) {
      if (c == '-') {
        if (not started) {
          negative := true;
        } else {
          return null;
        };
      } else if (c >= '0' and c <= '9') {
        started := true;
        valid := true;
        let digit = Char.toNat32(c) - Char.toNat32('0');
        if (inFrac) {
          fracPart := fracPart * 10 + Nat32.toNat(digit);
          fracDivisor := fracDivisor * 10;
        } else {
          intPart := intPart * 10 + Int.fromNat(Nat32.toNat(digit));
        };
      } else if (c == '.') {
        if (inFrac) return null;
        inFrac := true;
        started := true;
      } else if (valid) {
        // stop at trailing chars
      } else {
        return null;
      };
    };
    if (not valid) return null;
    let signedInt = if (negative) -intPart else intPart;
    let whole = Float.fromInt(signedInt);
    if (fracDivisor == 1) {
      ?whole;
    } else {
      let frac = Float.fromInt(Nat.toInt(fracPart)) / Float.fromInt(Nat.toInt(fracDivisor));
      if (negative) {
        ?(whole - frac);
      } else {
        ?(whole + frac);
      };
    };
  };
};
