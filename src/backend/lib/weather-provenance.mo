import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Char "mo:core/Char";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Int "mo:core/Int";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Types "../types/plants";
import Hub "../types/weather-hub";
import Common "../types/common";
import ICRC7 "../types/icrc7";
import JsonMini "json-mini";
import WeatherGrid "weather-grid";

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

  public type ParsedGeocode = {
    lat : Float;
    lng : Float;
    name : Text;
    admin1 : Text;
  };

  public func forecastUrl() : Text {
    // api.open-meteo.com intermittently returns 502 from IC HTTP subnets;
    // historical-forecast-api serves live forecast data on stable infrastructure.
    "https://historical-forecast-api.open-meteo.com/v1/forecast?"
    # "latitude=26.9767"
    # "&longitude=-82.0837"
    # "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max"
    # "&current=relative_humidity_2m,wind_speed_10m"
    # "&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph"
    # "&timezone=America%2FNew_York&forecast_days=1";
  };

  public func archiveUrl(startDate : Text, endDate : Text) : Text {
    "https://archive-api.open-meteo.com/v1/archive?"
    # "latitude=26.9767"
    # "&longitude=-82.0837"
    # "&start_date=" # startDate
    # "&end_date=" # endDate
    # "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max"
    # "&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph"
    # "&timezone=America%2FNew_York";
  };

  /// 7-day outlook + current (no hourly) for Weather Desk hub.
  public func outlookUrl(lat : Float, lng : Float) : Text {
    "https://historical-forecast-api.open-meteo.com/v1/forecast?"
    # "latitude=" # lat.toText()
    # "&longitude=" # lng.toText()
    # "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,wind_speed_10m_max,weather_code"
    # "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,"
    # "surface_pressure,wind_speed_10m,wind_direction_10m,uv_index"
    # "&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph"
    # "&timezone=America%2FNew_York&forecast_days=7";
  };

  public func airQualityUrl(lat : Float, lng : Float) : Text {
    "https://air-quality-api.open-meteo.com/v1/air-quality?"
    # "latitude=" # lat.toText()
    # "&longitude=" # lng.toText()
    # "&current=us_aqi,pm2_5,pm10"
    # "&timezone=America%2FNew_York";
  };

  public func geocodeZipUrl(zip : Text) : Text {
    "https://geocoding-api.open-meteo.com/v1/search?"
    # "name=" # zip
    # "&count=1&language=en&format=json&countryCode=US";
  };

  /// Model desk: daily precip, high, and wind gusts per model.
  public func modelOutlookUrl(lat : Float, lng : Float, model : Text) : Text {
    "https://historical-forecast-api.open-meteo.com/v1/forecast?"
    # "latitude=" # lat.toText()
    # "&longitude=" # lng.toText()
    # "&daily=temperature_2m_max,precipitation_sum,wind_gusts_10m_max"
    # "&models=" # model
    # "&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph"
    # "&timezone=America%2FNew_York&forecast_days=7";
  };

  public let MODEL_GFS : Text = "gfs_seamless";
  public let MODEL_ECMWF : Text = "ecmwf_ifs025";
  public let MODEL_ICON : Text = "icon_seamless";
  public let MODEL_GEM : Text = "gem_seamless";

  public func ensembleUrl(lat : Float, lng : Float) : Text {
    "https://ensemble-api.open-meteo.com/v1/ensemble?"
    # "latitude=" # lat.toText()
    # "&longitude=" # lng.toText()
    # "&daily=temperature_2m_max,precipitation_sum"
    # "&models=gfs025"
    # "&temperature_unit=fahrenheit&precipitation_unit=inch"
    # "&timezone=America%2FNew_York&forecast_days=7";
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

  public func parseOutlookResponse(
    body : Blob,
    lat : Float,
    lng : Float,
    airQuality : ?Hub.AirQuality,
  ) : Result.Result<Hub.WeatherOutlook, Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) {
        let daily = switch (parseOutlookDaily(root)) {
          case (#err(e)) return #err(e);
          case (#ok(d)) d;
        };
        let current = switch (parseOutlookCurrent(root, daily)) {
          case (#err(e)) return #err(e);
          case (#ok(c)) c;
        };
        let rLat = WeatherGrid.roundToTenth(lat);
        let rLng = WeatherGrid.roundToTenth(lng);
        #ok({
          gridKey = WeatherGrid.gridKey(lat, lng);
          lat = rLat;
          lng = rLng;
          fetchedAt = Time.now();
          source = "open-meteo|historical-forecast";
          current;
          daily;
          airQuality;
          models = null;
          stale = false;
        });
      };
      case (#ok(_)) #err("Expected JSON object");
    };
  };

  public func parseAirQualityResponse(body : Blob) : Result.Result<Hub.AirQuality, Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) {
        switch (mapField(root, "current")) {
          case (?#Map(cur)) {
            let aqi = switch (natField(cur, "us_aqi")) {
              case (?n) n;
              case null 0;
            };
            let pm25 = switch (floatField(cur, "pm2_5")) {
              case (?v) v;
              case null 0.0;
            };
            let pm10 = switch (floatField(cur, "pm10")) {
              case (?v) v;
              case null 0.0;
            };
            #ok({ usAqi = aqi; pm25; pm10 });
          };
          case _ #err("Missing current block");
        };
      };
      case (#ok(_)) #err("Expected JSON object");
    };
  };

  public func parseGeocodeResponse(body : Blob) : Result.Result<ParsedGeocode, Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) {
        switch (mapField(root, "results")) {
          case (?#Array(arr)) {
            if (arr.size() == 0) return #err("No geocode results");
            switch (arr[0]) {
              case (#Map(r)) {
                let lat = switch (floatField(r, "latitude")) {
                  case (?v) v;
                  case null return #err("Missing latitude");
                };
                let lng = switch (floatField(r, "longitude")) {
                  case (?v) v;
                  case null return #err("Missing longitude");
                };
                let name = switch (textField(r, "name")) {
                  case (?t) t;
                  case null "";
                };
                let admin1 = switch (textField(r, "admin1")) {
                  case (?t) t;
                  case null "";
                };
                #ok({ lat; lng; name; admin1 });
              };
              case _ #err("Invalid geocode result");
            };
          };
          case _ #err("Missing results");
        };
      };
      case (#ok(_)) #err("Expected JSON object");
    };
  };

  public func parseModelDaysResponse(body : Blob) : Result.Result<[Hub.ModelDay], Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) {
        switch (mapField(root, "daily")) {
          case (?#Map(daily)) {
            let dates = switch (textArrayField(daily, "time")) {
              case (?d) d;
              case null return #err("Missing daily.time");
            };
            let rains = switch (floatArrayField(daily, "precipitation_sum")) {
              case (?d) d;
              case null Array.repeat(0.0, dates.size());
            };
            let highs = switch (floatArrayField(daily, "temperature_2m_max")) {
              case (?d) d;
              case null Array.repeat(0.0, dates.size());
            };
            var out : [Hub.ModelDay] = [];
            var i : Nat = 0;
            let n = dates.size();
            let limit = if (n > 7) 7 else n;
            while (i < limit) {
              out := Array.concat(out, [{
                date = dates[i];
                precipInches = if (i < rains.size()) rains[i] else 0.0;
                tempHighF = if (i < highs.size()) highs[i] else 0.0;
              }]);
              i += 1;
            };
            #ok(out);
          };
          case _ #err("Missing daily");
        };
      };
      case (#ok(_)) #err("Expected JSON object");
    };
  };

  /// Daily wind gusts from a canonical model body. [] when absent.
  public func parseModelGustDays(body : Blob) : [Hub.ModelGustDay] {
    switch (JsonMini.parse(body)) {
      case (#err(_)) [];
      case (#ok(#Map(root))) {
        switch (mapField(root, "daily")) {
          case (?#Map(daily)) {
            let dates = switch (textArrayField(daily, "time")) {
              case (?d) d;
              case null return [];
            };
            let gusts = switch (floatArrayField(daily, "wind_gusts_10m_max")) {
              case (?d) d;
              case null return [];
            };
            var out : [Hub.ModelGustDay] = [];
            var i : Nat = 0;
            let n = dates.size();
            let limit = if (n > 7) 7 else n;
            while (i < limit) {
              out := Array.concat(out, [{
                date = dates[i];
                windGustsMph = if (i < gusts.size()) gusts[i] else 0.0;
              }]);
              i += 1;
            };
            out;
          };
          case _ [];
        };
      };
      case (#ok(_)) [];
    };
  };

  public func parseEnsemblePlume(body : Blob) : Result.Result<Hub.EnsemblePlume, Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) #err(e);
      case (#ok(#Map(root))) {
        switch (mapField(root, "daily")) {
          case (?#Map(daily)) {
            let dates = switch (textArrayField(daily, "time")) {
              case (?d) d;
              case null return #err("Missing daily.time");
            };
            var tempMembers : [[Float]] = [];
            var precipMembers : [[Float]] = [];
            var memberIdx : Nat = 1;
            while (memberIdx <= 20) {
              let suffix = padMember(memberIdx);
              let tKey = "temperature_2m_max_member" # suffix;
              let pKey = "precipitation_sum_member" # suffix;
              switch (floatArrayField(daily, tKey), floatArrayField(daily, pKey)) {
                case (?tVals, ?pVals) {
                  tempMembers := Array.concat(tempMembers, [tVals]);
                  precipMembers := Array.concat(precipMembers, [pVals]);
                };
                case _ {};
              };
              memberIdx += 1;
            };
            if (tempMembers.size() == 0) {
              return #err("No ensemble members");
            };
            #ok({
              dates;
              tempHighMembers = tempMembers;
              precipMembers;
              memberCount = tempMembers.size();
            });
          };
          case _ #err("Missing daily");
        };
      };
      case (#ok(_)) #err("Expected JSON object");
    };
  };

  func padMember(n : Nat) : Text {
    if (n < 10) { "0" # Nat.toText(n) } else { Nat.toText(n) };
  };

  public func computeAgreementScore(
    gfs : [Hub.ModelDay],
    ecmwf : [Hub.ModelDay],
    icon : [Hub.ModelDay],
    gem : [Hub.ModelDay],
  ) : Nat {
    let series = [gfs, ecmwf, icon, gem];
    var nonEmpty : Nat = 0;
    for (s in series.vals()) {
      if (s.size() > 0) { nonEmpty += 1 };
    };
    if (nonEmpty < 2) return 50;
    let n = minLen(series);
    if (n == 0) return 50;
    var totalSpread : Float = 0.0;
    var i : Nat = 0;
    while (i < n) {
      var vals : [Float] = [];
      for (s in series.vals()) {
        if (i < s.size()) { vals := Array.concat(vals, [s[i].precipInches]) };
      };
      totalSpread += arraySpread(vals);
      i += 1;
    };
    let avgSpread = totalSpread / Float.fromInt(Nat.toInt(n));
    // Lower spread = higher agreement. 0" spread → 100, 1"+ → ~20
    let score = 100.0 - avgSpread * 80.0;
    let clamped = if (score < 10.0) 10.0 else if (score > 100.0) 100.0 else score;
    Int.abs(Float.nearest(clamped).toInt());
  };

  func minLen(series : [[Hub.ModelDay]]) : Nat {
    var m : Nat = 7;
    for (s in series.vals()) {
      if (s.size() < m) { m := s.size() };
    };
    m;
  };

  func arraySpread(vals : [Float]) : Float {
    if (vals.size() < 2) return 0.0;
    var minV = vals[0];
    var maxV = vals[0];
    for (v in vals.vals()) {
      if (v < minV) minV := v;
      if (v > maxV) maxV := v;
    };
    maxV - minV;
  };

  /// Canonical ensemble body — preserves per-member daily arrays
  /// (temperature_2m_max_memberNN / precipitation_sum_memberNN) in
  /// deterministic member order for consensus.
  public func canonicalEnsembleBody(body : Blob) : Blob {
    let PARSE_FAILED : Blob = Text.encodeUtf8("{\"error\":true}");
    switch (JsonMini.parse(body)) {
      case (#err(_)) PARSE_FAILED;
      case (#ok(#Map(root))) {
        switch (mapField(root, "daily")) {
          case (?#Map(daily)) {
            let time = switch (textArrayField(daily, "time")) {
              case (?t) t;
              case null return PARSE_FAILED;
            };
            var fields = "\"time\":" # jsonQuotedStringArray(time);
            var m : Nat = 1;
            while (m <= 30) {
              let suffix = padMember(m);
              for (key in [
                "temperature_2m_max_member" # suffix,
                "precipitation_sum_member" # suffix,
              ].vals()) {
                switch (textArrayFieldFromNumbers(daily, key)) {
                  case (?vals) {
                    fields #= ",\"" # key # "\":" # jsonNumberLexemeArray(vals);
                  };
                  case null {};
                };
              };
              m += 1;
            };
            ("{\"daily\":{" # fields # "}}").encodeUtf8();
          };
          case _ PARSE_FAILED;
        };
      };
      case _ PARSE_FAILED;
    };
  };

  /// Canonical body for model-only outcalls (precip + high).
  public func canonicalModelBody(body : Blob) : Blob {
    let PARSE_FAILED : Blob = Text.encodeUtf8("{\"error\":true}");
    switch (JsonMini.parse(body)) {
      case (#err(_)) PARSE_FAILED;
      case (#ok(#Map(root))) {
        switch (mapField(root, "daily")) {
          case (?#Map(daily)) {
            let time = switch (textArrayField(daily, "time")) {
              case (?t) t;
              case null return PARSE_FAILED;
            };
            let rain = switch (textArrayFieldFromNumbers(daily, "precipitation_sum")) {
              case (?t) t;
              case null Array.repeat("0", time.size());
            };
            let high = switch (textArrayFieldFromNumbers(daily, "temperature_2m_max")) {
              case (?t) t;
              case null Array.repeat("0", time.size());
            };
            let gust = switch (textArrayFieldFromNumbers(daily, "wind_gusts_10m_max")) {
              case (?t) t;
              case null Array.repeat("0", time.size());
            };
            let jsonText = "{"
              # "\"daily\":{"
              # "\"time\":" # jsonQuotedStringArray(time) # ","
              # "\"precipitation_sum\":" # jsonNumberLexemeArray(rain) # ","
              # "\"temperature_2m_max\":" # jsonNumberLexemeArray(high) # ","
              # "\"wind_gusts_10m_max\":" # jsonNumberLexemeArray(gust)
              # "}}";
            jsonText.encodeUtf8();
          };
          case _ PARSE_FAILED;
        };
      };
      case _ PARSE_FAILED;
    };
  };

  /// Strip non-deterministic Open-Meteo fields (generationtime_ms, current.time, etc.)
  /// so HTTPS outcall replicas reach consensus. Keeps daily arrays only.
  public func canonicalWeatherBody(body : Blob) : Blob {
    let PARSE_FAILED : Blob = Blob.fromArray([
      (0x7b : Nat8), (0x22 : Nat8), (0x65 : Nat8), (0x72 : Nat8), (0x72 : Nat8),
      (0x6f : Nat8), (0x72 : Nat8), (0x22 : Nat8), (0x3a : Nat8), (0x74 : Nat8),
      (0x72 : Nat8), (0x75 : Nat8), (0x65 : Nat8), (0x7d : Nat8),
    ]);
    switch (JsonMini.parse(body)) {
      case (#err(_)) PARSE_FAILED;
      case (#ok(#Map(root))) {
        switch (mapField(root, "daily")) {
          case (?#Map(daily)) {
            let time = switch (textArrayField(daily, "time")) {
              case (?t) t;
              case null return PARSE_FAILED;
            };
            let high = switch (textArrayFieldFromNumbers(daily, "temperature_2m_max")) {
              case (?t) t;
              case null return PARSE_FAILED;
            };
            let low = switch (textArrayFieldFromNumbers(daily, "temperature_2m_min")) {
              case (?t) t;
              case null return PARSE_FAILED;
            };
            let rain = switch (textArrayFieldFromNumbers(daily, "precipitation_sum")) {
              case (?t) t;
              case null Array.repeat("0", time.size());
            };
            let uv = switch (textArrayFieldFromNumbers(daily, "uv_index_max")) {
              case (?t) t;
              case null Array.repeat("0", time.size());
            };
            let jsonText = "{"
              # "\"daily\":{"
              # "\"time\":" # jsonQuotedStringArray(time) # ","
              # "\"temperature_2m_max\":" # jsonNumberLexemeArray(high) # ","
              # "\"temperature_2m_min\":" # jsonNumberLexemeArray(low) # ","
              # "\"precipitation_sum\":" # jsonNumberLexemeArray(rain) # ","
              # "\"uv_index_max\":" # jsonNumberLexemeArray(uv)
              # "}}";
            jsonText.encodeUtf8();
          };
          case _ PARSE_FAILED;
        };
      };
      case _ PARSE_FAILED;
    };
  };

  /// Canonical 7-day + current body for Weather Desk outcalls.
  public func canonicalOutlookBody(body : Blob) : Blob {
    let PARSE_FAILED : Blob = Blob.fromArray([
      (0x7b : Nat8), (0x22 : Nat8), (0x65 : Nat8), (0x72 : Nat8), (0x72 : Nat8),
      (0x6f : Nat8), (0x72 : Nat8), (0x22 : Nat8), (0x3a : Nat8), (0x74 : Nat8),
      (0x72 : Nat8), (0x75 : Nat8), (0x65 : Nat8), (0x7d : Nat8),
    ]);
    switch (JsonMini.parse(body)) {
      case (#err(_)) PARSE_FAILED;
      case (#ok(#Map(root))) {
        let dailyBlock = switch (mapField(root, "daily")) {
          case (?#Map(daily)) daily;
          case _ return PARSE_FAILED;
        };
        let time = switch (textArrayField(dailyBlock, "time")) {
          case (?t) t;
          case null return PARSE_FAILED;
        };
        let high = switch (textArrayFieldFromNumbers(dailyBlock, "temperature_2m_max")) {
          case (?t) t;
          case null return PARSE_FAILED;
        };
        let low = switch (textArrayFieldFromNumbers(dailyBlock, "temperature_2m_min")) {
          case (?t) t;
          case null return PARSE_FAILED;
        };
        let rain = switch (textArrayFieldFromNumbers(dailyBlock, "precipitation_sum")) {
          case (?t) t;
          case null Array.repeat("0", time.size());
        };
        let uv = switch (textArrayFieldFromNumbers(dailyBlock, "uv_index_max")) {
          case (?t) t;
          case null Array.repeat("0", time.size());
        };
        let wind = switch (textArrayFieldFromNumbers(dailyBlock, "wind_speed_10m_max")) {
          case (?t) t;
          case null Array.repeat("0", time.size());
        };
        let wmo = switch (textArrayFieldFromNumbers(dailyBlock, "weather_code")) {
          case (?t) t;
          case null Array.repeat("0", time.size());
        };
        var currentJson = "";
        switch (mapField(root, "current")) {
          case (?#Map(cur)) {
            let temp = lexemeOrZero(cur, "temperature_2m");
            let feel = lexemeOrZero(cur, "apparent_temperature");
            let hum = lexemeOrZero(cur, "relative_humidity_2m");
            let precip = lexemeOrZero(cur, "precipitation");
            let code = lexemeOrZero(cur, "weather_code");
            let press = lexemeOrZero(cur, "surface_pressure");
            let wspd = lexemeOrZero(cur, "wind_speed_10m");
            let wdir = lexemeOrZero(cur, "wind_direction_10m");
            let cuv = lexemeOrZero(cur, "uv_index");
            currentJson := ",\"current\":{"
              # "\"temperature_2m\":" # temp # ","
              # "\"apparent_temperature\":" # feel # ","
              # "\"relative_humidity_2m\":" # hum # ","
              # "\"precipitation\":" # precip # ","
              # "\"weather_code\":" # code # ","
              # "\"surface_pressure\":" # press # ","
              # "\"wind_speed_10m\":" # wspd # ","
              # "\"wind_direction_10m\":" # wdir # ","
              # "\"uv_index\":" # cuv
              # "}";
          };
          case _ {};
        };
        let jsonText = "{"
          # "\"daily\":{"
          # "\"time\":" # jsonQuotedStringArray(time) # ","
          # "\"temperature_2m_max\":" # jsonNumberLexemeArray(high) # ","
          # "\"temperature_2m_min\":" # jsonNumberLexemeArray(low) # ","
          # "\"precipitation_sum\":" # jsonNumberLexemeArray(rain) # ","
          # "\"uv_index_max\":" # jsonNumberLexemeArray(uv) # ","
          # "\"wind_speed_10m_max\":" # jsonNumberLexemeArray(wind) # ","
          # "\"weather_code\":" # jsonNumberLexemeArray(wmo)
          # "}"
          # currentJson
          # "}";
        jsonText.encodeUtf8();
      };
      case _ PARSE_FAILED;
    };
  };

  public func canonicalAirQualityBody(body : Blob) : Blob {
    let PARSE_FAILED : Blob = Text.encodeUtf8("{\"error\":true}");
    switch (JsonMini.parse(body)) {
      case (#err(_)) PARSE_FAILED;
      case (#ok(#Map(root))) {
        switch (mapField(root, "current")) {
          case (?#Map(cur)) {
            let aqi = lexemeOrZero(cur, "us_aqi");
            let pm25 = lexemeOrZero(cur, "pm2_5");
            let pm10 = lexemeOrZero(cur, "pm10");
            let jsonText = "{\"current\":{"
              # "\"us_aqi\":" # aqi # ","
              # "\"pm2_5\":" # pm25 # ","
              # "\"pm10\":" # pm10
              # "}}";
            jsonText.encodeUtf8();
          };
          case _ PARSE_FAILED;
        };
      };
      case _ PARSE_FAILED;
    };
  };

  public func canonicalGeocodeBody(body : Blob) : Blob {
    let PARSE_FAILED : Blob = Text.encodeUtf8("{\"error\":true}");
    switch (JsonMini.parse(body)) {
      case (#err(_)) PARSE_FAILED;
      case (#ok(#Map(root))) {
        switch (mapField(root, "results")) {
          case (?#Array(arr)) {
            if (arr.size() == 0) {
              return Text.encodeUtf8("{\"results\":[]}");
            };
            switch (arr[0]) {
              case (#Map(r)) {
                let lat = lexemeOrZero(r, "latitude");
                let lng = lexemeOrZero(r, "longitude");
                let name = switch (textField(r, "name")) {
                  case (?t) t;
                  case null "";
                };
                let admin1 = switch (textField(r, "admin1")) {
                  case (?t) t;
                  case null "";
                };
                let jsonText = "{\"results\":[{"
                  # "\"latitude\":" # lat # ","
                  # "\"longitude\":" # lng # ","
                  # "\"name\":\"" # jsonEscape(name) # "\","
                  # "\"admin1\":\"" # jsonEscape(admin1) # "\""
                  # "}]}";
                jsonText.encodeUtf8();
              };
              case _ PARSE_FAILED;
            };
          };
          case _ PARSE_FAILED;
        };
      };
      case _ PARSE_FAILED;
    };
  };

  func jsonEscape(t : Text) : Text {
    var out = "";
    for (c in t.toIter()) {
      if (c == '\"') {
        out := out # "\\\"";
      } else if (c == '\\') {
        out := out # "\\\\";
      } else {
        out := out # Text.fromChar(c);
      };
    };
    out;
  };

  func lexemeOrZero(entries : [(Text, ICRC7.Value)], key : Text) : Text {
    switch (mapField(entries, key)) {
      case (?v) {
        switch (textLexemeFromValue(v)) {
          case (?t) t;
          case null "0";
        };
      };
      case null "0";
    };
  };

  func textField(entries : [(Text, ICRC7.Value)], key : Text) : ?Text {
    switch (mapField(entries, key)) {
      case (?#Text t) ?t;
      case _ null;
    };
  };

  func natField(entries : [(Text, ICRC7.Value)], key : Text) : ?Nat {
    switch (mapField(entries, key)) {
      case (?#Nat n) ?n;
      case (?#Int i) if (i >= 0) ?Int.abs(i) else null;
      case (?#Text t) {
        switch (parseDecimalText(t)) {
          case (?f) {
            if (f < 0.0) null else ?Int.abs(Float.nearest(f).toInt());
          };
          case null null;
        };
      };
      case _ null;
    };
  };

  func parseOutlookDaily(root : [(Text, ICRC7.Value)]) : Result.Result<[Hub.DailyOutlook], Text> {
    switch (mapField(root, "daily")) {
      case (?#Map(daily)) {
        let dates = switch (textArrayField(daily, "time")) {
          case (?d) d;
          case null return #err("Missing daily.time");
        };
        let highs = switch (floatArrayField(daily, "temperature_2m_max")) {
          case (?d) d;
          case null return #err("Missing highs");
        };
        let lows = switch (floatArrayField(daily, "temperature_2m_min")) {
          case (?d) d;
          case null return #err("Missing lows");
        };
        let rains = switch (floatArrayField(daily, "precipitation_sum")) {
          case (?d) d;
          case null Array.repeat(0.0, dates.size());
        };
        let uvs = switch (floatArrayField(daily, "uv_index_max")) {
          case (?d) d;
          case null Array.repeat(0.0, dates.size());
        };
        let winds = switch (floatArrayField(daily, "wind_speed_10m_max")) {
          case (?d) d;
          case null Array.repeat(0.0, dates.size());
        };
        let codes = switch (floatArrayField(daily, "weather_code")) {
          case (?d) d;
          case null Array.repeat(0.0, dates.size());
        };
        if (dates.size() != highs.size() or dates.size() != lows.size()) {
          return #err("Daily length mismatch");
        };
        var out : [Hub.DailyOutlook] = [];
        var i : Nat = 0;
        let n = dates.size();
        let limit = if (n > 7) 7 else n;
        while (i < limit) {
          let codeF = if (i < codes.size()) codes[i] else 0.0;
          let codeNat = Int.abs(Float.nearest(codeF).toInt());
          out := Array.concat(out, [{
            date = dates[i];
            tempHighF = highs[i];
            tempLowF = lows[i];
            precipInches = if (i < rains.size()) rains[i] else 0.0;
            uvIndexMax = if (i < uvs.size()) uvs[i] else 0.0;
            windMphMax = if (i < winds.size()) winds[i] else 0.0;
            weatherCode = codeNat;
          }]);
          i += 1;
        };
        #ok(out);
      };
      case _ #err("Missing daily");
    };
  };

  func parseOutlookCurrent(
    root : [(Text, ICRC7.Value)],
    daily : [Hub.DailyOutlook],
  ) : Result.Result<Hub.CurrentConditions, Text> {
    let fallbackHigh = if (daily.size() > 0) daily[0].tempHighF else 0.0;
    let fallbackLow = if (daily.size() > 0) daily[0].tempLowF else 0.0;
    let mid = (fallbackHigh + fallbackLow) / 2.0;
    switch (mapField(root, "current")) {
      case (?#Map(cur)) {
        #ok({
          tempF = switch (floatField(cur, "temperature_2m")) { case (?v) v; case null mid };
          feelsLikeF = switch (floatField(cur, "apparent_temperature")) { case (?v) v; case null mid };
          humidity = switch (floatField(cur, "relative_humidity_2m")) { case (?v) v; case null 0.0 };
          precipInches = switch (floatField(cur, "precipitation")) { case (?v) v; case null 0.0 };
          uvIndex = switch (floatField(cur, "uv_index")) { case (?v) v; case null 0.0 };
          windMph = switch (floatField(cur, "wind_speed_10m")) { case (?v) v; case null 0.0 };
          windDirDeg = switch (floatField(cur, "wind_direction_10m")) { case (?v) v; case null 0.0 };
          weatherCode = switch (floatField(cur, "weather_code")) {
            case (?v) Int.abs(Float.nearest(v).toInt());
            case null 0;
          };
          pressureHpa = switch (floatField(cur, "surface_pressure")) { case (?v) v; case null 0.0 };
        });
      };
      case _ {
        #ok({
          tempF = mid;
          feelsLikeF = mid;
          humidity = 0.0;
          precipInches = 0.0;
          uvIndex = 0.0;
          windMph = 0.0;
          windDirDeg = 0.0;
          weatherCode = 0;
          pressureHpa = 0.0;
        });
      };
    };
  };

  func jsonQuotedStringArray(values : [Text]) : Text {
    var out = "[";
    var i : Nat = 0;
    while (i < values.size()) {
      if (i > 0) out := out # ",";
      out := out # "\"" # values[i] # "\"";
      i += 1;
    };
    out # "]";
  };

  func jsonNumberLexemeArray(values : [Text]) : Text {
    var out = "[";
    var i : Nat = 0;
    while (i < values.size()) {
      if (i > 0) out := out # ",";
      out := out # values[i];
      i += 1;
    };
    out # "]";
  };

  func textLexemeFromValue(v : ICRC7.Value) : ?Text {
    switch (v) {
      case (#Text t) if (t == "null") ?"0" else ?t;
      case (#Nat n) ?Nat.toText(n);
      case (#Int i) ?Int.toText(i);
      case _ null;
    };
  };

  func textArrayFieldFromNumbers(
    entries : [(Text, ICRC7.Value)],
    key : Text,
  ) : ?[Text] {
    switch (mapField(entries, key)) {
      case (?#Array(arr)) {
        var out : [Text] = [];
        for (v in arr.vals()) {
          switch (textLexemeFromValue(v)) {
            case (?t) out := Array.concat(out, [t]);
            case null return null;
          };
        };
        ?out;
      };
      case _ null;
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
      case (#Text t) {
        if (t == "null") ?0.0 else parseDecimalText(t);
      };
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
